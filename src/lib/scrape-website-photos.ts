/**
 * Extract gallery-worthy photos from a vendor's own website + upload
 * them to R2.
 *
 * Why we built this:
 *   The previous additional-photos path lazy-fetched 6 photos from
 *   Google Places on every cold render — $0.017 per Place Details
 *   call, multiplied across every vendor detail-page visit. This
 *   replacement scrapes the vendor's own website (free) for higher-
 *   quality, vendor-curated images and falls back to Google only as
 *   a last resort.
 *
 * Pipeline per vendor:
 *   1. Fetch homepage + /gallery + /portfolio + /work + /photos
 *      variants in parallel (12s budget total).
 *   2. Extract image candidates from:
 *        - og:image / twitter:image meta tags (best signal — curated)
 *        - <img> tags with absolute URLs + jpg/jpeg/png/webp extensions
 *        - inline background-image:url(...) CSS in style attributes
 *        - JSON-LD schema.org/Product/Service "image" fields
 *   3. Filter junk:
 *        - logos, icons, favicons, sprites (by filename pattern)
 *        - data: URIs, SVGs, GIFs, tracking pixels
 *        - duplicates (by URL after normalization)
 *   4. Score each candidate and rank.
 *   5. Take top N, download in parallel, upload to R2 at
 *      vendors/{slug}/gallery-{1..N}.{ext}.
 *   6. Return GoogleVendorPhoto[] (the shape the renderer already
 *      consumes — { url, attributions }).
 *
 * Latency: ~3-8s per vendor in the typical case (parallel page
 * fetches + parallel image downloads). Acceptable for the bulk
 * backfill; tight for cold-page render which is why we cap the
 * per-call HTTP budget aggressively below.
 */
import * as cheerio from "cheerio";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isSocialOnlyUrl } from "./social-hosts";

import type { GoogleVendorPhoto } from "./google-reviews";

const PAGE_FETCH_TIMEOUT_MS  = 8_000;
const IMAGE_FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES        = 4 * 1024 * 1024;   /* 4MB cap per image */
const MIN_IMAGE_BYTES        = 8 * 1024;          /* 8KB — placeholders are smaller */
const DEFAULT_TARGET_PHOTOS  = 6;

const BROWSER_HEADERS: HeadersInit = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-CA,en-US;q=0.9,en;q=0.8",
};

const IMAGE_FETCH_HEADERS: HeadersInit = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/*,*/*;q=0.8",
};

const GALLERY_PATHS = ["", "gallery", "portfolio", "work", "photos"];

const JUNK_FILENAME_FRAGMENTS = [
  "logo", "favicon", "sprite", "icon", "icons", "wordmark",
  "1x1", "pixel", "tracker", "spacer", "blank",
  "loading", "spinner", "placeholder",
  "google-tag", "analytics", "_next/static",
  "facebook.com/tr",  /* FB pixel */
  /* Dietary / allergen / certification labels — appear as PNG icons
   * on bakery + caterer sites and were ranking too high in early
   * runs because they live in /images/ (inPath bonus). */
  "nut-free", "gluten-free", "dairy-free", "vegan-friendly", "vegan-logo",
  "halal", "kosher", "organic-cert", "allergen", "allergy",
  /* Badges, certifications, awards — usually illustrated, not photos. */
  "badge", "certified", "certification", "award-badge", "weddingwire-badge",
  "theknot-badge", "best-of", "rated-5",
  /* Illustrations / characters / mascots — common on bakery sites. */
  "character", "mascot", "illustration", "sketch", "cartoon",
];

/* ─── URL normalization ────────────────────────────────────────── */

/* Resolve relative URL against the page URL, drop fragments + query
 * params that vary (cache busters, srcset hints). */
function resolveUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    /* Strip common cache-busting query strings while preserving CDN
     * params that matter (resize variants). We keep the FULL query
     * for now — Wix/Squarespace use ?w= for the resized variant. */
    return u.toString();
  } catch {
    return null;
  }
}

