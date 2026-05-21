/**
 * Fetch hero images for vendors that have no Google Places photo but
 * DO have an Instagram handle or Yelp URL. Pulls each public profile's
 * og:image meta tag, validates it, uploads to R2, and persists the
 * R2 URL into vendors.hero_image_custom + sets hero_image_source.
 *
 * Filter:
 *   hero_image IS NULL
 *   AND hero_image_custom IS NULL    (don't overwrite hand-uploaded)
 *   AND is_hidden = false
 *   AND (instagram_handle IS NOT NULL OR yelp_url IS NOT NULL)
 *
 * For each candidate:
 *   1. Try Instagram first (when handle present)
 *   2. Try Yelp next (when URL present)
 *   3. Skip on both failures
 *
 * --- Verified behaviour against production endpoints (May 2026) ---
 *
 * INSTAGRAM works with the canonical og: scraper UA
 *   'facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)'.
 *   The Chrome UA returns a JS shell with no meta tags; the social UA
 *   returns the rendered og:image. The image itself is the small
 *   100x100 profile photo (dst-jpg_s100x100 in the URL) — better than
 *   nothing for a category-fallback hero but not a true portfolio shot.
 *
 * YELP is blocked. Every UA + referer variation 403s — Yelp's edge
 *   (Cloudflare-style protection) rejects server-side fetches without
 *   real browser fingerprinting. We KEEP the Yelp path in the code so
 *   the moment they loosen restrictions OR we add a proxy/Playwright
 *   path, it'll start working — but right now expect it to skip
 *   essentially every Yelp candidate.
 *
 * Yelp generic-placeholder detection skips (when Yelp does respond):
 *   - URL contains 'default_avatars'
 *   - URL contains 'placeholder'
 *   - URL contains 'generic'
 *   - Image body < 10KB (placeholder gifs are tiny)
 *
 * CLI:
 *   npx tsx scripts/fetch-social-hero-images.ts                # dry-run
 *   npx tsx scripts/fetch-social-hero-images.ts --limit 20     # smoke
 *   npx tsx scripts/fetch-social-hero-images.ts --confirm      # write
 *
 * Cost: HTTP fetches only — no Claude / API spend. ~1-2s per vendor.
 */
import "dotenv/config";
import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";

const FETCH_TIMEOUT_MS = 12_000;
const PER_VENDOR_DELAY_MS = 400;
/* 4KB minimum — placeholder gifs / 1x1 trackers / "no image" pixels
 * are all well under this; real photos (including 100x100 IG profile
 * pics) clear it cleanly. The spec called for 10KB but that rejected
 * legitimate IG profile photos in probing. */
const MIN_IMAGE_BYTES = 4 * 1024;

/* facebookexternalhit is the canonical UA for og: scraping. Probed
 * against IG: returns the og:image meta tag in static HTML. Probed
 * against Yelp: returns 403 (Yelp blocks regardless of UA — see
 * docstring). We use it for both anyway since it's the right
 * intent-signalling header for this work. */
const OG_HEADERS: HeadersInit = {
  "user-agent":
    "facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-CA,en-US;q=0.9,en;q=0.8",
};

/* When we then download the image binary, switch to a normal Chrome
 * UA — IG's CDN serves images to any UA and gives larger payloads
 * when it thinks the request is a real browser. */
const DOWNLOAD_HEADERS: HeadersInit = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/*,*/*;q=0.8",
};

/* Decode the common HTML entities that appear inside og:image content
 * attributes: &amp; → &, &#39; → ', &quot; → ", &lt;/&gt;.
 * The IG CDN's og:image URL is one big query string of ampersand-
 * separated params, all of which arrive as &amp; in attribute markup. */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

