/**
 * Category relevance check via claude-haiku-4-5.
 *
 * Given a vendor's website content (first ~1000 chars) and the
 * category we have them filed under, return a structured verdict on
 * whether the page actually describes a business that provides that
 * category of wedding/event service.
 *
 * Used by:
 *   - scripts/enrich-vendor-bios.ts — runs before bio generation
 *   - scripts/find-vendor-websites.ts — runs after website discovery
 *     to confirm the match before persisting
 *   - scripts/validate-vendor-categories.ts — standalone audit pass
 *
 * Cost: ~$0.0002 per call (haiku-4-5, ~700 input + 100 output tokens).
 */
import Anthropic from "@anthropic-ai/sdk";

export type RelevanceConfidence = "high" | "medium" | "low";

export type RelevanceVerdict = {
  isRelevant:     boolean;
  /* When isRelevant is false, the model's best guess at what the
   * business actually does. May be null when the model can't tell. */
  actualCategory: string | null;
  confidence:     RelevanceConfidence;
  reason:         string;
};

/* Friendly label per category — feeds the prompt so claude sees
 * 'wedding DJ services' rather than the raw enum string 'dj'. */
const CATEGORY_LABEL: Record<string, string> = {
  photographer:    "wedding photographer (event photography services)",
  videographer:    "wedding videographer (event videography services)",
  dj:              "wedding DJ (mobile disc jockey services, music + MC for weddings/events)",
  florist:         "wedding florist (bouquets, centrepieces, ceremony florals)",
  photo_booth:     "photo booth rental for weddings/events",
  catering:        "wedding caterer (food + beverage for weddings/events)",
  cake:            "wedding cake designer / bakery for weddings",
  hair_makeup:     "wedding hair stylist and/or makeup artist (bridal beauty)",
  officiant:       "wedding officiant / minister / celebrant for weddings",
  limo:            "wedding transportation (limousine, party bus, vintage car rental)",
  lighting_decor:  "wedding lighting & decor (uplighting, drape, installations)",
  wedding_planner: "wedding planner / coordinator / event planner",
};

const SYSTEM_PROMPT = `You audit Ontario wedding-vendor directory listings for category accuracy.

Given a snippet of a business's website AND the category the directory has them filed under, decide whether the website actually describes a business that provides THAT category of wedding/event service.

You will see businesses with deceptive names — "Rocket Fireworks" filed as a DJ, "Tim's Plumbing" filed as a caterer, dental clinics filed as photographers because of similar names. Be strict.

Return ONE JSON object with these exact keys. No markdown fences. No surrounding prose.

{
  "is_relevant":     true | false,
  "actual_category": "<best-guess category slug if not relevant — use one of: photographer, videographer, dj, florist, photo_booth, catering, cake, hair_makeup, officiant, limo, lighting_decor, wedding_planner, OR a short free-text label like 'fireworks retailer' / 'plumber' / 'auto repair'. Use null only when truly unable to tell.>",
  "confidence":      "high" | "medium" | "low",
  "reason":          "<one short sentence — what in the website made you decide>"
}

Confidence rubric:
  high   — the website is unambiguous (clear product/service language matching or contradicting the category)
  medium — directionally clear but some signal could go either way
  low    — too little text, parked domain, generic landing page, multi-service business`;

type AnthropicMessageResp = { content: Array<{ type: string; text?: string }> };

function safeParseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try { return JSON.parse(cleaned); }
  catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
    return null;
  }
}

/* Single-call relevance check. Returns null when the API can't be
 * reached or returns unparseable JSON — callers should treat null
 * as "don't change anything" (fail-open, never auto-hide on error). */
export async function classifyCategoryRelevance(opts: {
  vendorName:      string;
  category:        string;
  websiteContent:  string;   /* will be truncated to 1000 chars */
}): Promise<RelevanceVerdict | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const snippet = (opts.websiteContent ?? "").slice(0, 1000).trim();
  if (snippet.length < 40) {
    /* Too thin to judge — return low-confidence relevant so we don't
     * auto-hide on parked-domain rows. */
    return {
      isRelevant: true,
      actualCategory: null,
      confidence: "low",
      reason: "website content too short to evaluate",
    };
  }

  const categoryLabel = CATEGORY_LABEL[opts.category] ?? opts.category;
  const user = [
    `Business name: ${opts.vendorName}`,
    `Directory category: ${opts.category} (${categoryLabel})`,
    "",
    "Website snippet (first 1000 chars):",
    `"""${snippet}"""`,
    "",
    "Return the JSON now.",
  ].join("\n");

  const client = new Anthropic({ apiKey });
  let text: string;
  try {
    const resp = (await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 400,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: user }],
    })) as unknown as AnthropicMessageResp;
    text = resp.content
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n");
  } catch (err) {
    console.warn(`[relevance] Claude call failed for ${opts.vendorName}:`,
      err instanceof Error ? err.message : err);
    return null;
  }

  const parsed = safeParseJson(text);
  if (!parsed) {
    console.warn(`[relevance] unparseable JSON for ${opts.vendorName}`);
    return null;
  }

  const isRelevant = parsed.is_relevant === true;
  const confidence = (parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low")
    ? parsed.confidence
    : "low";
  const actualCategory = typeof parsed.actual_category === "string"
    ? parsed.actual_category.trim() || null
    : null;
  const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";

  return { isRelevant, actualCategory, confidence, reason };
}

/* Decide what to do with a verdict — encapsulated here so the three
 * callers stay consistent.
 *
 *   high-confidence NOT relevant  → hide + flag for review
 *   medium-confidence NOT relevant → flag for review, keep visible
 *   low confidence OR relevant     → no change
 */
export type RelevanceAction =
  | { kind: "hide";   reason: string; actualCategory: string | null }
  | { kind: "flag";   reason: string; actualCategory: string | null }
  | { kind: "ok" };

export function actionForVerdict(verdict: RelevanceVerdict | null): RelevanceAction {
  if (!verdict) return { kind: "ok" };
  if (verdict.isRelevant) return { kind: "ok" };

  if (verdict.confidence === "high") {
    return {
      kind:           "hide",
      reason:         verdict.reason,
      actualCategory: verdict.actualCategory,
    };
  }
  if (verdict.confidence === "medium") {
    return {
      kind:           "flag",
      reason:         verdict.reason,
      actualCategory: verdict.actualCategory,
    };
  }
  /* low confidence + not relevant — don't act; the signal isn't strong
   * enough to either hide OR flag without creating false-positive noise. */
  return { kind: "ok" };
}
