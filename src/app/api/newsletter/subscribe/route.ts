import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/schema";
import { sendBrevoEmail } from "@/lib/blog-agent/email";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

/* Welcome email — sent on every successful new subscription.
 * Reactivations (re-subscribing after an unsubscribe) DON'T trigger
 * a welcome since they've already had one. Brevo creds missing →
 * sendBrevoEmail returns {sent:false}; we don't fail the request. */
function renderWelcomeEmail(opts: {
  name:             string | null;
  unsubscribeToken: string;
}): { subject: string; html: string; text: string } {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi there,";
  const unsubLink = `${SITE_URL}/api/newsletter/unsubscribe?token=${opts.unsubscribeToken}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2c2c2c; max-width: 600px; margin: 0 auto; padding: 16px;">
      <h1 style="color: #B96476; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; margin-bottom: 8px;">
        You&rsquo;re in.
      </h1>
      <p style="font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 18px; color: #6B6B6B; margin-top: 0;">
        Ontario wedding planning, in your inbox every Sunday.
      </p>
      <p style="line-height: 1.6;">${greeting}</p>
      <p style="line-height: 1.6;">
        Thanks for joining the Ontario Wedding Vendors newsletter. Every
        Sunday morning you&rsquo;ll get one short edition with regional
        venue picks, vendor pricing benchmarks, and the planning tips
        couples actually use.
      </p>
      <p style="line-height: 1.6;">
        While you wait for the first issue, here are three places to
        start:
      </p>
      <ul style="line-height: 1.8;">
        <li><a href="${SITE_URL}/venues" style="color: #B96476;">Browse Ontario wedding venues</a> — 1,200+ filtered by region, capacity, and style.</li>
        <li><a href="${SITE_URL}/plan" style="color: #B96476;">Use the free wedding planner</a> — set a budget, pick a venue, and your vendor list builds itself.</li>
        <li><a href="${SITE_URL}/blog" style="color: #B96476;">Read the blog</a> — cost guides, region picks, and decision frameworks.</li>
      </ul>
      <p style="line-height: 1.6;">
        Welcome aboard.
      </p>
      <hr style="border: none; border-top: 1px solid #E8D5D9; margin: 32px 0;">
      <p style="color: #6B6B6B; font-size: 12px;">
        You&rsquo;re getting this because you signed up at ontarioweddingvendors.com.
        <a href="${unsubLink}" style="color: #6B6B6B;">Unsubscribe</a> anytime — no offense taken.
      </p>
    </div>
  `.trim();

  const text = [
    "You're in.",
    "Ontario wedding planning, in your inbox every Sunday.",
    "",
    greeting,
    "",
    "Thanks for joining the Ontario Wedding Vendors newsletter. Every Sunday morning you'll get one short edition with regional venue picks, vendor pricing benchmarks, and the planning tips couples actually use.",
    "",
    "While you wait for the first issue, here are three places to start:",
    `  Browse Ontario wedding venues — ${SITE_URL}/venues`,
    `  Use the free wedding planner   — ${SITE_URL}/plan`,
    `  Read the blog                  — ${SITE_URL}/blog`,
    "",
    "Welcome aboard.",
    "",
    `Unsubscribe: ${unsubLink}`,
  ].join("\n");

  return { subject: "Welcome to Ontario Wedding Vendors", html, text };
}

const bodySchema = z.object({
  email:  z.string().email().max(255),
  name:   z.string().max(120).optional(),
  region: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { email, name, region } = parsed.data;

  /* If already subscribed, just reactivate (don't regenerate the
   * unsubscribe token — old links should keep working). */
  const [existing] = await db
    .select({ id: newsletterSubscribers.id, isActive: newsletterSubscribers.isActive })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    if (!existing.isActive) {
      await db
        .update(newsletterSubscribers)
        .set({ isActive: true })
        .where(eq(newsletterSubscribers.id, existing.id));
    }
    return NextResponse.json({ ok: true, status: "already-subscribed" });
  }

  const unsubscribeToken = randomBytes(24).toString("hex");
  await db.insert(newsletterSubscribers).values({
    email:            email.toLowerCase(),
    name:             name ?? null,
    region:           region ?? null,
    unsubscribeToken,
    isActive:         true,
  });

  /* Fire welcome email — don't block the response on Brevo. If creds
   * are missing or Brevo 500s, the subscriber is still saved. */
  const welcome = renderWelcomeEmail({ name: name ?? null, unsubscribeToken });
  void sendBrevoEmail({
    to:          [{ email: email.toLowerCase(), name: name ?? undefined }],
    subject:     welcome.subject,
    htmlContent: welcome.html,
    textContent: welcome.text,
  }).catch((err) => {
    console.error("[newsletter/subscribe] welcome email failed:", err);
  });

  return NextResponse.json({ ok: true, status: "subscribed" });
}