type Args = { limit: number | null; dryRun: boolean };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let limit: number | null = null;
  let confirm = false;
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === "--confirm") confirm = true;
    else if (arg === "--dry-run") confirm = false;
    else if (arg === "--limit") {
      const n = parseInt(a[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (arg.startsWith("--limit=")) {
      const n = parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { limit, dryRun: !confirm };
}

/* ─── Candidates ────────────────────────────────────────────────── */

type Candidate = {
  id:              number;
  slug:            string;
  name:            string;
  instagramHandle: string | null;
  yelpUrl:         string | null;
};

async function loadCandidates(args: Args): Promise<Candidate[]> {
  const q = db
    .select({
      id:              vendors.id,
      slug:            vendors.slug,
      name:            vendors.name,
      instagramHandle: vendors.instagramHandle,
      yelpUrl:         vendors.yelpUrl,
    })
    .from(vendors)
    .where(and(
      isNull(vendors.heroImage),
      isNull(vendors.heroImageCustom),
      eq(vendors.isHidden, false),
      or(
        isNotNull(vendors.instagramHandle),
        isNotNull(vendors.yelpUrl),
      ),
    ))
    .orderBy(vendors.id);

  const rows = args.limit != null ? await q.limit(args.limit) : await q;
  return rows.map((r) => ({
    id:              r.id,
    slug:            r.slug,
    name:            r.name,
    instagramHandle: r.instagramHandle,
    yelpUrl:         r.yelpUrl,
  }));
}

/* ─── og:image extraction ───────────────────────────────────────── */

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers:  OG_HEADERS,
      redirect: "follow",
      signal:   AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    /* Most pages put og:image in the first 32KB of head. Accept any
     * order of attributes — property may come before or after content. */
    const head = html.slice(0, 65_536);
    /* property="og:image" content="..." */
    const m1 = head.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (m1) return decodeHtmlEntities(m1[1]);
    /* content first, property after */
    const m2 = head.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (m2) return decodeHtmlEntities(m2[1]);
    return null;
  } catch {
    return null;
  }
}

const YELP_PLACEHOLDER_FRAGMENTS = [
  "default_avatars",
  "placeholder",
  "generic",
];

function isYelpPlaceholderUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return YELP_PLACEHOLDER_FRAGMENTS.some((f) => lower.includes(f));
}

/* ─── Image download + validation ───────────────────────────────── */

type DownloadedImage = {
  bytes:       Buffer;
  contentType: string;
};

