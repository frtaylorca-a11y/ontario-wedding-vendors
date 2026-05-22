/**
 * Brevo magic-link email. Reuses the same transactional sender as
 * blog-agent / quotes / claim-listing. Subject + body adapt to the
 * intent that triggered the gate so the email feels contextual.
 */
import { sendBrevoEmail } from "./blog-agent/email";
import type { MagicLinkIntent } from "./auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

type IntentCopy = { subject: string; lead: string };

const COPY_BY_INTENT: Record<MagicLinkIntent, IntentCopy> = {
  "save-shortlist": {
    subject: "Save your venue shortlist — Ontario Wedding Vendors",
    lead:    "Tap below to sign in and save the venues you've shortlisted to your wedding plan.",
  },
  "save-budget": {
    subject: "Save your wedding budget — Ontario Wedding Vendors",
    lead:    "Tap below to sign in and save your budget so you can pick up where you left off on any device.",
  },
  "publish-website": {
    subject: "Publish your wedding website — Ontario Wedding Vendors",
    lead:    "Tap below to sign in and publish your wedding site to its custom subdomain.",
  },
  "sign-in": {
    subject: "Sign in to your wedding plan — Ontario Wedding Vendors",
    lead:    "Tap below to sign in to your wedding plan.",
  },
};

export async function sendMagicLinkEmail(opts: {
  email:  string;
  token:  string;
  intent: MagicLinkIntent;
}): Promise<{ sent: boolean; reason?: string }> {
  const url   = `${SITE_URL}/api/auth/verify?token=${encodeURIComponent(opts.token)}`;
  const copy  = COPY_BY_INTENT[opts.intent];

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2c2c2c; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #B96476; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; margin: 0 0 16px;">
        ${copy.subject}
      </h1>
      <p style="font-size: 16px; line-height: 1.55; margin: 0 0 24px;">${copy.lead}</p>
      <p style="margin: 0 0 24px;">
        <a href="${url}" style="display: inline-block; background: #B96476; color: white; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600;">
          Sign in →
        </a>
      </p>
      <p style="color: #6B6B6B; font-size: 13px; line-height: 1.55; margin: 0 0 8px;">
        This link is good for 30 minutes and can only be used once. If you didn't request it, ignore this email — no account will be created.
      </p>
      <p style="color: #6B6B6B; font-size: 12px; word-break: break-all; margin: 16px 0 0;">
        Direct link: ${url}
      </p>
    </div>
  `.trim();

  const text = [
    copy.subject,
    "",
    copy.lead,
    "",
    `Sign in: ${url}`,
    "",
    "This link is good for 30 minutes and can only be used once.",
    "If you didn't request it, ignore this email — no account will be created.",
  ].join("\n");

  const result = await sendBrevoEmail({
    to:          [{ email: opts.email }],
    subject:     copy.subject,
    htmlContent: html,
    textContent: text,
  });
  if (!result.sent) return { sent: false, reason: result.reason };
  return { sent: true };
}
