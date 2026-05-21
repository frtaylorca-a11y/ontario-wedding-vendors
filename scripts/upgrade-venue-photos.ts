/**
 * STAGE 2 of the venue photo pipeline.
 *
 * For venues where hero_image_source = 'google' AND website IS NOT NULL,
 * scrape the venue's own website for its best candidate image and ask
 * Claude Vision to compare it to the Google photo we already have.
 * Claude picks the winner with a soft preference for the website image
 * (see the prompt below). Website winners get persisted to R2.
 *
 * Pipeline per venue:
 *   1. Fetch the website HTML (10s timeout, follows redirects).
 *   2. Pick the best candidate image URL on the site (og:image →
 *      twitter:image → first hero/header img > 400px → class-hint img).
 *      If no candidate found, skip — Google photo stays.
 *   3. Download both candidates:
 *      a. Website image bytes
 *      b. Google photo bytes (resolve photo_reference via Places Photos)
 *   4. Claude Vision (haiku-4-5) sees BOTH images in one call and
 *      returns:
 *        { winner: 'google' | 'website',
 *          confidence: 'high'|'medium'|'low',
 *          reason: '<one sentence>' }
 *      The prompt explicitly biases toward 'website' when quality is
 *      comparable — the venue's own marketing site curates wedding
 *      angles; Google photos are crowdsourced and often show non-event
 *      angles (parking lots, the building from across the street, etc.)
 *   5. If winner = 'website', PUT the image into R2 at
 *        venues/[slug]/hero.<ext>
 *      and UPDATE:
 *        hero_image_custom    = <R2 public URL>
 *        hero_image_source    = 'website'
 *        hero_image_validated = true
 *      If winner = 'google', no DB write. Existing Google photo wins.
 *
 * Required env (in .env / .env.local):
 *   GOOGLE_PLACES_API_KEY            (Places Photos call for Google img)
 *   ANTHROPIC_API_KEY                (Claude Vision compare)
 *   CLOUDFLARE_R2_BUCKET             (R2 destination)
 *   CLOUDFLARE_R2_ACCESS_KEY_ID
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *   CLOUDFLARE_R2_ENDPOINT
 *   CLOUDFLARE_R2_PUBLIC_URL         (e.g. https://images.example.com)
 *
 * Cost per venue (when website wins):
 *   - 1 website fetch:                free
 *   - 1 website image download:       free
 *   - 1 Places Photos call:           ~$0.007
 *   - 1 Claude Vision call (2 imgs):  ~$0.002
 *   - 1 R2 PUT (only on website win): ~$0.0000045
 *   Total: ~$0.009 per venue. Full run across ~639 google-sourced
 *   venues: ~$5.75.
 *
 * Usage:
 *   npx tsx scripts/upgrade-venue-photos.ts --limit 10        # smoke test
 *   npx tsx scripts/upgrade-venue-photos.ts --dry-run         # no R2/DB writes
 *   npx tsx scripts/upgrade-venue-photos.ts                   # all matched
 */
import "dotenv/config";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import Anthropic from "@anthropic-ai/sdk";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "../src/lib/db";
import { venues } from "../src/lib/schema";

const BATCH_SIZE                = 50;
const DELAY_BETWEEN_REQUESTS_MS = 250;
const FETCH_TIMEOUT_MS          = 10_000;
const MIN_IMAGE_WIDTH_PX        = 400;
const COST_PER_VENUE_USD        = 0.009;
const GOOGLE_PHOTO_MAX_WIDTH    = 1200;

type Args = { limit: number | null; dryRun: boolean };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit:  number | null = null;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--limit") {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer"); process.exit(1);
      }
      limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = Number.parseInt(a.slice("--limit=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer"); process.exit(1);
      }
      limit = n;
    } else {
      console.error(`Unknown arg: ${a}`); process.exit(1);
    }
  }
  return { limit, dryRun };
}

