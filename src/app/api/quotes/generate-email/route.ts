import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/lib/db";
import { venues, weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Generates the 3-part quote-request email template used on
 * /plan/quotes. One opening + one closing (both shared across all
 * recipients), and ONE category paragraph per category present in
 * the shortlist — never per-vendor. The send-bulk endpoint then
 * personalises each outgoing email by stitching:
 *
 *   opening + categoryParagraphs[vendor.category] + closing + signoff
 *
 * The merge token `{vendorFirstName}` is kept literal in the output
 * so the preview UI can highlight it and the send-bulk endpoint can
 * substitute it per vendor.
 */

const SYSTEM = `You are writing a wedding vendor inquiry email on behalf of a young Canadian couple. They will send this to multiple vendors at once, but each vendor will receive a personalised copy.

Tone:
- Warm, second-person, concrete — like a real couple writing, not a marketing template.
- Reference specific plan details (date, venue, region, guest count) so vendors see this is a real wedding, not a mass blast.
- Keep paragraphs short. No emojis. No subject line.

Return ONLY valid JSON in this exact shape — no markdown, no surrounding prose:

{
  "opening":   "<3-4 sentence intro that includes the merge token {vendorFirstName} as a literal placeholder. Cover: who they are, date, venue name + region, guest count.>",
  "categoryParagraphs": {
    "<category-key>": "<2-3 sentence paragraph specific to that vendor category. Be concrete about what they're looking for from this category — e.g. for photographers mention coverage hours and style; for djs mention reception length and music vibe; for florists mention the venue's setting; etc.>"
  },
  "closing":   "<2-3 sentences. Ask for packages and availability for their date. If a website URL is provided in the user prompt, include it as 'You can see more about our wedding here: <url>'. Keep it polite, not pushy.>",
  "signoff":   "<'Warmly,\\n{partner1} & {partner2}' style sign-off using the couple's actual names — no merge tokens here, write the real names.>"
}

The categoryParagraphs object MUST contain exactly one entry per category provided in the user prompt's "categories" list. Use the same category keys back (do not invent or rename them).`;

const bodySchema = z.object({
  /* Categories the couple has shortlisted vendors in — drives which
   * paragraphs Claude generates. */
  categories: z.array(z.string().min(1).max(50)).min(1).max(20),
});

type AnthropicMessageResp = {
  content: Array<{ type: string; text?: string }>;
};

export type QuoteEmailTemplate = {
  opening:            string;
  categoryParagraphs: Record<string, string>;
  closing:            string;
  signoff:            string;
  generatedAt:        string;
};

function safeParseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  photographer:    "wedding photography",
  videographer:    "wedding videography",
  dj:              "DJ + MC for the reception",
  florist:         "florals + venue decor",
  catering:        "wedding catering",
  cake:            "wedding cake + dessert",
  hair_makeup:     "hair & makeup for the wedding party",
  officiant:       "ceremony officiant",
  limo:            "wedding transportation",
  photo_booth:     "photo booth for the reception",
  lighting_decor:  "lighting + decor design",
  wedding_planner: "full or partial wedding planning",
};

