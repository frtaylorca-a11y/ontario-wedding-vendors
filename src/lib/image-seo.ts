/**
 * SEO image helpers shared by upgrade-vendor-photos.ts and
 * upgrade-venue-photos.ts.
 *
 * Two responsibilities:
 *   1. Build the descriptive filename used for R2 storage. Google
 *      reads the image URL as a ranking signal — naming the file
 *      "lauren-garbutt-wedding-photographer-hamilton-ontario.jpg"
 *      beats "hero.jpg" for queries that combine the vendor name +
 *      category + city.
 *   2. Write SEO EXIF metadata into the image bytes BEFORE upload
 *      via exiftool (child process). If exiftool isn't installed on
 *      the machine running the script we skip the metadata write
 *      and upload the original bytes — never fail the whole batch
 *      over an EXIF concern.
 *
 * For dry-run mode the caller can ask buildExifPreview() to return
 * the metadata that WOULD have been written, even when exiftool is
 * unavailable, so operators can eyeball the strings before running
 * for real.
 */
import { spawn } from "node:child_process";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* ─── Slugs ──────────────────────────────────────────────────────── */

/** Lower-case, hyphen-separated, ASCII-only slug. Drops accents. */
export function asciiSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/** Pick the file extension from a HTTP content type. Defaults to jpg. */
export function extFromContentType(contentType: string): "jpg" | "png" | "webp" | "gif" {
  switch (contentType) {
    case "image/png":  return "png";
    case "image/webp": return "webp";
    case "image/gif":  return "gif";
    default:           return "jpg";
  }
}

/* ─── R2 key builders ────────────────────────────────────────────── */

/** vendors/{slug}/{slug}-{category}-{city}-ontario.{ext}
 *  e.g. vendors/lauren-garbutt/lauren-garbutt-wedding-photographer-hamilton-ontario.jpg */
export function vendorR2Key(opts: {
  slug:     string;
  category: string;
  city:     string | null;
  ext:      string;
}): string {
  const parts = [
    asciiSlug(opts.slug),
    "wedding",
    asciiSlug(opts.category.replace(/_/g, "-")),
    opts.city ? asciiSlug(opts.city) : null,
    "ontario",
  ].filter((p): p is string => !!p && p.length > 0);
  const filename = `${parts.join("-")}.${opts.ext}`;
  return `vendors/${opts.slug}/${filename}`;
}

/** venues/{slug}/{slug}-wedding-venue-{city}-ontario.{ext} */
export function venueR2Key(opts: {
  slug: string;
  city: string | null;
  ext:  string;
}): string {
  const parts = [
    asciiSlug(opts.slug),
    "wedding-venue",
    opts.city ? asciiSlug(opts.city) : null,
    "ontario",
  ].filter((p): p is string => !!p && p.length > 0);
  const filename = `${parts.join("-")}.${opts.ext}`;
  return `venues/${opts.slug}/${filename}`;
}

/* ─── EXIF metadata ──────────────────────────────────────────────── */

export type ExifMeta = {
  /** IPTC + EXIF + XMP image title. Mirrored to XMP:Title. */
  title:       string;
  /** Free-text description. Mirrored to XMP:Description / IPTC Caption-Abstract. */
  description: string;
  /** IPTC Keywords + XMP:Subject. */
  keywords:    string[];
  /** EXIF Artist + IPTC By-line. */
  artist:      string;
  /** EXIF Copyright + IPTC CopyrightNotice. */
  copyright:   string;
};

/** Build a vendor's EXIF metadata bundle for a single hero photo. */
export function buildVendorExif(opts: {
  name:        string;
  city:        string | null;
  category:    string;       // raw category slug, e.g. "photographer"
  categoryLabel: string;     // human label, e.g. "Photographer"
  description: string | null;
  specialties: string[];
}): ExifMeta {
  const city = opts.city ?? "Ontario";
  const title =
    `${opts.name} — Wedding ${opts.categoryLabel} in ${city}, Ontario`;
  const description = (opts.description ?? "").trim().slice(0, 200);
  /* Keywords: category + city + Ontario + wedding + each specialty */
  const keywords = [
    `Wedding ${opts.categoryLabel}`,
    city,
    "Ontario",
    "wedding",
    ...opts.specialties,
  ].filter((k, i, arr) => k && arr.indexOf(k) === i);
  return {
    title,
    description,
    keywords,
    artist:    opts.name,
    copyright: opts.name,
  };
}