type Candidate = {
  id:        number;
  slug:      string;
  name:      string;
  venueType: string | null;
  website:   string;
  heroImage: string; /* Google photo_reference, always set by the load filter */
};

async function loadCandidates(limit: number | null): Promise<Candidate[]> {
  const baseQuery = db
    .select({
      id:              venues.id,
      slug:            venues.slug,
      name:            venues.name,
      venueType:       venues.venueType,
      website:         venues.website,
      heroImage:       venues.heroImage,
      heroImageSource: venues.heroImageSource,
    })
    .from(venues)
    .where(
      and(
        eq(venues.heroImageSource, "google"),
        isNotNull(venues.website),
        ne(venues.website, ""),
        isNotNull(venues.heroImage),
      ),
    )
    .orderBy(venues.id);

  const rows = limit != null ? await baseQuery.limit(limit) : await baseQuery;
  return rows
    .filter((r) => r.website != null && r.website.length > 0 && r.heroImage != null)
    .map((r) => ({
      id:        r.id,
      slug:      r.slug,
      name:      r.name,
      venueType: r.venueType,
      website:   r.website!,
      heroImage: r.heroImage!,
    }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal:   ctrl.signal,
      redirect: "follow",
      headers:  { "user-agent": "OntarioWeddingVendors-Bot/1.0 (+image-pipeline)" },
    });
  } finally {
    clearTimeout(timer);
  }
}

