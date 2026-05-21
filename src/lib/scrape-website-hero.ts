/**
 * Pick the best HERO image from a vendor's website using Claude
 * Vision. Different from src/lib/scrape-website-photos.ts (which
 * collects ~6 gallery shots into additional_photos) — this picks
 * ONE image, the one that should represent the vendor at the top
 * of their detail page + on their VendorCard.
 *
 * Pipeline per vendor:
 *   1. Fetch homepage HTML.
 *   2. Extract candidate hero images in 3 tiers:
 *        Tier 1 (curated): og:image, twitter:image, schema.org image,
 *                          first img inside <article> or <main>.
 *        Tier 2 (content): imgs whose class name contains
 *                          'hero', 'banner', 'feature', 'gallery',
 *                          'portfolio', 'showcase', 'header'.
 *        Tier 3 (any large): remaining imgs with declared width > 400.
 *   3. Filter junk (logos, sprites, dietary labels, etc. — same
 *      list as the gallery scraper).
 *   4. Top 3 candidates by tier + width.
 *   5. Send all 3 URLs to claude-haiku-4-5 vision with the prompt:
 *      "pick the best hero image for a wedding vendor listing —
 *       prefer real work shots, avoid logos, plain rooms, low-q."
 *   6. Download Claude's pick.
 *   7. Upload to R2 at vendors/{slug}/website-hero.{ext}.
 *   8. Return { url, source: 'website', alt }.
 *
 * Cost: ~$0.003 per vendor (3-image Claude Vision call).
 * Resize: NOT done in this module — uploads original bytes. Next/Image
 *         handles responsive output at render time. If we need true
 *         resize later, install sharp and pipe bytes through it
 *         between download + upload.
 */
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isSocialOnlyUrl } from "./social-hosts";

const PAGE_FETCH_TIMEOUT_MS  = 8_000;
const IMAGE_FETCH_TIMEOUT_MS = 12_000;
const MAX_IMAGE_BYTES        = 6 * 1024 * 1024;
const MIN_IMAGE_BYTES        = 12 * 1024;  /* Hero images shouldn't be tiny */

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

/* Junk patterns — reused / mirrored from scrape-website-photos.ts.
 * Hero selection is even pickier than gallery selection: anything
 * that smells like a logo or icon is rejected. */
const JUNK_FILENAME_FRAGMENTS = [
  "logo", "favicon", "sprite", "icon", "icons", "wordmark",
  "1x1", "pixel", "tracker", "spacer", "blank",
  "loading", "spinner", "placeholder",
  "google-tag", "analytics", "_next/static",
  "facebook.com/tr",
  "nut-free", "gluten-free", "dairy-free", "vegan-friendly",
  "halal", "kosher", "organic-cert", "allergen",
  "badge", "certified", "certification", "weddingwire-badge",
  "theknot-badge", "best-of", "rated-5",
  "character", "mascot", "illustration", "sketch", "cartoon",
];

const CONTENT_CLASS_KEYWORDS = [
  "hero", "banner", "feature", "gallery", "portfolio",
  "showcase", "header", "splash", "cover",
];

/* ─── Helpers ──────────────────────────────────────────────────── */

function resolveUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/* Many image CDNs (googleusercontent, scontent.cdninstagram,
 * cloudfront, imgix) serve images at extension-less URLs. We can't
 * reject those at extraction time — they're often the BEST candidate
 * (og:image set by the vendor). Instead we let extension-less URLs
 * through and rely on the download step's content-type check to
 * filter non-image content. Only data: URIs + explicit non-photo
 * file types are blocked here. */
function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return false;
  if (lower.endsWith(".svg") || lower.endsWith(".gif") || lower.endsWith(".ico")) return false;
  /* Explicit HTML / app-server pages → reject. */
  if (/\.(html?|php|aspx?|jsp)(\?|$)/.test(lower)) return false;
  return true;
}

