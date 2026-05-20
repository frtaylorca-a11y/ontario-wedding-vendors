import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/* Wizard Step 3 — couple uploads their own hero photo. File goes to
 * Cloudflare R2 at weddings/[slug]/hero.[ext]; the public URL is then
 * persisted to wedding_plans.wedding_hero_image. The same pattern is
 * used by scripts/upgrade-vendor-photos.ts on the vendor side. */

const MAX_BYTES = 8 * 1024 * 1024; /* 8 MB */

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  /* R2 env check — fail fast with a helpful message rather than a
   * cryptic AWS SDK error if creds aren't configured for this env. */
  const {
    CLOUDFLARE_R2_BUCKET:      bucket,
    CLOUDFLARE_R2_ACCESS_KEY_ID: accessKeyId,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: secretAccessKey,
    CLOUDFLARE_R2_ENDPOINT:    endpoint,
    CLOUDFLARE_R2_PUBLIC_URL:  publicUrlBase,
  } = process.env;
  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint || !publicUrlBase) {
    return NextResponse.json(
      { error: "Image uploads aren't configured on this environment yet." },
      { status: 503 },
    );
  }

  /* Pull the slug — we key the R2 path off it so the same couple's
   * re-upload overwrites the prior file. */
  const [plan] = await db
    .select({ slug: weddingPlans.weddingSiteSlug })
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, sessionId))
    .limit(1);
  if (!plan?.slug) {
    return NextResponse.json(
      { error: "Your wedding URL hasn't been minted yet — pick a venue + names in the planner tab first." },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported file type — use JPG, PNG, or WebP." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large — max ${MAX_BYTES / (1024 * 1024)} MB.` },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = `weddings/${plan.slug}/hero.${ext}`;

  const s3 = new S3Client({
    region:     "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    await s3.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        buf,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }));
  } catch (err) {
    console.error("[upload-hero] R2 PUT failed:", err);
    return NextResponse.json({ error: "Upload failed — try again in a moment." }, { status: 500 });
  }

  /* Cache-bust on the URL so a re-upload doesn't keep serving the old
   * image off the CDN edge for the couple's own preview. */
  const url = `${publicUrlBase.replace(/\/$/, "")}/${key}?v=${Date.now()}`;
  await db
    .update(weddingPlans)
    .set({ weddingHeroImage: url, updatedAt: new Date() })
    .where(eq(weddingPlans.sessionId, sessionId));

  return NextResponse.json({ ok: true, url });
}