function absolutize(src: string | undefined, pageUrl: string): string | null {
  if (!src) return null;
  try {
    const u = new URL(src, pageUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

const CLASS_HINTS_RE      = /(hero|banner|portfolio|gallery|featured|cover)/i;
const HEADER_CONTAINER_RE = /(^|\s)(hero|header|banner|masthead)($|\s)/i;

function parseDeclaredWidth($img: cheerio.Cheerio<AnyNode>): number | null {
  const widthAttr = $img.attr("width");
  if (widthAttr) {
    const n = Number.parseInt(widthAttr, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const style = $img.attr("style");
  if (style) {
    const m = style.match(/width\s*:\s*(\d+)\s*px/i);
    if (m) return Number.parseInt(m[1], 10);
  }
  return null;
}

type ImageCandidate = { url: string; reason: string };

function pickBestImage(html: string, pageUrl: string): ImageCandidate | null {
  const $ = cheerio.load(html);

  /* a. og:image — almost always present on modern sites */
  const og = $('meta[property="og:image"]').attr("content")
          ?? $('meta[name="og:image"]').attr("content");
  if (og) {
    const abs = absolutize(og, pageUrl);
    if (abs) return { url: abs, reason: "og:image" };
  }

  /* b. twitter:image */
  const tw = $('meta[name="twitter:image"]').attr("content")
          ?? $('meta[property="twitter:image"]').attr("content");
  if (tw) {
    const abs = absolutize(tw, pageUrl);
    if (abs) return { url: abs, reason: "twitter:image" };
  }

  /* c. First img > 400px wide inside header/hero/banner/masthead */
  let pick: ImageCandidate | null = null;
  $("header img, [class*='hero'] img, [class*='banner'] img, [class*='masthead'] img").each(
    (_, el) => {
      if (pick) return;
      const $img = $(el);
      const w = parseDeclaredWidth($img);
      if (w != null && w < MIN_IMAGE_WIDTH_PX) return;
      const src = $img.attr("src") ?? $img.attr("data-src") ?? $img.attr("data-lazy-src");
      const abs = absolutize(src, pageUrl);
      if (abs) pick = { url: abs, reason: `header-img${w ? `@${w}px` : ""}` };
    },
  );
  if (pick) return pick;

  /* d. First img with class hint */
  $("img").each((_, el) => {
    if (pick) return;
    const $img = $(el);
    const cls = $img.attr("class") ?? "";
    if (!CLASS_HINTS_RE.test(cls)) {
      const parent    = $img.parent();
      const parentCls = parent.attr("class") ?? "";
      if (!HEADER_CONTAINER_RE.test(parentCls) && !CLASS_HINTS_RE.test(parentCls)) return;
    }
    const src = $img.attr("src") ?? $img.attr("data-src") ?? $img.attr("data-lazy-src");
    const abs = absolutize(src, pageUrl);
    if (abs) pick = { url: abs, reason: `class-hint:${cls.match(CLASS_HINTS_RE)?.[1] ?? "parent"}` };
  });

  return pick;
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  if (!res.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
  if (!contentType.startsWith("image/")) return null;
  const ab = await res.arrayBuffer();
  if (ab.byteLength > 5 * 1024 * 1024) return null; /* 5 MB cap */
  return { buffer: Buffer.from(ab), contentType };
}

/* Resolve a Google Places photo_reference to its actual JPEG bytes.
 * The Places Photos endpoint 302-redirects to the storage location;
 * Node's fetch follows the redirect by default. */
async function downloadGooglePhoto(
  photoReference: string,
  apiKey: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const url =
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=${GOOGLE_PHOTO_MAX_WIDTH}` +
    `&photo_reference=${encodeURIComponent(photoReference)}` +
    `&key=${apiKey}`;
  try {
    return await downloadImage(url);
  } catch {
    return null;
  }
}

/* Anthropic accepts image/jpeg | image/png | image/webp | image/gif.
 * Anything else gets re-tagged as image/jpeg — the bytes still decode
 * because the original content-type was usually a misreport from a CDN. */
function mediaTypeOf(contentType: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  if (
    contentType === "image/jpeg" ||
    contentType === "image/png"  ||
    contentType === "image/webp" ||
    contentType === "image/gif"
  ) return contentType;
  return "image/jpeg";
}

type Verdict = {
  winner:     "google" | "website";
  confidence: "high" | "medium" | "low";
  reason:     string;
};

async function compareWithClaude(
  anthropic: Anthropic,
  googleImg:  { buffer: Buffer; contentType: string },
  websiteImg: { buffer: Buffer; contentType: string },
  venueName:  string,
  venueType:  string | null,
): Promise<Verdict> {
  const venueTypeLabel = venueType ? venueType.replace(/-/g, " ") : "wedding";

  const res = await anthropic.messages.create({
    model:     "claude-haiku-4-5",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text:
            `You are picking the better hero photo for the wedding directory listing of "${venueName}", a ${venueTypeLabel} venue in Ontario. The card displays the chosen image as a 16:9 thumbnail above the venue name.\n\n` +
            `IMAGE 1 (label: "google") comes from Google Places. It is often crowdsourced — could show parking lots, the building from a distance, exterior signage, or non-event angles. Sometimes it's high quality, but quality is inconsistent.\n\n` +
            `IMAGE 2 (label: "website") comes from the venue's own website. It is curated by the venue for marketing — typically shows a beautifully styled ceremony or reception room. Usually higher event-relevance.\n\n` +
            `Pick the one that better represents the venue as a WEDDING destination. Criteria, in order of importance:\n` +
            `  1. Wedding suitability (does it show a wedding-ready space or actual wedding scene?)\n` +
            `  2. Image quality (resolution, lighting, composition)\n` +
            `  3. Professionalism (does it look like a marketing photo or a snapshot?)\n\n` +
            `IMPORTANT TIEBREAKER: when the two images are roughly comparable in quality and wedding-relevance, prefer the WEBSITE image. The venue's marketing team curated it for exactly this purpose; the Google photo is incidental. Only pick "google" when it is substantially better than the website image — e.g. the website image is a stock photo, a logo, blurry, or shows something unrelated to weddings (like a menu page or staff photo).\n\n` +
            `Reply with ONLY a JSON object on a single line, no markdown:\n` +
            `{"winner": "google" | "website", "confidence": "high" | "medium" | "low", "reason": "<one short sentence>"}`,
        },
        {
          type: "image",
          source: {
            type:       "base64",
            media_type: mediaTypeOf(googleImg.contentType),
            data:       googleImg.buffer.toString("base64"),
          },
        },
        {
          type: "image",
          source: {
            type:       "base64",
            media_type: mediaTypeOf(websiteImg.contentType),
            data:       websiteImg.buffer.toString("base64"),
          },
        },
      ],
    }],
  });

  const text = res.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");

  /* Default to website on parse failure — the soft preference principle. */
  const match = text.match(/\{[\s\S]*?"winner"[\s\S]*?\}/);
  if (!match) {
    return { winner: "website", confidence: "low", reason: `unparseable response: ${text.slice(0, 80)}` };
  }
  try {
    const parsed = JSON.parse(match[0]) as {
      winner?:     unknown;
      confidence?: unknown;
      reason?:     unknown;
    };
    const winner =
      parsed.winner === "google" || parsed.winner === "website"
        ? parsed.winner
        : "website";
    const confidence =
      parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
        ? parsed.confidence
        : "low";
    const reason = typeof parsed.reason === "string" ? parsed.reason : "no reason provided";
    return { winner, confidence, reason };
  } catch {
    return { winner: "website", confidence: "low", reason: `JSON parse failed: ${match[0].slice(0, 80)}` };
  }
}