function isJunkUrl(url: string): boolean {
  const lower = url.toLowerCase();
  for (const f of JUNK_FILENAME_FRAGMENTS) {
    if (lower.includes(f)) return true;
  }
  return false;
}

function parseWidth(attr: string | undefined): number {
  if (!attr) return 0;
  const m = attr.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/* Pull the real image URL from a set of attrs. WordPress lazy-load
 * plugins (WP Rocket, Smush, a3 Lazy Load, etc.) set src to a 1x1
 * data: SVG placeholder and stash the real URL in data-src /
 * data-lazy-src / data-original / data-orig-src / data-cfsrc.
 * We prefer the lazy attribute when src is a data: URI. */
function pickImageSrc(attrs: {
  src?:           string | null | undefined;
  dataSrc?:       string | null | undefined;
  dataLazySrc?:   string | null | undefined;
  dataOriginal?:  string | null | undefined;
  dataOrigSrc?:   string | null | undefined;
  dataCfsrc?:     string | null | undefined;
}): string | null {
  const lazy =
    attrs.dataSrc ??
    attrs.dataLazySrc ??
    attrs.dataOriginal ??
    attrs.dataOrigSrc ??
    attrs.dataCfsrc ??
    null;
  const src = attrs.src ?? null;
  if (src && src.startsWith("data:") && lazy) return lazy;
  return src ?? lazy;
}

/* ─── Candidate extraction ────────────────────────────────────── */

type Candidate = {
  url:     string;
  tier:    1 | 2 | 3;
  width:   number;
};

function extractCandidates(html: string, pageUrl: string): Candidate[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: Candidate[] = [];

  const push = (raw: string, tier: 1 | 2 | 3, width: number) => {
    const resolved = resolveUrl(raw, pageUrl);
    if (!resolved) return;
    if (!isImageUrl(resolved)) return;
    if (isJunkUrl(resolved)) return;
    if (seen.has(resolved)) return;
    seen.add(resolved);
    out.push({ url: resolved, tier, width });
  };

  /* Tier 1 — curated. */
  $('meta[property="og:image"], meta[property="og:image:url"]').each((_, el) => {
    const c = $(el).attr("content");
    if (c) push(c, 1, 1600);
  });
  $('meta[name="twitter:image"], meta[property="twitter:image"]').each((_, el) => {
    const c = $(el).attr("content");
    if (c) push(c, 1, 1400);
  });
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).contents().text();
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      const collect = (val: unknown) => {
        if (typeof val === "string") push(val, 1, 1200);
        else if (Array.isArray(val)) val.forEach(collect);
        else if (val && typeof val === "object") {
          const o = val as Record<string, unknown>;
          collect(o.image);
          collect(o["@image"]);
        }
      };
      collect(parsed);
    } catch { /* ignore unparseable */ }
  });
  $("article img, main img").first().each((_, el) => {
    const $el = $(el);
    const src = pickImageSrc({
      src:          $el.attr("src"),
      dataSrc:      $el.attr("data-src"),
      dataLazySrc:  $el.attr("data-lazy-src"),
      dataOriginal: $el.attr("data-original"),
      dataOrigSrc:  $el.attr("data-orig-src"),
      dataCfsrc:    $el.attr("data-cfsrc"),
    });
    if (src) push(src, 1, parseWidth($el.attr("width")));
  });

  /* Tier 2 — hero/banner/feature-class images. */
  for (const kw of CONTENT_CLASS_KEYWORDS) {
    $(`[class*="${kw}" i] img, img[class*="${kw}" i]`).each((_, el) => {
      const $el = $(el);
      const src = pickImageSrc({
        src:          $el.attr("src"),
        dataSrc:      $el.attr("data-src"),
        dataLazySrc:  $el.attr("data-lazy-src"),
        dataOriginal: $el.attr("data-original"),
        dataOrigSrc:  $el.attr("data-orig-src"),
        dataCfsrc:    $el.attr("data-cfsrc"),
      });
      if (src) push(src, 2, parseWidth($el.attr("width")));
      /* Also catch background-image:url() in style attrs. */
      const style = $el.attr("style") ?? "";
      const m = style.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i);
      if (m) push(m[1], 2, 0);
    });
    /* Background-image on the container element itself. */
    $(`[class*="${kw}" i][style*="background-image"]`).each((_, el) => {
      const style = $(el).attr("style") ?? "";
      const m = style.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i);
      if (m) push(m[1], 2, 0);
    });
  }

  /* Tier 3 — any other img with declared width > 400. */
  $("img").each((_, el) => {
    const $el = $(el);
    const w =
      parseWidth($el.attr("width")) ||
      parseWidth($el.css("width")) ||
      0;
    if (w <= 400) return;
    /* Prefer largest srcset entry when present. */
    const srcset = $el.attr("srcset");
    if (srcset) {
      const largest = srcset.split(",")
        .map((p) => p.trim())
        .map((p) => {
          const [url, desc] = p.split(/\s+/);
          const dw = desc && desc.endsWith("w") ? parseInt(desc, 10) || 0 : 0;
          return { url, w: dw };
        })
        .sort((a, b) => b.w - a.w)[0];
      if (largest?.url) push(largest.url, 3, largest.w || w);
    }
    const src = pickImageSrc({
      src:          $el.attr("src"),
      dataSrc:      $el.attr("data-src"),
      dataLazySrc:  $el.attr("data-lazy-src"),
      dataOriginal: $el.attr("data-original"),
      dataOrigSrc:  $el.attr("data-orig-src"),
      dataCfsrc:    $el.attr("data-cfsrc"),
    });
    if (src) push(src, 3, w);
  });

  /* Sort: lower tier first, then by width desc. */
  return out.sort((a, b) => a.tier - b.tier || b.width - a.width);
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

