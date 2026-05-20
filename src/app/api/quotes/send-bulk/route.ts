import { NextResponse } from "next/server";
import { eq, inArray, and, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { quoteRequests, vendors, venues, weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import type { QuoteEmailTemplate } from "../generate-email/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Bulk send a personalised quote-request email — one per vendor —
 * via Brevo's transactional API. Each vendor receives the couple's
 * shared opening + the paragraph for their category + the shared
 * closing + signoff, with {vendorFirstName} substituted.
 *
 * Guardrails (all enforced server-side; the UI mirrors them):
 *   - 15-vendor batch cap (BATCH_CAP)
 *   - in-memory rate limit: 2 batches per session per 10 min
 *   - require weddingDate + venueId on the plan
 *   - skip vendors with no email — reported back as `skipped`
 *   - 30-day dedupe — already-contacted vendors require `force: true`
 *     to send again
 *
 * When BREVO_API_KEY is unset the route returns 503 — the UI surfaces
 * this as "Email delivery isn't configured yet."
 */

const BATCH_CAP = 15;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; /* 10 minutes */
const RATE_LIMIT_MAX_BATCHES = 2;
const DEDUPE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; /* 30 days */

const bodySchema = z.object({
  vendorIds:   z.array(z.number().int().positive()).min(1).max(BATCH_CAP),
  coupleEmail: z.string().email().max(255),
  /* Optional: an edited template overriding the persisted one. The
   * couple's "Edit email" step writes this into the request. */
  template:    z.object({
    opening:            z.string().max(4000),
    categoryParagraphs: z.record(z.string(), z.string().max(4000)),
    closing:            z.string().max(4000),
    signoff:            z.string().max(500),
  }).optional(),
  /* Bypass the 30-day dedupe ("send again?" confirm in the UI). */
  force:       z.boolean().optional(),
});

/* Simple in-memory rate limiter — fine for a single-region Next
 * server. The 2-per-10-minute cap protects the sender domain
 * reputation; revisit when the route moves behind a paywall. */
const recentSends = new Map<string, number[]>();

function rateLimitHit(sessionId: string): boolean {
  const now    = Date.now();
  const window = now - RATE_LIMIT_WINDOW_MS;
  const arr    = (recentSends.get(sessionId) ?? []).filter((t) => t > window);
  if (arr.length >= RATE_LIMIT_MAX_BATCHES) {
    recentSends.set(sessionId, arr);
    return true;
  }
  arr.push(now);
  recentSends.set(sessionId, arr);
  return false;
}

export async function POST(request: Request) {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  /* Brevo env check. Done first so a missing-cred env returns 503
   * before we mutate any DB state or eat a rate-limit slot. */
  const brevoKey    = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName  = process.env.BREVO_SENDER_NAME ?? "Ontario Wedding Vendors";
  if (!brevoKey || !senderEmail) {
    return NextResponse.json(
      { error: "Email delivery isn't configured on this environment yet." },
      { status: 503 },
    );
  }

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

  if (rateLimitHit(sessionId)) {
    return NextResponse.json(
      { error: "Too many batches — wait 10 minutes before sending another batch.", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  /* Load plan + enforce wedding date + venue */
  const [plan] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, sessionId))
    .limit(1);
  if (!plan) {
    return NextResponse.json({ error: "No plan on file" }, { status: 404 });
  }
  if (!plan.weddingDate) {
    return NextResponse.json(
      { error: "Set your wedding date in the planner tab before sending quote requests.", code: "MISSING_DATE" },
      { status: 400 },
    );
  }
  if (plan.venueId == null) {
    return NextResponse.json(
      { error: "Pick a venue in the planner tab before sending quote requests.", code: "MISSING_VENUE" },
      { status: 400 },
    );
  }

  /* Resolve the template — either the override from the request body
   * (the couple edited it) or the cached one on the plan row. */
  let template: QuoteEmailTemplate | null = null;
  if (parsed.data.template) {
    template = { ...parsed.data.template, generatedAt: new Date().toISOString() };
  } else if (plan.quoteEmailTemplate) {
    try { template = JSON.parse(plan.quoteEmailTemplate) as QuoteEmailTemplate; }
    catch { template = null; }
  }
  if (!template) {
    return NextResponse.json(
      { error: "Generate an email preview first.", code: "NO_TEMPLATE" },
      { status: 400 },
    );
  }

  /* Hydrate vendor rows */
  const vRows = await db
    .select({
      id:       vendors.id,
      name:     vendors.name,
      email:    vendors.email,
      category: vendors.category,
      city:     vendors.city,
    })
    .from(vendors)
    .where(inArray(vendors.id, parsed.data.vendorIds));
  const byId = new Map(vRows.map((v) => [v.id, v]));

  /* 30-day dedupe — fetch the most recent quote_request for each
   * vendor in this batch from THIS session. */
  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const recentForSession = parsed.data.force
    ? []
    : await db
        .select({ vendorId: quoteRequests.vendorId, emailSentAt: quoteRequests.emailSentAt })
        .from(quoteRequests)
        .where(
          and(
            eq(quoteRequests.sessionId, sessionId),
            inArray(quoteRequests.vendorId, parsed.data.vendorIds),
            eq(quoteRequests.emailSent, true),
            gt(quoteRequests.emailSentAt, cutoff),
          ),
        );
  const recentlyContacted = new Set(recentForSession.map((r) => r.vendorId));

  /* Pull venue name for the subject line */
  const [venueRow] = await db
    .select({ name: venues.name, city: venues.city })
    .from(venues)
    .where(eq(venues.id, plan.venueId))
    .limit(1);

  const names = [plan.partner1Name, plan.partner2Name].filter(Boolean).join(" & ");
  const subject = `New wedding inquiry from ${names || "a couple"}`;
  let publicUrl: string | null = null;
  if (plan.weddingPublished && plan.weddingSiteSlug && plan.weddingSiteRegionalDomain) {
    publicUrl = `https://${plan.weddingSiteSlug}.${plan.weddingSiteRegionalDomain}`;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

  type Result =
    | { vendorId: number; status: "sent";       email: string }
    | { vendorId: number; status: "no-email";   name: string }
    | { vendorId: number; status: "deduped";    name: string; previousSentAt: string | null }
    | { vendorId: number; status: "no-paragraph"; name: string; category: string | null }
    | { vendorId: number; status: "send-failed"; name: string; error: string }
    | { vendorId: number; status: "unknown" };
  const results: Result[] = [];

  for (const vendorId of parsed.data.vendorIds) {
    const v = byId.get(vendorId);
    if (!v) { results.push({ vendorId, status: "unknown" }); continue; }
    if (!v.email) {
      results.push({ vendorId, status: "no-email", name: v.name });
      continue;
    }
    if (recentlyContacted.has(vendorId)) {
      const prev = recentForSession.find((r) => r.vendorId === vendorId);
      results.push({
        vendorId,
        status: "deduped",
        name: v.name,
        previousSentAt: prev?.emailSentAt?.toISOString() ?? null,
      });
      continue;
    }
    const paragraph = v.category ? template.categoryParagraphs[v.category] : null;
    if (!paragraph) {
      results.push({ vendorId, status: "no-paragraph", name: v.name, category: v.category ?? null });
      continue;
    }

    const firstName = firstNameFromVendor(v.name);
    const opening   = template.opening.replaceAll("{vendorFirstName}", firstName);
    const closing   = template.closing.replaceAll("{vendorFirstName}", firstName);
    const signoff   = template.signoff.replaceAll("{vendorFirstName}", firstName);
    const bodyText = `${opening}\n\n${paragraph}\n\n${closing}\n\n${signoff}`;
    const htmlContent = renderHtml(bodyText, siteUrl, publicUrl);

    let sent = false;
    let sendError: string | null = null;
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method:  "POST",
        headers: {
          "api-key":      brevoKey,
          "content-type": "application/json",
          "accept":       "application/json",
        },
        body: JSON.stringify({
          sender:    { email: senderEmail, name: senderName },
          to:        [{ email: v.email, name: v.name }],
          replyTo:   { email: parsed.data.coupleEmail, name: names || undefined },
          subject,
          htmlContent,
          textContent: bodyText + `\n\n--\nSent via ontarioweddingvendors.com${publicUrl ? `\nWedding website: ${publicUrl}` : ""}`,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        sendError = `brevo ${res.status}: ${errText.slice(0, 300)}`;
      } else {
        sent = true;
      }
    } catch (err) {
      sendError = err instanceof Error ? err.message : String(err);
    }

    await db.insert(quoteRequests).values({
      sessionId,
      vendorId,
      vendorCategory: v.category ?? null,
      vendorEmail:    v.email,
      coupleEmail:    parsed.data.coupleEmail,
      emailSubject:   subject,
      emailBody:      bodyText,
      emailSent:      sent,
      emailSentAt:    sent ? new Date() : null,
      sendError,
    });

    results.push(
      sent
        ? { vendorId, status: "sent", email: v.email }
        : { vendorId, status: "send-failed", name: v.name, error: sendError ?? "unknown" },
    );
  }

  /* Cache the couple's email + stamp the last-batch time on the
   * plan row so the UI can surface it on return visits. */
  await db
    .update(weddingPlans)
    .set({
      coupleEmail:   parsed.data.coupleEmail,
      quotesSentAt:  new Date(),
      updatedAt:     new Date(),
    })
    .where(eq(weddingPlans.sessionId, sessionId));

  const sent      = results.filter((r) => r.status === "sent").length;
  const skipped   = results.filter((r) => r.status === "no-email" || r.status === "deduped" || r.status === "no-paragraph");
  const failed    = results.filter((r) => r.status === "send-failed");

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    failed,
    results,
    venue: venueRow ? `${venueRow.name}${venueRow.city ? ` · ${venueRow.city}` : ""}` : null,
  });
}

/* Vendors often list a business name like "Acme Photography" with no
 * personal name attached. Strip common suffixes and grab the first
 * word; fall back to "there" so the merge doesn't read "Hi ,". */
function firstNameFromVendor(name: string): string {
  const cleaned = name
    .replace(/\b(photography|videography|films|studios?|productions?|events?|weddings?|booth|decor|florals?|catering|cakes?|bakery|hair|makeup|beauty|dj|entertainment|music|limo|transportation|planning|planners?|design|co\.|inc\.|llc|ltd\.?)\b/gi, "")
    .replace(/[^a-zA-Z\s'-]/g, "")
    .trim();
  const first = cleaned.split(/\s+/)[0];
  return first && first.length >= 2 ? first : "there";
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(plainBody: string, siteUrl: string, publicUrl: string | null): string {
  const paragraphs = plainBody
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#2c2c2c;">${htmlEscape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const footer = `
    <p style="margin-top:32px;padding-top:16px;border-top:1px solid #e8d5d9;font-size:11px;color:#6b6b6b;">
      Sent via <a href="${siteUrl}" style="color:#b96476;text-decoration:none;">Ontario Wedding Vendors</a>
      ${publicUrl ? ` — couple's wedding site: <a href="${publicUrl}" style="color:#b96476;text-decoration:none;">${publicUrl.replace(/^https?:\/\//, "")}</a>` : ""}
    </p>`;
  return `<!doctype html><html><body style="background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;margin:0;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;padding:32px;border-radius:12px;border:1px solid #e8d5d9;">
      ${paragraphs}
      ${footer}
    </div>
  </body></html>`;
}