function isImageExtension(url: string): boolean {
  /* Match the extension in the URL path (before any ?). */
  const path = url.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|webp)(\b|$)/.test(path);
}

function isJunkUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return true;
  if (lower.endsWith(".svg") || lower.endsWith(".gif") || lower.endsWith(".ico")) return true;
  for (const f of JUNK_FILENAME_FRAGMENTS) {
    if (lower.includes(f)) return true;
  }
  return false;
}

/* ─── Candidate extraction ─────────────────────────────────────── */

type Candidate = {
  url:     string;
  source:  "og" | "twitter" | "schema" | "img" | "bg";
  width:   number;   /* declared width if parseable, else 0 */
  inPath:  boolean;  /* is it under /gallery/, /portfolio/, etc.? */
};

function parseWidth(attr: string | undefined): number {
  if (!attr) return 0;
  const m = attr.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/* Pull all image candidates from a single page HTML. */
function extractFromHtml(html: string, pageUrl: string): Candidate[] {
  const $ = cheerio.load(html);
  const out: Candidate[] = [];
  const seen = new Set<string>();

  const push = (raw: string, source: Candidate["source"], width: number) => {
    const resolved = resolveUrl(raw, pageUrl);
    if (!resolved) return;
    if (!isImageExtension(resolved)) return;
    if (isJunkUrl(resolved)) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);
    const inPath = /\/(gallery|portfolio|work|photos|images?)\//i.test(resolved);
    out.push({ url: resolved, source, width, inPath });
  };

  /* og:image — usually the vendor's hero shot. */
  $('meta[property="og:image"], meta[property="og:image:url"]').each((_, el) => {
    const c = $(el).attr("content");
    if (c) push(c, "og", 1200);
  });
  $('meta[name="twitter:image"], meta[property="twitter:image"]').each((_, el) => {
    const c = $(el).attr("content");
    if (c) push(c, "twitter", 1000);
  });

  /* JSON-LD schema.org — "image" can be string, array, or object. */
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).contents().text();
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      const collect = (val: unknown) => {
        if (typeof val === "string") push(val, "schema", 0);
        else if (Array.isArray(val)) val.forEach(collect);
        else if (val && typeof val === "object") {
          const o = val as Record<string, unknown>;
          collect(o.image);
          collect(o["@image"]);
          collect(o.url);
        }
      };
      collect(parsed);
    } catch { /* ignore unparseable JSON-LD */ }
  });

  /* <img> tags. */
  $("img").each((_, el) => {
    const $el = $(el);
    /* Modern responsive images use srcset — take the largest entry. */
    const srcset = $el.attr("srcset");
    if (srcset) {
      const largest = srcset
        .split(",")
        .map((part) => part.trim())
        .map((part) => {
          const [url, descriptor] = part.split(/\s+/);
          const w = descriptor && descriptor.endsWith("w")
            ? parseInt(descriptor, 10) || 0
            : 0;
          return { url, w };
        })
        .sort((a, b) => b.w - a.w)[0];
      if (largest?.url) push(largest.url, "img", largest.w);
    }
    const src = $el.attr("src") ?? $el.attr("data-src") ?? $el.attr("data-original") ?? $el.attr("data-lazy-src");
    if (src) {
      const width =
        parseWidth($el.attr("width")) ||
        parseWidth($el.css("width")) ||
        0;
      push(src, "img", width);
    }
  });

  /* Inline background-image:url(...) in style attributes. */
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") ?? "";
    const m = style.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i);
    if (m) push(m[1], "bg", 0);
  });

  return out;
}

/* ─── Scoring ──────────────────────────────────────────────────── */

const SOURCE_SCORE: Record<Candidate["source"], number> = {
  og:      50,
  twitter: 40,
  schema:  35,
  img:     10,
  bg:      5,
};