async function downloadImage(imageUrl: string): Promise<DownloadedImage | null> {
  try {
    const res = await fetch(imageUrl, {
      headers:  DOWNLOAD_HEADERS,
      redirect: "follow",
      signal:   AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < MIN_IMAGE_BYTES) return null;
    const ct = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    return { bytes: buf, contentType: ct };
  } catch {
    return null;
  }
}

/* ─── R2 upload ─────────────────────────────────────────────────── */

function r2Client() {
  const {
    CLOUDFLARE_R2_BUCKET,
    CLOUDFLARE_R2_ACCESS_KEY_ID,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    CLOUDFLARE_R2_ENDPOINT,
    CLOUDFLARE_R2_PUBLIC_URL,
  } = process.env;
  if (
    !CLOUDFLARE_R2_BUCKET ||
    !CLOUDFLARE_R2_ACCESS_KEY_ID ||
    !CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    !CLOUDFLARE_R2_ENDPOINT ||
    !CLOUDFLARE_R2_PUBLIC_URL
  ) return null;
  return {
    bucket:    CLOUDFLARE_R2_BUCKET,
    publicUrl: CLOUDFLARE_R2_PUBLIC_URL.replace(/\/+$/, ""),
    s3: new S3Client({
      region:      "auto",
      endpoint:    CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId:     CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    }),
  };
}

function extFromContentType(ct: string): "jpg" | "png" | "webp" {
  if (ct === "image/png")  return "png";
  if (ct === "image/webp") return "webp";
  return "jpg";
}

async function uploadToR2(opts: {
  r2:    NonNullable<ReturnType<typeof r2Client>>;
  key:   string;
  img:   DownloadedImage;
}): Promise<string> {
  await opts.r2.s3.send(new PutObjectCommand({
    Bucket:       opts.r2.bucket,
    Key:          opts.key,
    Body:         opts.img.bytes,
    ContentType:  opts.img.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${opts.r2.publicUrl}/${opts.key}`;
}

/* ─── Per-vendor flow ───────────────────────────────────────────── */

type Outcome =
  | { kind: "instagram"; url: string }
  | { kind: "yelp";      url: string }
  | { kind: "skipped";   reason: string };

async function fetchOneVendor(c: Candidate, args: Args, r2: NonNullable<ReturnType<typeof r2Client>>): Promise<Outcome> {
  /* 1. Instagram first when a handle is present. Many IG profiles 401
   *    unauthenticated fetches but a meaningful subset still expose
   *    og:image. Try it; on failure fall through to Yelp. */
  if (c.instagramHandle) {
    const handle = c.instagramHandle.replace(/^@/, "").trim();
    if (handle) {
      const profileUrl = `https://www.instagram.com/${encodeURIComponent(handle)}/`;
      const ogUrl = await fetchOgImage(profileUrl);
      if (ogUrl) {
        const img = await downloadImage(ogUrl);
        if (img) {
          if (args.dryRun) return { kind: "instagram", url: `dry:${ogUrl}` };
          const ext = extFromContentType(img.contentType);
          const key = `vendors/${c.slug}/hero-instagram.${ext}`;
          const url = await uploadToR2({ r2, key, img });
          await db
            .update(vendors)
            .set({
              heroImageCustom:      url,
              heroImageSource:      "instagram",
              heroImageRefreshedAt: new Date(),
              needsPhotoBackfill:   false,
              updatedAt:            new Date(),
            })
            .where(eq(vendors.id, c.id));
          return { kind: "instagram", url };
        }
      }
    }
  }

  /* 2. Yelp fallback when URL present. Generic-placeholder detection
   *    runs on the og:image URL itself before download. */
  if (c.yelpUrl) {
    const ogUrl = await fetchOgImage(c.yelpUrl);
    if (ogUrl) {
      if (isYelpPlaceholderUrl(ogUrl)) {
        return { kind: "skipped", reason: "yelp og:image is generic placeholder" };
      }
      const img = await downloadImage(ogUrl);
      if (img) {
        if (args.dryRun) return { kind: "yelp", url: `dry:${ogUrl}` };
        const ext = extFromContentType(img.contentType);
        const key = `vendors/${c.slug}/hero-yelp.${ext}`;
        const url = await uploadToR2({ r2, key, img });
        await db
          .update(vendors)
          .set({
            heroImageCustom:      url,
            heroImageSource:      "yelp",
            heroImageRefreshedAt: new Date(),
            needsPhotoBackfill:   false,
            updatedAt:            new Date(),
          })
          .where(eq(vendors.id, c.id));
        return { kind: "yelp", url };
      }
    }
  }

  return { kind: "skipped", reason: "no og:image found on IG or Yelp" };
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/* ─── Main ─────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs();
  const r2 = r2Client();
  if (!r2 && !args.dryRun) {
    console.error("R2 env vars missing. Set CLOUDFLARE_R2_* to write — or pass --dry-run.");
    process.exit(1);
  }

  const candidates = await loadCandidates(args);
  console.log(
    `Loaded ${candidates.length} candidate(s)${args.limit ? ` (limit=${args.limit})` : ""}` +
    `${args.dryRun ? " · DRY RUN" : " · WRITE"}`,
  );
  if (candidates.length === 0) { console.log("Nothing to do."); return; }

  let ig = 0, yelp = 0, skipped = 0;
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    /* For dry-run mode r2 is unused; cast safe because we won't reach
     * upload code without --confirm. */
    const result = await fetchOneVendor(c, args, r2 ?? ({} as NonNullable<ReturnType<typeof r2Client>>));
    const tag =
      result.kind === "instagram" ? "IG" :
      result.kind === "yelp"      ? "Yelp" :
                                    "skip";
    if (result.kind === "instagram") ig++;
    else if (result.kind === "yelp") yelp++;
    else skipped++;

    const detail = result.kind === "skipped" ? `(${result.reason})` : result.url;
    console.log(`  [${i + 1}/${candidates.length}] ${tag.padEnd(4)}  ${c.slug}  ${detail.slice(0, 80)}`);

    await sleep(PER_VENDOR_DELAY_MS);
  }

  console.log("\n=== Summary ===");
  console.log(`Candidates:     ${candidates.length}`);
  console.log(`Instagram hits: ${ig}${args.dryRun ? " (dry — no writes)" : ""}`);
  console.log(`Yelp hits:      ${yelp}${args.dryRun ? " (dry — no writes)" : ""}`);
  console.log(`Skipped:        ${skipped}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