type DownloadedImage = { bytes: Buffer; contentType: string };

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

/* ─── R2 ────────────────────────────────────────────────────── */

type R2Config = {
  bucket:    string;
  publicUrl: string;
  s3:        S3Client;
};

export function buildR2Config(): R2Config | null {
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

/* ─── Claude vision selection ────────────────────────────────── */

const VISION_SYSTEM = `You are selecting the best hero image for a wedding-vendor directory listing.

You'll see up to 3 candidate images. Pick the ONE that would best represent the vendor on a directory card and at the top of their detail page.

PREFER:
- Photos of their actual work, product, or space (food, flowers, cakes, ceremony shots, room set-ups)
- High-quality, professional, well-composed shots
- Warm, inviting, wedding-appropriate imagery
- Photos that look like the vendor took them themselves

AVOID:
- Logos or text-heavy "title card" images
- Plain empty rooms, dining tables with no decor, parking lots
- Stock photos that look generic / interchangeable
- Low-resolution, watermarked, or thumbnail-quality images
- Pixelated, blurry, or out-of-focus shots

Return ONE JSON object — no markdown fences, no surrounding prose:

{
  "best_index": 0 | 1 | 2,
  "reason":     "<one short sentence>",
  "confidence": "high" | "medium" | "low"
}`;

type VisionPick = {
  bestIndex: number;
  reason:    string;
  confidence: "high" | "medium" | "low";
};

type AnthropicResp = { content: Array<{ type: string; text?: string }> };

async function pickBestImage(
  client:        Anthropic,
  candidateUrls: string[],
  vendorName:    string,
  vendorCategory: string,
): Promise<VisionPick | null> {
  /* Build the user message with image blocks for each candidate.
   * Claude downloads URLs server-side. */
  const imageBlocks = candidateUrls.map((url) => ({
    type: "image" as const,
    source: { type: "url" as const, url },
  }));

  let res: AnthropicResp;
  try {
    res = (await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 400,
      system:     VISION_SYSTEM,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text:
              `Vendor: ${vendorName}\n` +
              `Category: ${vendorCategory}\n\n` +
              `These are 3 candidate hero images from their website (in order 0, 1, 2). Pick the best one per the rules in the system prompt.`,
          },
          ...imageBlocks,
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any],
    })) as unknown as AnthropicResp;
  } catch (err) {
    console.warn("[scrape-website-hero] Claude vision failed:",
      err instanceof Error ? err.message : err);
    return null;
  }

  const text = res.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { parsed = JSON.parse(m[0]); }
    catch { return null; }
  }

  const bestIndex = typeof parsed.best_index === "number" ? parsed.best_index : -1;
  if (bestIndex < 0 || bestIndex >= candidateUrls.length) return null;
  const conf = (parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low")
    ? parsed.confidence
    : "low";
  return {
    bestIndex,
    reason:     typeof parsed.reason === "string" ? parsed.reason : "",
    confidence: conf,
  };
}