function scoreCandidate(c: Candidate, vendorNameSlug: string): number {
  let score = SOURCE_SCORE[c.source];
  if (c.width >= 1200) score += 25;
  else if (c.width >= 800) score += 15;
  else if (c.width >= 600) score += 8;
  else if (c.width >= 400) score += 3;
  else if (c.width > 0)   score -= 10;   /* explicitly small */
  if (c.inPath) score += 15;
  /* Vendor name token in filename → bonus. */
  if (vendorNameSlug && c.url.toLowerCase().includes(vendorNameSlug)) score += 10;
  /* File-type preference: real photographic gallery shots are
   * overwhelmingly JPEG. Illustrations, icons, dietary badges, and
   * UI elements are overwhelmingly PNG/WebP-with-alpha. Penalize PNGs
   * unless they have other strong signals — they CAN still win when
   * coming from og:image or a /gallery/ path. */
  const pathLower = c.url.split("?")[0].toLowerCase();
  if (/\.(jpe?g)(\b|$)/.test(pathLower))     score += 12;
  else if (/\.(png)(\b|$)/.test(pathLower))  score -= 8;
  return score;
}

function vendorNameSlugFor(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);
}

/* ─── Page fetch ──────────────────────────────────────────────── */

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers:  BROWSER_HEADERS,
      redirect: "follow",
      signal:   AbortSignal.timeout(PAGE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/* ─── Image download ──────────────────────────────────────────── */

type DownloadedImage = {
  bytes:       Buffer;
  contentType: string;
};

async function downloadImage(url: string): Promise<DownloadedImage | null> {
  try {
    const res = await fetch(url, {
      headers:  IMAGE_FETCH_HEADERS,
      redirect: "follow",
      signal:   AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    if (!ct.startsWith("image/")) return null;
    /* Sanity-cap before reading the full body. */
    const lenHeader = parseInt(res.headers.get("content-length") ?? "0", 10);
    if (lenHeader > MAX_IMAGE_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < MIN_IMAGE_BYTES) return null;
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    return { bytes: buf, contentType: ct };
  } catch {
    return null;
  }
}

function extFromContentType(ct: string): "jpg" | "png" | "webp" {
  if (ct === "image/png")  return "png";
  if (ct === "image/webp") return "webp";
  return "jpg";
}

/* ─── R2 upload ─────────────────────────────────────────────── */

type R2Config = {
  bucket:    string;
  publicUrl: string;
  s3:        S3Client;
};

function r2Client(): R2Config | null {
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

async function uploadToR2(r2: R2Config, key: string, img: DownloadedImage): Promise<string> {
  await r2.s3.send(new PutObjectCommand({
    Bucket:       r2.bucket,
    Key:          key,
    Body:         img.bytes,
    ContentType:  img.contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${r2.publicUrl}/${key}`;
}

/* ─── Entry point ─────────────────────────────────────────────── */

export type ScrapeResult = {
  photos:        GoogleVendorPhoto[];
  /* Diagnostic info — useful for the bulk script's logs. Pages
   * actually fetched, candidates found, images downloaded. */
  pagesFetched:  number;
  candidates:    number;
  downloaded:    number;
  uploaded:      number;
  /* Set to true when the scraper skipped this vendor for a reason
   * the caller might care about (no website, social URL, etc.). */
  skippedReason?: string;
};

export async function scrapeWebsitePhotos(opts: {
  website:     string | null;
  vendorName:  string;
  vendorSlug:  string;
  /** When set, persist to R2 + return R2 URLs. When omitted, return
   *  source URLs without R2 upload — useful for dry-run inspection. */
  r2?:         R2Config | null;
  /** Max photos to return. Default 6. */
  count?:      number;
}): Promise<ScrapeResult> {
  const empty: ScrapeResult = { photos: [], pagesFetched: 0, candidates: 0, downloaded: 0, uploaded: 0 };
  const count = opts.count ?? DEFAULT_TARGET_PHOTOS;

  if (!opts.website) return { ...empty, skippedReason: "no website" };
  if (isSocialOnlyUrl(opts.website)) return { ...empty, skippedReason: "social-only website" };

  /* Build the URL variants — homepage + 4 common gallery paths. */
  let base: URL;
  try { base = new URL(opts.website); }
  catch { return { ...empty, skippedReason: "invalid website URL" }; }

  const targetUrls = GALLERY_PATHS
    .map((p) => p ? new URL(p, base.origin + base.pathname.replace(/\/+$/, "") + "/").toString() : base.toString())
    /* Dedupe — a vendor whose homepage IS /gallery/ shouldn't try to fetch it twice. */
    .filter((u, i, arr) => arr.indexOf(u) === i);

  const pageResults = await Promise.all(targetUrls.map(fetchPage));
  const pagesFetched = pageResults.filter((p) => p != null).length;
  if (pagesFetched === 0) return { ...empty, skippedReason: "all page fetches failed" };

  /* Aggregate + dedupe candidates across pages. */
  const seen = new Set<string>();
  const allCandidates: Candidate[] = [];
  for (let i = 0; i < pageResults.length; i++) {
    const html = pageResults[i];
    if (!html) continue;
    const extracted = extractFromHtml(html, targetUrls[i]);
    for (const c of extracted) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      allCandidates.push(c);
    }
  }

  if (allCandidates.length === 0) {
    return { ...empty, pagesFetched, skippedReason: "no image candidates extracted" };
  }

  /* Score, sort, take top (count * 2) for download attempts — a few
   * will fail the size gate and we want the headroom. */
  const nameSlug = vendorNameSlugFor(opts.vendorName);
  const ranked = allCandidates
    .map((c) => ({ c, score: scoreCandidate(c, nameSlug) }))
    .sort((a, b) => b.score - a.score);
  const downloadTargets = ranked.slice(0, count * 2);

  /* Download in parallel. */
  const downloads = await Promise.all(
    downloadTargets.map(async ({ c }) => {
      const img = await downloadImage(c.url);
      return img ? { c, img } : null;
    }),
  );
  const successful = downloads.filter((d): d is { c: Candidate; img: DownloadedImage } => d != null);

  if (successful.length === 0) {
    return { ...empty, pagesFetched, candidates: allCandidates.length, skippedReason: "no images downloaded successfully" };
  }

  /* Take the first `count` after the download filter. */
  const finalSet = successful.slice(0, count);

  /* Upload to R2 if a client was provided; otherwise return source URLs. */
  const photos: GoogleVendorPhoto[] = [];
  let uploaded = 0;
  if (opts.r2) {
    const r2 = opts.r2;
    const uploadResults = await Promise.all(
      finalSet.map(async ({ img }, idx) => {
        const ext = extFromContentType(img.contentType);
        const key = `vendors/${opts.vendorSlug}/gallery-${idx + 1}.${ext}`;
        try {
          const url = await uploadToR2(r2, key, img);
          return url;
        } catch (err) {
          console.warn("[scrape-website-photos] R2 upload failed:",
            err instanceof Error ? err.message : err);
          return null;
        }
      }),
    );
    for (const url of uploadResults) {
      if (url) {
        photos.push({ url, attributions: [`Photo from ${opts.vendorName}`] });
        uploaded++;
      }
    }
  } else {
    /* Dry-run path: surface the source URLs directly so the operator
     * can see what would have been uploaded. */
    for (const { c } of finalSet) {
      photos.push({ url: c.url, attributions: [`Photo from ${opts.vendorName}`] });
    }
  }

  return {
    photos,
    pagesFetched,
    candidates: allCandidates.length,
    downloaded: successful.length,
    uploaded,
  };
}

/* Re-export the R2 config builder so the bulk script can construct
 * one R2 client up front and reuse it across iterations. */
export function buildR2Config(): R2Config | null {
  return r2Client();
}