export async function POST(request: Request) {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
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

  const [plan] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, sessionId))
    .limit(1);
  if (!plan) {
    return NextResponse.json({ error: "No plan to generate from" }, { status: 404 });
  }

  /* Pull venue context — name + city land in the opening paragraph. */
  let venueName: string | null = null;
  let venueCity: string | null = null;
  if (plan.venueId != null) {
    const [v] = await db
      .select({ name: venues.name, city: venues.city })
      .from(venues)
      .where(eq(venues.id, plan.venueId))
      .limit(1);
    if (v) {
      venueName = v.name ?? null;
      venueCity = v.city ?? null;
    }
  }

  const names = [plan.partner1Name, plan.partner2Name].filter(Boolean).join(" and ");

  /* Optional wedding-website URL — only include if published. */
  let publicUrl: string | null = null;
  if (plan.weddingPublished && plan.weddingSiteSlug && plan.weddingSiteRegionalDomain) {
    publicUrl = `https://${plan.weddingSiteSlug}.${plan.weddingSiteRegionalDomain}`;
  }

  /* Drop any categories the user passed that we don't recognise so
   * the system prompt isn't asked to invent labels. */
  const knownCategories = parsed.data.categories.filter((c) => c in CATEGORY_LABEL);
  if (knownCategories.length === 0) {
    return NextResponse.json({ error: "No recognised vendor categories" }, { status: 400 });
  }

  const categoriesLine = knownCategories
    .map((c) => `${c} (${CATEGORY_LABEL[c]})`)
    .join(", ");

  /* Prefer the couple's own seed story when present — that's the
   * voice we want vendors to hear. The structured fields stay in the
   * prompt as orienting facts (date, venue, guest count) but the
   * story becomes the EMOTIONAL anchor for both the opening and the
   * category paragraphs. When rawStory is empty we fall back to the
   * old structured-only prompt so the route still produces a usable
   * template before the couple has touched the website wizard. */
  const rawStory = plan.rawStory?.trim();
  const hasStory = !!rawStory;

  const userPrompt = hasStory
    ? [
        `Couple: ${names || "Partner A and Partner B"}.`,
        "",
        "The couple's own words — this is the emotional anchor. Use the warmth, specifics, and tone here to shape BOTH the opening (so it sounds like they wrote it) AND the category paragraphs (so each one feels rooted in their actual wedding, not generic). Do NOT quote the story verbatim; let it inform the voice.",
        `"""${rawStory}"""`,
        "",
        "Orienting facts (use these as concrete details inside the email — date, venue, guest count — but keep the emotional weight on the story above):",
        `- Wedding date: ${plan.weddingDate ?? "TBD"}`,
        venueName ? `- Venue: ${venueName}${venueCity ? ` in ${venueCity}` : ""}` : "",
        plan.region     ? `- Region: ${plan.region}` : "",
        plan.guestCount ? `- Expected guests: ${plan.guestCount}` : "",
        publicUrl
          ? `- Wedding website URL (include in the closing): ${publicUrl}`
          : "- No public wedding website yet — don't include a URL in the closing.",
        "",
        `Categories in the shortlist (generate ONE paragraph per category, keyed by these exact keys):`,
        `${categoriesLine}`,
        "",
        "Generate the JSON exactly as specified in the system prompt.",
      ].filter(Boolean).join("\n")
    : [
        `Couple: ${names || "Partner A and Partner B"}.`,
        `Wedding date: ${plan.weddingDate ?? "TBD"}.`,
        venueName ? `Venue: ${venueName}${venueCity ? ` in ${venueCity}` : ""}.` : "",
        plan.region    ? `Region: ${plan.region}.` : "",
        plan.guestCount ? `Expected guest count: ${plan.guestCount}.` : "",
        publicUrl ? `Wedding website URL (include in the closing): ${publicUrl}` : "(No public wedding website yet — don't include a URL in the closing.)",
        "",
        `Categories in the shortlist (generate ONE paragraph per category, keyed by these exact keys):`,
        `${categoriesLine}`,
        "",
        "Generate the JSON exactly as specified in the system prompt.",
      ].filter(Boolean).join("\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let template: QuoteEmailTemplate;

  if (!apiKey) {
    template = fallbackTemplate(knownCategories, names, plan, venueName, venueCity, publicUrl);
  } else {
    try {
      const client = new Anthropic({ apiKey });
      const resp = (await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
      })) as unknown as AnthropicMessageResp;
      const text = resp.content
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("\n");
      const parsedJson = safeParseJson(text);
      if (!parsedJson) {
        console.warn("[quotes/generate-email] Claude returned unparseable JSON — using fallback");
        template = fallbackTemplate(knownCategories, names, plan, venueName, venueCity, publicUrl);
      } else {
        template = {
          opening: typeof parsedJson.opening === "string" ? parsedJson.opening : "",
          categoryParagraphs: coerceParagraphs(parsedJson.categoryParagraphs, knownCategories),
          closing: typeof parsedJson.closing === "string" ? parsedJson.closing : "",
          signoff: typeof parsedJson.signoff === "string" ? parsedJson.signoff : `Warmly,\n${names || "Us"}`,
          generatedAt: new Date().toISOString(),
        };
        /* Any category Claude skipped — fill from the fallback so
         * the send-bulk endpoint never finds a missing paragraph. */
        for (const cat of knownCategories) {
          if (!template.categoryParagraphs[cat]) {
            template.categoryParagraphs[cat] = fallbackParagraph(cat);
          }
        }
      }
    } catch (err) {
      console.error("[quotes/generate-email] Claude call failed:", err);
      template = fallbackTemplate(knownCategories, names, plan, venueName, venueCity, publicUrl);
    }
  }

  /* Persist the template so the preview UI doesn't need to regenerate
   * on every render. Future edits write back to the same column. */
  await db
    .update(weddingPlans)
    .set({ quoteEmailTemplate: JSON.stringify(template), updatedAt: new Date() })
    .where(eq(weddingPlans.sessionId, sessionId));

  return NextResponse.json({ ok: true, template });
}

