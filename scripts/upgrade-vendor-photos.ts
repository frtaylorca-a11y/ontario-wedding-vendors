/**
 * STAGE 2 of the vendor photo pipeline.
 *
 * For vendors where hero_image_source = 'google' AND website IS NOT NULL,
 * try to replace the Google fallback with a higher-quality image scraped
 * from the vendor's own website, validated by Claude Vision and stored
 * permanently in Cloudflare R2.
 *
 * Pipeline per vendor:
 *   1. Fetch website HTML (10s timeout, follows redirects).
 *   2. Pick the best image URL in priority:
 *      a. <meta property="og:image">              ← almost always present
 *      b. <meta name="twitter:image">             ← fallback for OG-less sites
 *      c. First <img src> > 400px wide inside a
 *         <header>, hero/banner element           ← e.g. masthead
 *      d. First <img class*="hero|banner|portfolio|gallery|featured|cover">
 *   3. Download the chosen image.
 *   4. Claude Vision (haiku-4-5) validates suitability + content fit:
 *      "Is this image suitable for a [category] vendor listing on a
 *       wedding directory? Is it professional, high quality, and shows
 *       wedding-related work? Return JSON: {suitable, reason}".
 *      Skips this vendor on suitable=false (Google photo stays).
 *   5. PUT the image into R2 at vendors/[slug]/hero.jpg and UPDATE:
 *        hero_image_custom    = <R2 public URL>
 *        hero_image_source    = 'website'
 *        hero_image_validated = true
 *
 * Required env (in .env / .env.local):
 *   CLOUDFLARE_R2_BUCKET
 *   CLOUDFLARE_R2_ACCESS_KEY_ID
 *   CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *   CLOUDFLARE_R2_ENDPOINT
 *   CLOUDFLARE_R2_PUBLIC_URL          (e.g. https://images.example.com)
 *   ANTHROPIC_API_KEY
 *
 * Cost per vendor:
 *   - 1 website fetch:    free
 *   - 1 image download:   free
 *   - 1 Claude Vision call (haiku-4-5):  ~$0.001
 *   - 1 R2 PUT:           ~$0.0000045
 *   Total: ~$0.001 per vendor. Full run across ~1,500 google-sourced
 *   vendors: ~$1.50.
 *
 * Usage:
 *   npx tsx scripts/upgrade-vendor-photos.ts --limit 10        # smoke test
 *   npx tsx scripts/upgrade-vendor-photos.ts --dry-run         # no R2/DB writes
 *   npx tsx scripts/upgrade-vendor-photos.ts                   # all matched
 */
import "dotenv/config";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import Anthropic from "@anthropic-ai/sdk";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";

const BATCH_SIZE = 50;
const DELAY_BETWEEN_REQUESTS_MS = 250;
const FETCH_TIMEOUT_MS = 10_000;
const MIN_IMAGE_WIDTH_PX = 400;
const COST_PER_VENDOR_USD = 0.001;

type Args = { limit: number | null; dryRun: boolean };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--limit") {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer");
        process.exit(1);
      }
      limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = Number.parseInt(a.slice("--limit=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer");
        process.exit(1);
      }
      limit = n;
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return { limit, dryRun };
}

type Candidate = {
  id: number;
  slug: string;
  name: string;
  category: string;
  website: string;
};

async function loadCandidates(limit: number | null): Promise<Candidate[]> {
  const baseQuery = db
    .select({
      id:       vendors.id,
      slug:     vendors.slug,
      name:     vendors.name,
      category: vendors.category,
      website:  vendors.website,
      heroImageSource: vendors.heroImageSource,
    })
    .from(vendors)
    .where(
      and(
        eq(vendors.heroImageSource, "google"),
        isNotNull(vendors.website),
        ne(vendors.website, ""),
      ),
    )
    .orderBy(vendors.id);

  const rows = limit != null ? await baseQuery.limit(limit) : await baseQuery;
  return rows
    .filter((r): r is Candidate & { heroImageSource: string } =>
      r.website != null && r.website.length > 0,
    )
    .map((r) => ({ id: r.id, slug: r.slug, name: r.name, category: r.category, website: r.website }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "OntarioWeddingVendors-Bot/1.0 (+image-pipeline)" },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a relative or protocol-relative URL against the page URL.
 * Returns null if the resolved URL isn't an absolute http(s) URL.
 */
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

const CLASS_HINTS_RE = /(hero|banner|portfolio|gallery|featured|cover)/i;
const HEADER_CONTAINER_RE = /(^|\s)(hero|header|banner|masthead)($|\s)/i;

/** Heuristic width parser: img width attr, then style="width:Npx". */
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

  /* a. og:image */
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
      const parent = $img.parent();
      const parentCls = parent.attr("class") ?? "";
      if (!HEADER_CONTAINER_RE.test(parentCls) && !CLASS_HINTS_RE.test(parentCls)) return;
    }
    const src = $img.attr("src") ?? $img.attr("data-src") ?? $img.attr("data-lazy-src");
    const abs = absolutize(src, pageUrl);
    if (abs) pick = { url: abs, reason: `class-hint:${cls.match(CLASS_HINTS_RE)?.[1] ?? "parent"}` };
  });

  return pick;
}

/** Pulls the image bytes + content-type. Caps at 5 MB to avoid runaways. */
async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  if (!res.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
  if (!contentType.startsWith("image/")) return null;
  const ab = await res.arrayBuffer();
  if (ab.byteLength > 5 * 1024 * 1024) return null;
  return { buffer: Buffer.from(ab), contentType };
}

type Verdict = { suitable: boolean; reason: string };

