/**
 * Hero-image pipeline for agent-generated blog posts.
 *
 *   1. claude-haiku extracts a visual concept (prompt + filename +
 *      alt text + keywords) from the post title + excerpt.
 *   2. OpenAI gpt-image-1 renders the photo at 1536×1024.
 *   3. exiftool strips AI-provenance chunks and writes our own
 *      IPTC/EXIF/XMP metadata.
 *   4. R2 PutObject to blog/images/{slug}/{filename}.
 *   5. Caller persists heroImageUrl + heroImageAlt + heroImagePrompt
 *      back onto the blog_posts row.
 *
 * Any step that requires unavailable credentials degrades gracefully:
 * the function returns a `skipped` result with the reason, the
 * blog post stays without a hero image, and the daily summary
 * surfaces that the run was credential-limited.
 *
 * Cost: ~$0.04 per image (gpt-image-1 standard quality 1536×1024).
 */
import Anthropic from "@anthropic-ai/sdk";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { embedExif, asciiSlug, type ExifMeta } from "@/lib/image-seo";

type AnthropicMessageResp = { content: Array<{ type: string; text?: string }> };

export type VisualConcept = {
  prompt:   string;
  filename: string;
  altText:  string;
  title:    string;
  keywords: string[];
};

export type HeroImageResult =
  | {
      kind: "ok";
      url:        string;
      alt:        string;
      prompt:     string;
      filename:   string;
      r2Key:      string;
      bytes:      number;
      exifStatus: "embedded" | "skipped-no-exiftool" | "skipped-error";
    }
  | { kind: "skipped"; reason: string };

const VISUAL_CONCEPT_SYSTEM = `You write image generation prompts for an Ontario wedding directory blog.

Given a blog post title and excerpt, return ONE JSON object with these fields:

{
  "prompt":   "Detailed, photorealistic wedding-scene description for an image generator. Reference real Ontario settings (wineries, lakeside venues, conservation areas, downtown lofts, barns). 25-45 words. Specify lighting and composition.",
  "filename": "kebab-case-seo-filename-without-extension (target keyword + ontario)",
  "altText":  "Concrete 1-sentence description of the image for screen readers + alt tags. 90-120 chars.",
  "title":    "Image title for IPTC/XMP — 30-60 chars, includes target keyword.",
  "keywords": ["ontario wedding", "<3-5 specific topical keywords>"]
}

No markdown fences. No surrounding prose. Just the JSON.`;

export async function extractVisualConcept(opts: {
  title:   string;
  excerpt: string;
}): Promise<VisualConcept> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const client = new Anthropic({ apiKey: key });

  const resp = (await client.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 600,
    system:     VISUAL_CONCEPT_SYSTEM,
    messages:   [
      {
        role: "user",
        content: `Blog post title: ${opts.title}\n\nExcerpt:\n${opts.excerpt}\n\nReturn the JSON now.`,
      },
    ],
  })) as unknown as AnthropicMessageResp;

  const text = resp.content
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
    if (!m) throw new Error("Could not parse visual concept JSON");
    parsed = JSON.parse(m[0]);
  }

  const prompt   = typeof parsed.prompt   === "string" ? parsed.prompt   : "";
  const filename = typeof parsed.filename === "string" ? asciiSlug(parsed.filename) : "";
  const altText  = typeof parsed.altText  === "string" ? parsed.altText  : "";
  const title    = typeof parsed.title    === "string" ? parsed.title    : "";
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.filter((k): k is string => typeof k === "string")
    : [];

  if (!prompt || !filename || !altText) {
    throw new Error("Visual concept JSON missing required fields (prompt/filename/altText)");
  }

  return { prompt, filename, altText, title, keywords };
}

/* ─── OpenAI gpt-image-1 ────────────────────────────────────────── */