function coerceParagraphs(v: unknown, categories: string[]): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const r = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const cat of categories) {
    if (typeof r[cat] === "string") out[cat] = r[cat] as string;
  }
  return out;
}

function fallbackTemplate(
  categories: string[],
  names:      string,
  plan:       typeof weddingPlans.$inferSelect,
  venueName:  string | null,
  venueCity:  string | null,
  publicUrl:  string | null,
): QuoteEmailTemplate {
  const venueLine = venueName
    ? `${venueName}${venueCity ? ` in ${venueCity}` : ""}`
    : "our venue";
  const dateLine = plan.weddingDate
    ? new Date(plan.weddingDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : "our wedding date";
  const opening = `Hi {vendorFirstName},\n\nWe're ${names || "a couple"} — we're getting married on ${dateLine} at ${venueLine}${plan.region ? `, ${plan.region}` : ""}.${plan.guestCount ? ` We're expecting around ${plan.guestCount} guests.` : ""} We're starting to lock in vendors and would love to learn more about what you offer.`;

  const categoryParagraphs: Record<string, string> = {};
  for (const cat of categories) categoryParagraphs[cat] = fallbackParagraph(cat);

  const closingLines: string[] = [];
  if (publicUrl) closingLines.push(`You can see more about our wedding here: ${publicUrl}.`);
  closingLines.push("Could you share your packages and availability for our date when you have a moment?");
  closingLines.push("Looking forward to hearing from you.");
  const closing = closingLines.join(" ");

  return {
    opening,
    categoryParagraphs,
    closing,
    signoff:     `Warmly,\n${names || "Us"}`,
    generatedAt: new Date().toISOString(),
  };
}

function fallbackParagraph(cat: string): string {
  switch (cat) {
    case "photographer":    return "We're looking for someone whose work feels natural and unposed — full-day coverage from the morning prep through the first dances. We'd love to see a recent wedding gallery if you have one.";
    case "videographer":    return "We'd love a film that captures the day in real time — vows, speeches, and the room when the dancing starts. A short highlight video plus the full-length cut, if that's something you offer.";
    case "dj":              return "We'll need coverage for the cocktail hour and reception, with a mix that gets the room dancing. Happy to share a 'do play / don't play' list once we're further along.";
    case "florist":         return "We're after a slightly wild, garden-style look — ceremony installation, bridal bouquet, party bouquets, and a few feature pieces for the reception. Specifics flex with your portfolio.";
    case "catering":        return "Plated dinner for our guest count, with at least one vegetarian and one gluten-free option. We're open to a tasting if your schedule allows.";
    case "cake":            return "A 2- or 3-tier cake for the cake cutting, plus a small dessert spread for the late-night table. Open to whatever flavours you're known for.";
    case "hair_makeup":     return "Hair and makeup for the bride plus 3-4 bridesmaids and mothers on the morning of. A trial a few weeks before the wedding, if you offer one.";
    case "officiant":       return "We'd love a short ceremony — around 20 minutes — that feels personal to us. We're happy to write our own vows if you guide the structure.";
    case "limo":            return "Transportation for the wedding party from the prep location to the ceremony, then on to the reception. Maybe a shuttle for guests at the end of the night.";
    case "photo_booth":     return "A photo booth for the reception — open-air style with prints handed out on the spot is what we have in mind. Around 3-4 hours of coverage.";
    case "lighting_decor":  return "Bistro lighting over the dance floor, uplighting on the walls, and maybe a focal-point installation behind the head table. We'll share the venue's floorplan with you.";
    case "wedding_planner": return "We're looking at month-of coordination through the wedding day, with help running the timeline and managing vendors. Open to your full-planning option if it lines up with what we've already started.";
    default:                return "We'd love to learn more about what you offer for weddings — packages, availability, and how you work with couples in our region.";
  }
}