async function validateWithClaude(
  anthropic: Anthropic,
  imageBuffer: Buffer,
  contentType: string,
  category: string,
): Promise<Verdict> {
  /* Anthropic supports image/jpeg, image/png, image/webp, image/gif */
  const mediaType = (
    contentType === "image/jpeg" ||
    contentType === "image/png"  ||
    contentType === "image/webp" ||
    contentType === "image/gif"
  ) ? contentType : "image/jpeg";

  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type:       "base64",
            media_type: mediaType,
            data:       imageBuffer.toString("base64"),
          },
        },
        {
          type: "text",
          text:
            `Is this image suitable for a ${category} vendor listing on a wedding directory? ` +
            `Is it professional, high quality, and shows wedding-related work? ` +
            `Reply with ONLY a JSON object on a single line: ` +
            `{"suitable": true|false, "reason": "<one short sentence>"}`,
        },
      ],
    }],
  });

  /* Pull the first text block from the response */
  const text = res.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");

  /* Extract the JSON object — model sometimes wraps in ```json ... ``` */
  const match = text.match(/\{[\s\S]*?"suitable"[\s\S]*?\}/);
  if (!match) return { suitable: false, reason: `claude returned no parseable JSON: ${text.slice(0, 80)}` };
  try {
    const parsed = JSON.parse(match[0]) as { suitable?: unknown; reason?: unknown };
    return {
      suitable: parsed.suitable === true,
      reason:   typeof parsed.reason === "string" ? parsed.reason : "no reason provided",
    };
  } catch {
    return { suitable: false, reason: `claude JSON parse failed: ${match[0].slice(0, 80)}` };
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
    region: "auto",
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secret },
  });
  return { s3, bucket, publicUrl };
}

async function uploadToR2(
  s3: S3Client,
  bucket: string,
  publicUrl: string,
  slug: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const key = `vendors/${slug}/hero.jpg`;
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

/* ─── Main ──────────────────────────────────────────────────────────── */

type Outcome =
  | { kind: "updated"; url: string; pick: string; reason: string }
  | { kind: "no-image" }
  | { kind: "download-failed" }
  | { kind: "unsuitable"; reason: string }
  | { kind: "error"; reason: string };

async function processVendor(
  vendor: Candidate,
  anthropic: Anthropic,
  r2: { s3: S3Client; bucket: string; publicUrl: string },
  dryRun: boolean,
): Promise<Outcome> {
  try {
    const res = await fetchWithTimeout(vendor.website, FETCH_TIMEOUT_MS);
    if (!res.ok) return { kind: "error", reason: `website HTTP ${res.status}` };
    const html = await res.text();
    const pick = pickBestImage(html, res.url);
    if (!pick) return { kind: "no-image" };

    const dl = await downloadImage(pick.url);
    if (!dl) return { kind: "download-failed" };

    const verdict = await validateWithClaude(anthropic, dl.buffer, dl.contentType, vendor.category);
    if (!verdict.suitable) return { kind: "unsuitable", reason: verdict.reason };

    if (dryRun) {
      return { kind: "updated", url: `(dry-run) ${pick.url}`, pick: pick.reason, reason: verdict.reason };
    }
    const r2Url = await uploadToR2(r2.s3, r2.bucket, r2.publicUrl, vendor.slug, dl.buffer, dl.contentType);
    await db
      .update(vendors)
      .set({
        heroImageCustom:    r2Url,
        heroImageSource:    "website",
        heroImageValidated: true,
        updatedAt:          new Date(),
      })
      .where(eq(vendors.id, vendor.id));

    return { kind: "updated", url: r2Url, pick: pick.reason, reason: verdict.reason };
  } catch (err) {
    return { kind: "error", reason: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const { limit, dryRun } = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }
  const r2 = buildR2Client();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const candidates = await loadCandidates(limit);
  console.log(
    `Loaded ${candidates.length} candidate vendor(s)` +
      `${limit != null ? ` (limit=${limit})` : ""}${dryRun ? " · DRY RUN" : ""}`,
  );
  if (candidates.length === 0) {
    console.log("Nothing to do.");
    return;
  }
  console.log(`Estimated cost: ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(2)}`);

  let updated = 0;
  let noImage = 0;
  let downloadFailed = 0;
  let unsuitable = 0;
  let errored = 0;
  const issues: Array<{ slug: string; outcome: string }> = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);

    for (const c of batch) {
      const r = await processVendor(c, anthropic, r2, dryRun);
      switch (r.kind) {
        case "updated":
          updated++;
          console.log(`  ✓ ${c.slug} — pick=${r.pick} · ${r.reason.slice(0, 60)}`);
          break;
        case "no-image":
          noImage++;
          issues.push({ slug: c.slug, outcome: "no-image" });
          break;
        case "download-failed":
          downloadFailed++;
          issues.push({ slug: c.slug, outcome: "download-failed" });
          break;
        case "unsuitable":
          unsuitable++;
          issues.push({ slug: c.slug, outcome: `unsuitable: ${r.reason.slice(0, 80)}` });
          break;
        case "error":
          errored++;
          issues.push({ slug: c.slug, outcome: `error: ${r.reason.slice(0, 80)}` });
          break;
      }
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

    console.log(
      `  Batch ${batchNum}/${totalBatches} (${batch.length}) — ` +
        `updated=${updated} no-image=${noImage} download-failed=${downloadFailed} ` +
        `unsuitable=${unsuitable} errored=${errored}`,
    );
  }

  console.log("\n=== Summary ===");
  console.log(`Total candidates:  ${candidates.length}`);
  console.log(`Updated:           ${updated}${dryRun ? " (dry run — no writes)" : ""}`);
  console.log(`No image found:    ${noImage}`);
  console.log(`Download failed:   ${downloadFailed}`);
  console.log(`Unsuitable (AI):   ${unsuitable}`);
  console.log(`Errored:           ${errored}`);
  console.log(`Actual cost:       ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(2)}`);

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