/* ─── Entry point ─────────────────────────────────────────────── */

export type HeroScrapeResult =
  | {
      kind:       "ok";
      url:        string;
      alt:        string;
      sourceUrl:  string;     /* the picked candidate URL before download */
      reason:     string;
      confidence: "high" | "medium" | "low";
      candidates: string[];
      pickedAt:   number;
    }
  | { kind: "skipped"; reason: string };

export async function scrapeWebsiteHero(opts: {
  website:         string | null;
  vendorName:      string;
  vendorSlug:      string;
  vendorCategory:  string;
  /** Pre-built Anthropic client. */
  anthropic:       Anthropic;
  /** When set, upload to R2 + return R2 URL. When null, return source URL. */
  r2?:             R2Config | null;
}): Promise<HeroScrapeResult> {
  if (!opts.website) return { kind: "skipped", reason: "no website" };
  if (isSocialOnlyUrl(opts.website)) return { kind: "skipped", reason: "social-only website" };

  /* Fetch homepage. */
  let homepageUrl = opts.website;
  try { homepageUrl = new URL(opts.website).toString(); }
  catch { return { kind: "skipped", reason: "invalid website URL" }; }

  const html = await fetchPage(homepageUrl);
  if (!html) return { kind: "skipped", reason: "homepage fetch failed" };

  /* Extract candidates and take top 3. */
  const candidates = extractCandidates(html, homepageUrl).slice(0, 3);
  if (candidates.length === 0) {
    return { kind: "skipped", reason: "no candidate images extracted" };
  }

  /* Claude vision pick. */
  const pick = await pickBestImage(
    opts.anthropic,
    candidates.map((c) => c.url),
    opts.vendorName,
    opts.vendorCategory,
  );
  if (!pick) {
    return { kind: "skipped", reason: "vision call failed or returned unparseable" };
  }

  const winnerUrl = candidates[pick.bestIndex].url;

  /* Download. */
  const img = await downloadImage(winnerUrl);
  if (!img) return { kind: "skipped", reason: "picked image download failed" };

  /* Upload if R2 available. */
  let finalUrl = winnerUrl;
  if (opts.r2) {
    const ext = extFromContentType(img.contentType);
    const key = `vendors/${opts.vendorSlug}/website-hero.${ext}`;
    try {
      finalUrl = await uploadToR2(opts.r2, key, img);
    } catch (err) {
      return {
        kind: "skipped",
        reason: `R2 upload failed: ${err instanceof Error ? err.message : err}`,
      };
    }
  }

  return {
    kind:       "ok",
    url:        finalUrl,
    alt:        `${opts.vendorName} — ${opts.vendorCategory} in Ontario`,
    sourceUrl:  winnerUrl,
    reason:     pick.reason,
    confidence: pick.confidence,
    candidates: candidates.map((c) => c.url),
    pickedAt:   pick.bestIndex,
  };
}
