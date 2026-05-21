/**
 * Brevo send helpers for the daily summary + weekly digest emails.
 *
 * When BREVO_API_KEY isn't set the helpers return a non-fatal
 * `{ sent: false, reason: 'missing-credentials' }` so the cron
 * endpoints can degrade gracefully.
 */

export type EmailSendResult =
  | { sent: true;  brevoMessageId?: string }
  | { sent: false; reason: string };

export async function sendBrevoEmail(opts: {
  to:           Array<{ email: string; name?: string }>;
  subject:      string;
  htmlContent:  string;
  textContent:  string;
  replyTo?:     { email: string; name?: string };
}): Promise<EmailSendResult> {
  const apiKey      = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName  = process.env.BREVO_SENDER_NAME ?? "Ontario Wedding Vendors";
  if (!apiKey || !senderEmail) {
    return { sent: false, reason: "BREVO_API_KEY / BREVO_SENDER_EMAIL missing" };
  }
  if (opts.to.length === 0) {
    return { sent: false, reason: "no recipients" };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key":      apiKey,
        "content-type": "application/json",
        accept:         "application/json",
      },
      body: JSON.stringify({
        sender:      { email: senderEmail, name: senderName },
        to:          opts.to,
        subject:     opts.subject,
        htmlContent: opts.htmlContent,
        textContent: opts.textContent,
        replyTo:     opts.replyTo,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { sent: false, reason: `brevo ${res.status}: ${errText.slice(0, 300)}` };
    }
    const j = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { sent: true, brevoMessageId: j.messageId };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/* ─── Render helpers — used by the two cron endpoints ────────────── */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

export function renderDailySummaryHtml(opts: {
  date:                string;
  publishedToday:      Array<{ slug: string; title: string; wordCount: number | null }>;
  scoutUnusedCount:    number;
  totalPublishedPosts: number;
  imagesGenerated:     number;
  platformsPublished:  string[];
  internalLinksAdded:  number;
}): { subject: string; html: string; text: string } {
  const subject = `OWV Daily Report — ${opts.date}`;

  const postLines = opts.publishedToday.length === 0
    ? "<p>No posts published today.</p>"
    : opts.publishedToday
        .map((p, i) =>
          `<p><strong>Post ${i + 1}:</strong> <a href="${SITE_URL}/blog/${p.slug}">${escapeHtml(p.title)}</a> · ${p.wordCount ?? "?"} words</p>`,
        )
        .join("\n");

  const imageCost = (opts.imagesGenerated * 0.04).toFixed(2);
  const platforms = opts.platformsPublished.length > 0 ? opts.platformsPublished.join(", ") : "(none)";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2c2c2c; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #B96476; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px;">OWV Daily Report — ${opts.date}</h1>
      ${postLines}
      <hr style="border: none; border-top: 1px solid #E8D5D9; margin: 24px 0;">
      <p>Images generated: ${opts.imagesGenerated} × $0.04 = $${imageCost}</p>
      <p>Platforms published to: ${platforms}</p>
      <p>Internal links added: ${opts.internalLinksAdded}</p>
      <p>Total published posts: ${opts.totalPublishedPosts}</p>
      <p>Topics in scout queue (unused): ${opts.scoutUnusedCount}</p>
      <p style="margin-top: 24px; color: #6B6B6B; font-size: 12px;">Ontario Wedding Vendors · automated daily summary</p>
    </div>
  `.trim();

  const text = [
    `OWV Daily Report — ${opts.date}`,
    "",
    ...opts.publishedToday.map((p, i) =>
      `Post ${i + 1}: ${p.title} | ${SITE_URL}/blog/${p.slug} | ${p.wordCount ?? "?"} words`,
    ),
    "",
    `Images generated: ${opts.imagesGenerated} × $0.04 = $${imageCost}`,
    `Platforms: ${platforms}`,
    `Internal links added: ${opts.internalLinksAdded}`,
    `Total posts: ${opts.totalPublishedPosts}`,
    `Scout queue (unused): ${opts.scoutUnusedCount}`,
  ].join("\n");

  return { subject, html, text };
}

export function renderWeeklyDigestHtml(opts: {
  weekStart: string;
  posts: Array<{
    slug:            string;
    title:           string;
    excerpt:         string | null;
    heroImageUrl:    string | null;
    metaDescription: string | null;
  }>;
  unsubscribeToken?: string;
}): { subject: string; html: string; text: string } {
  const subject = `This week on Ontario Wedding Vendors — ${opts.weekStart}`;
  const unsubLink = opts.unsubscribeToken
    ? `${SITE_URL}/newsletter/unsubscribe?token=${opts.unsubscribeToken}`
    : `${SITE_URL}/newsletter/unsubscribe`;

  const postBlocks = opts.posts
    .map((p) => {
      const image = p.heroImageUrl
        ? `<img src="${p.heroImageUrl}" alt="" style="width: 100%; max-width: 560px; height: auto; border-radius: 12px; margin-bottom: 12px;">`
        : "";
      const body = p.excerpt ?? p.metaDescription ?? "";
      return `
        <div style="margin: 32px 0;">
          ${image}
          <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; margin: 0 0 8px;">
            <a href="${SITE_URL}/blog/${p.slug}" style="color: #2c2c2c; text-decoration: none;">${escapeHtml(p.title)}</a>
          </h2>
          <p style="margin: 0 0 8px; line-height: 1.6; color: #6B6B6B;">${escapeHtml(body)}</p>
          <a href="${SITE_URL}/blog/${p.slug}" style="color: #B96476; font-weight: 600;">Read the full guide →</a>
        </div>
      `.trim();
    })
    .join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2c2c2c; max-width: 600px; margin: 0 auto; padding: 16px;">
      <h1 style="color: #B96476; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px;">New this week</h1>
      <p style="color: #6B6B6B;">Ontario wedding planning — fresh guides, real pricing, and the venues couples are booking.</p>
      ${postBlocks}
      <hr style="border: none; border-top: 1px solid #E8D5D9; margin: 32px 0;">
      <p style="color: #6B6B6B; font-size: 12px;">
        You're getting this because you signed up at ontarioweddingvendors.com.
        <a href="${unsubLink}" style="color: #6B6B6B;">Unsubscribe</a>.
      </p>
    </div>
  `.trim();

  const text = [
    `New this week on Ontario Wedding Vendors`,
    "",
    ...opts.posts.map((p) => `${p.title} — ${SITE_URL}/blog/${p.slug}`),
    "",
    `Unsubscribe: ${unsubLink}`,
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