async function generateImageBytes(prompt: string): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const fullPrompt =
    `${prompt} Photorealistic wedding photography, 16:9 landscape, ` +
    "cinematic lighting, no text, no watermarks, no faces.";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type":  "application/json",
      authorization:   `Bearer ${key}`,
    },
    body: JSON.stringify({
      model:   "gpt-image-1",
      prompt:  fullPrompt,
      size:    "1536x1024",
      quality: "standard",
      /* gpt-image-1 returns base64 by default — explicit for clarity. */
      response_format: "b64_json",
      n: 1,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI image generation failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = json.data?.[0];
  if (!item) throw new Error("OpenAI image API returned no data");

  if (item.b64_json) return Buffer.from(item.b64_json, "base64");

  /* Fallback path: gpt-image-1 occasionally returns a URL instead. */
  if (item.url) {
    const r = await fetch(item.url, { signal: AbortSignal.timeout(60_000) });
    if (!r.ok) throw new Error(`OpenAI image URL fetch failed: ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error("OpenAI image API returned neither b64_json nor url");
}

/* ─── R2 upload ─────────────────────────────────────────────────── */

function r2Env() {
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
    endpoint:  CLOUDFLARE_R2_ENDPOINT,
    publicUrl: CLOUDFLARE_R2_PUBLIC_URL.replace(/\/+$/, ""),
    creds: {
      accessKeyId:     CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  };
}

/* ─── Main entry point ──────────────────────────────────────────── */

export async function generateAndUploadHeroImage(opts: {
  postSlug: string;
  title:    string;
  excerpt:  string;
}): Promise<HeroImageResult> {
  /* Cred preflight — return skipped (not thrown) so the agent can
   * continue without a hero image. */
  if (!process.env.OPENAI_API_KEY)    return { kind: "skipped", reason: "OPENAI_API_KEY missing" };
  if (!process.env.ANTHROPIC_API_KEY) return { kind: "skipped", reason: "ANTHROPIC_API_KEY missing" };
  const r2 = r2Env();
  if (!r2) return { kind: "skipped", reason: "R2 env vars missing" };

  /* 1. Concept. */
  const concept = await extractVisualConcept({ title: opts.title, excerpt: opts.excerpt });

  /* 2. Render. */
  const rawBytes = await generateImageBytes(concept.prompt);

  /* 3. Metadata strip + embed. exiftool is optional — we proceed with
   *    raw bytes if the binary isn't on PATH. */
  const meta: ExifMeta = {
    title:       concept.title || opts.title,
    description: concept.altText,
    keywords:    concept.keywords.length > 0
      ? concept.keywords
      : ["ontario wedding", "wedding planning"],
    artist:    "Ontario Wedding Vendors",
    copyright: "Ontario Wedding Vendors 2026",
  };
  const tagged = await embedExif(rawBytes, "image/jpeg", meta);
  let bytesToUpload: Buffer;
  let exifStatus: "embedded" | "skipped-no-exiftool" | "skipped-error";
  if (tagged.kind === "ok") {
    bytesToUpload = tagged.buffer;
    exifStatus    = "embedded";
  } else {
    bytesToUpload = rawBytes;
    exifStatus    = tagged.kind === "skipped-no-exiftool" ? "skipped-no-exiftool" : "skipped-error";
  }

  /* 4. Upload. */
  const filename = `${concept.filename}.jpg`;
  const r2Key    = `blog/images/${opts.postSlug}/${filename}`;
  const s3 = new S3Client({
    region:     "auto",
    endpoint:   r2.endpoint,
    credentials: r2.creds,
  });
  await s3.send(new PutObjectCommand({
    Bucket:        r2.bucket,
    Key:           r2Key,
    Body:          bytesToUpload,
    ContentType:   "image/jpeg",
    CacheControl:  "public, max-age=31536000, immutable",
  }));

  return {
    kind:       "ok",
    url:        `${r2.publicUrl}/${r2Key}`,
    alt:        concept.altText,
    prompt:     concept.prompt,
    filename,
    r2Key,
    bytes:      bytesToUpload.byteLength,
    exifStatus,
  };
}