function buildR2Client(): { s3: S3Client; bucket: string; publicUrl: string } {
  const bucket    = process.env.CLOUDFLARE_R2_BUCKET;
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secret    = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint  = process.env.CLOUDFLARE_R2_ENDPOINT;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!bucket || !accessKey || !secret || !endpoint || !publicUrl) {
    throw new Error(
      "Missing R2 env. Required: CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ACCESS_KEY_ID, " +
        "CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_PUBLIC_URL",
    );
  }
  const s3 = new S3Client({
    region:      "auto",
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secret },
  });
  return { s3, bucket, publicUrl };
}

function r2ExtensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":  return "png";
    case "image/webp": return "webp";
    case "image/gif":  return "gif";
    default:           return "jpg";
  }
}

async function uploadToR2(
  s3:          S3Client,
  bucket:      string,
  publicUrl:   string,
  slug:        string,
  buffer:      Buffer,
  contentType: string,
): Promise<string> {
  const ext = r2ExtensionFor(contentType);
  const key = `venues/${slug}/hero.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket:       bucket,
      Key:          key,
      Body:         buffer,
      ContentType:  contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

type Outcome =
  | { kind: "website-wins";  url: string; pick: string; confidence: string; reason: string }
  | { kind: "google-wins";   confidence: string; reason: string }
  | { kind: "no-website-image" }
  | { kind: "download-failed"; which: "website" | "google" }
  | { kind: "error"; reason: string };

async function processVenue(
  v:         Candidate,
  apiKey:    string,
  anthropic: Anthropic,
  r2:        { s3: S3Client; bucket: string; publicUrl: string },
  dryRun:    boolean,
): Promise<Outcome> {
  try {
    /* 1. Fetch website + pick candidate */
    const res = await fetchWithTimeout(v.website, FETCH_TIMEOUT_MS);
    if (!res.ok) return { kind: "error", reason: `website HTTP ${res.status}` };
    const html = await res.text();
    const pick = pickBestImage(html, res.url);
    if (!pick) return { kind: "no-website-image" };

    /* 2. Download both images */
    const websiteImg = await downloadImage(pick.url);
    if (!websiteImg) return { kind: "download-failed", which: "website" };

    const googleImg = await downloadGooglePhoto(v.heroImage, apiKey);
    if (!googleImg) return { kind: "download-failed", which: "google" };

    /* 3. Claude Vision compares */
    const verdict = await compareWithClaude(anthropic, googleImg, websiteImg, v.name, v.venueType);

    if (verdict.winner === "google") {
      return { kind: "google-wins", confidence: verdict.confidence, reason: verdict.reason };
    }

    /* 4. Website won — upload + persist */
    if (dryRun) {
      return {
        kind:       "website-wins",
        url:        `(dry-run) ${pick.url}`,
        pick:       pick.reason,
        confidence: verdict.confidence,
        reason:     verdict.reason,
      };
    }

    const r2Url = await uploadToR2(
      r2.s3, r2.bucket, r2.publicUrl, v.slug,
      websiteImg.buffer, websiteImg.contentType,
    );
    await db
      .update(venues)
      .set({
        heroImageCustom:    r2Url,
        heroImageSource:    "website",
        heroImageValidated: true,
        updatedAt:          new Date(),
      })
      .where(eq(venues.id, v.id));

    return {
      kind:       "website-wins",
      url:        r2Url,
      pick:       pick.reason,
      confidence: verdict.confidence,
      reason:     verdict.reason,
    };
  } catch (err) {
    return { kind: "error", reason: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const { limit, dryRun } = parseArgs();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_PLACES_API_KEY is not set."); process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set."); process.exit(1);
  }
  const r2        = buildR2Client();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const candidates = await loadCandidates(limit);
  console.log(
    `Loaded ${candidates.length} candidate venue(s)` +
      `${limit != null ? ` (limit=${limit})` : ""}${dryRun ? " · DRY RUN" : ""}`,
  );
  if (candidates.length === 0) {
    console.log("Nothing to do."); return;
  }
  console.log(`Estimated cost: ~$${(candidates.length * COST_PER_VENUE_USD).toFixed(2)}`);

  let websiteWins      = 0;
  let googleWins       = 0;
  let noWebsiteImage   = 0;
  let downloadFailed   = 0;
  let errored          = 0;
  const issues: Array<{ slug: string; outcome: string }> = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch        = candidates.slice(i, i + BATCH_SIZE);
    const batchNum     = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);

    for (const v of batch) {
      const r = await processVenue(v, apiKey, anthropic, r2, dryRun);
      switch (r.kind) {
        case "website-wins":
          websiteWins++;
          console.log(`  ✓ website wins ${v.slug} — pick=${r.pick} · conf=${r.confidence} · ${r.reason.slice(0, 60)}`);
          break;
        case "google-wins":
          googleWins++;
          console.log(`  · google wins  ${v.slug} — conf=${r.confidence} · ${r.reason.slice(0, 60)}`);
          break;
        case "no-website-image":
          noWebsiteImage++;
          issues.push({ slug: v.slug, outcome: "no-website-image" });
          break;
        case "download-failed":
          downloadFailed++;
          issues.push({ slug: v.slug, outcome: `download-failed (${r.which})` });
          break;
        case "error":
          errored++;
          issues.push({ slug: v.slug, outcome: `error: ${r.reason.slice(0, 80)}` });
          break;
      }
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

    console.log(
      `  Batch ${batchNum}/${totalBatches} (${batch.length}) — ` +
        `website-wins=${websiteWins} google-wins=${googleWins} ` +
        `no-website-image=${noWebsiteImage} download-failed=${downloadFailed} errored=${errored}`,
    );
  }

  console.log("\n=== Summary ===");
  console.log(`Total candidates:    ${candidates.length}`);
  console.log(`Website wins:        ${websiteWins}${dryRun ? " (dry run — no writes)" : ""}`);
  console.log(`Google wins (kept):  ${googleWins}`);
  console.log(`No website image:    ${noWebsiteImage}`);
  console.log(`Download failed:     ${downloadFailed}`);
  console.log(`Errored:             ${errored}`);
  console.log(`Actual cost:         ~$${(candidates.length * COST_PER_VENUE_USD).toFixed(2)}`);

  if (issues.length > 0 && issues.length <= 25) {
    console.log("\nIssue samples:");
    for (const f of issues.slice(0, 25)) console.log(`  ${f.slug} — ${f.outcome}`);
  } else if (issues.length > 25) {
    console.log(`\n${issues.length} issues total (showing first 15):`);
    for (const f of issues.slice(0, 15)) console.log(`  ${f.slug} — ${f.outcome}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
