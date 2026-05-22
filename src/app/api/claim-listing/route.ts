import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { vendorClaims } from "@/lib/schema";
import { sendBrevoEmail } from "@/lib/blog-agent/email";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";
/* Where claim-listing alerts go. Falls back to the Brevo sender so
 * we always have a routable destination even before ops sets the var. */
const CLAIM_NOTIFY_TO = process.env.CLAIM_NOTIFY_TO
  ?? process.env.BREVO_SENDER_EMAIL
  ?? "hello@picbooth.ca";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const schema = z.object({
  listingType:   z.enum(["venue", "vendor"]),
  category:      z.string().trim().max(50).optional().nullable(),
  businessName:  z.string().trim().min(2).max(255),
  businessUrl:   z.string().trim().max(500).optional().nullable(),
  claimantName:  z.string().trim().min(2).max(120),
  claimantEmail: z.string().trim().email().max(255),
  claimantPhone: z.string().trim().max(50).optional().nullable(),
  claimantRole:  z.string().trim().max(120).optional().nullable(),
  message:       z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const xff = request.headers.get("x-forwarded-for") ?? "";
  const ipAddress =
    xff.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") ?? null;

  try {
    const [row] = await db
      .insert(vendorClaims)
      .values({
        listingType:    data.listingType,
        category:       data.category ?? null,
        businessName:   data.businessName,
        businessUrl:    data.businessUrl ?? null,
        claimantName:   data.claimantName,
        claimantEmail:  data.claimantEmail,
        claimantPhone:  data.claimantPhone ?? null,
        claimantRole:   data.claimantRole  ?? null,
        message:        data.message       ?? null,
        ipAddress:      ipAddress ? ipAddress.slice(0, 45) : null,
        userAgent,
      })
      .returning({ id: vendorClaims.id });

    /* Notify ops — fire-and-forget. Brevo failures don't block the
     * couple-facing success response (the row is already saved). */
    const claimId = row?.id ?? null;
    const summary = [
      `Listing type:  ${data.listingType}${data.category ? ` (${data.category})` : ""}`,
      `Business:      ${data.businessName}`,
      data.businessUrl ? `Website:       ${data.businessUrl}` : null,
      `Claimant:      ${data.claimantName}${data.claimantRole ? ` — ${data.claimantRole}` : ""}`,
      `Email:         ${data.claimantEmail}`,
      data.claimantPhone ? `Phone:         ${data.claimantPhone}` : null,
      data.message ? `\nMessage:\n${data.message}` : null,
    ].filter(Boolean).join("\n");

    const subject = `[Claim] ${data.listingType}: ${data.businessName}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2c2c2c; max-width: 600px;">
        <h2 style="color: #B96476; font-family: 'Cormorant Garamond', Georgia, serif;">
          New listing claim — #${claimId ?? "?"}
        </h2>
        <table style="border-collapse: collapse; margin-top: 12px;">
          <tr><td style="padding: 4px 12px 4px 0; color: #6B6B6B;">Type</td><td><strong>${escapeHtml(data.listingType)}${data.category ? ` (${escapeHtml(data.category)})` : ""}</strong></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6B6B6B;">Business</td><td><strong>${escapeHtml(data.businessName)}</strong></td></tr>
          ${data.businessUrl ? `<tr><td style="padding: 4px 12px 4px 0; color: #6B6B6B;">Website</td><td><a href="${escapeHtml(data.businessUrl)}">${escapeHtml(data.businessUrl)}</a></td></tr>` : ""}
          <tr><td style="padding: 4px 12px 4px 0; color: #6B6B6B;">Claimant</td><td>${escapeHtml(data.claimantName)}${data.claimantRole ? ` <span style="color: #6B6B6B;">— ${escapeHtml(data.claimantRole)}</span>` : ""}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #6B6B6B;">Email</td><td><a href="mailto:${escapeHtml(data.claimantEmail)}">${escapeHtml(data.claimantEmail)}</a></td></tr>
          ${data.claimantPhone ? `<tr><td style="padding: 4px 12px 4px 0; color: #6B6B6B;">Phone</td><td>${escapeHtml(data.claimantPhone)}</td></tr>` : ""}
        </table>
        ${data.message ? `<p style="margin-top: 16px; padding: 12px; background: #FDF5F7; border-left: 3px solid #B96476; white-space: pre-wrap;">${escapeHtml(data.message)}</p>` : ""}
        <p style="margin-top: 20px; font-size: 12px; color: #6B6B6B;">
          Submitted from ${SITE_URL} · IP ${ipAddress ?? "unknown"}
        </p>
      </div>
    `.trim();

    void sendBrevoEmail({
      to:          [{ email: CLAIM_NOTIFY_TO }],
      subject,
      htmlContent: html,
      textContent: `New listing claim — #${claimId ?? "?"}\n\n${summary}\n\nSubmitted from ${SITE_URL}`,
      replyTo:     { email: data.claimantEmail, name: data.claimantName },
    }).catch((err) => {
      console.error("[claim-listing] notify email failed:", err);
    });

    return NextResponse.json({ ok: true, claimId });
  } catch (err) {
    console.error("[claim-listing] insert failed:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