/** Build a venue's EXIF metadata bundle. */
export function buildVenueExif(opts: {
  name:        string;
  city:        string | null;
  venueType:   string | null;
  capacityMax: number | null;
  description: string | null;
}): ExifMeta {
  const city = opts.city ?? "Ontario";
  const title       = `${opts.name} — Wedding Venue in ${city}, Ontario`;
  const description = (opts.description ?? "").trim().slice(0, 200);
  const keywords = [
    "wedding venue",
    city,
    "Ontario",
    opts.venueType ?? null,
    opts.capacityMax != null ? `${opts.capacityMax} guests` : null,
  ].filter((k): k is string => !!k && k.length > 0);
  return {
    title,
    description,
    keywords,
    artist:    opts.name,
    copyright: opts.name,
  };
}

/* ─── exiftool subprocess ────────────────────────────────────────── */

export type EmbedExifResult =
  | { kind: "ok"; buffer: Buffer; bytesIn: number; bytesOut: number }
  | { kind: "skipped-no-exiftool" }
  | { kind: "skipped-error"; reason: string };

/** Run exiftool over the in-memory image bytes. Writes the bytes to
 *  a temp file, invokes exiftool with the metadata args, reads back,
 *  cleans up. On any failure (exiftool missing, bad exit code, fs
 *  error) returns the appropriate skipped status — the caller should
 *  fall back to the original buffer and continue. */
export async function embedExif(
  buffer:      Buffer,
  contentType: string,
  meta:        ExifMeta,
): Promise<EmbedExifResult> {
  const ext = extFromContentType(contentType);
  const tmpPath = join(
    tmpdir(),
    `owv-exif-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`,
  );

  try {
    await writeFile(tmpPath, buffer);
  } catch (err) {
    return { kind: "skipped-error", reason: `tmp write failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  /* Build the exiftool argv. -overwrite_original prevents a *_original
   * backup file from being left behind. -jumbf:all= strips any C2PA /
   * JUMBF attestation chunks from upstream pipelines (mirrors the
   * Pic Booth Tagger pattern). */
  const args: string[] = [
    "-overwrite_original",
    "-jumbf:all=",
    `-Title=${meta.title}`,
    `-XMP-dc:Title=${meta.title}`,
    `-Description=${meta.description}`,
    `-XMP-dc:Description=${meta.description}`,
    `-IPTC:Caption-Abstract=${meta.description}`,
    `-Keywords=${meta.keywords.join(",")}`,
    `-XMP-dc:Subject=${meta.keywords.join(",")}`,
    `-Artist=${meta.artist}`,
    `-IPTC:By-line=${meta.artist}`,
    `-Copyright=${meta.copyright}`,
    `-IPTC:CopyrightNotice=${meta.copyright}`,
    tmpPath,
  ];

  const result = await new Promise<EmbedExifResult>((resolve) => {
    const proc = spawn("exiftool", args, { stdio: "ignore" });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      /* ENOENT here means exiftool isn't on PATH. Every other error
       * gets a more descriptive message. */
      if (err.code === "ENOENT") {
        resolve({ kind: "skipped-no-exiftool" });
      } else {
        resolve({ kind: "skipped-error", reason: err.message });
      }
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        resolve({ kind: "skipped-error", reason: `exiftool exit ${code}` });
        return;
      }
      try {
        const tagged = await readFile(tmpPath);
        resolve({
          kind:     "ok",
          buffer:   tagged,
          bytesIn:  buffer.byteLength,
          bytesOut: tagged.byteLength,
        });
      } catch (err) {
        resolve({
          kind:   "skipped-error",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    });
  });

  /* Always remove the temp file. Best-effort. */
  await unlink(tmpPath).catch(() => {});
  return result;
}

/** Format the metadata bundle as a multi-line preview string —
 *  used by --dry-run to surface what WOULD be written even when
 *  exiftool isn't available. */
export function formatExifPreview(meta: ExifMeta): string {
  return [
    `  Title:        ${meta.title}`,
    `  Description:  ${meta.description.slice(0, 100)}${meta.description.length > 100 ? "…" : ""}`,
    `  Keywords:     ${meta.keywords.join(", ")}`,
    `  Artist:       ${meta.artist}`,
    `  Copyright:    ${meta.copyright}`,
  ].join("\n");
}
