import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { venues, weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { newId, type GeneratedCopy, type FaqItem, type ThingsToDoItem } from "@/lib/wedding-website";
import { defaultThingsToDo } from "@/lib/things-to-do";
import { TYPOGRAPHY_BY_ID, defaultTypographyForTheme } from "@/lib/wedding-typography";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Claude-generates the editorial copy for a couple's wedding site.
 *
 * Output is persisted to wedding_plans.wedding_generated_copy as a
 * GeneratedCopy blob. The editor surfaces it as suggestions the couple
 * can accept (writes into the real columns) or ignore. */

const SYSTEM = `You are writing copy for a young Canadian couple's wedding website.

Tone:
- Warm, second-person ("you and your guests"), never marketing-speak.
- Concrete and specific to the venue + region — no generic platitudes.
- A young couple wrote it, not a brand. Light, sincere, slightly understated.

Return ONLY valid JSON with this exact shape — no surrounding prose, no markdown fences:

{
  "heroTagline":   "<6–10 word phrase under the names, e.g. 'A Niagara wedding in the vineyards'>",
  "ourStory":      "<150–220 word first-person paragraph in the voice of the couple. Mention how they met, the proposal, why this venue.>",
  "travelCopy":    "<80–120 words. Best hotels near the venue, parking note, shuttle suggestion if relevant.>",
  "dressCopyHint": "<25–40 words. Suggested dress code given venue + season. E.g. 'Cocktail attire — the ceremony is outdoors so flat shoes recommended.'>",
  "thingsToDo":    [ { "name": "...", "description": "<70-90 words>", "url": "<optional>" } ],   /* exactly 3 items */
  "faqItems":      [ { "question": "...", "answer": "..." } ]                                    /* exactly 5 items */
}`;

type AnthropicMessageResp = {
  content: Array<{ type: string; text?: string }>;
};

function safeParseJson(raw: string): Record<string, unknown> | null {
  /* Strip code fences if Claude wrapped despite the system prompt. */
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* One more try — find the first { ... } block. */
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

function coerceThings(v: unknown): ThingsToDoItem[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 4).map((entry) => {
    const r = entry as Record<string, unknown>;
    return {
      id:          newId(),
      name:        typeof r.name === "string" ? r.name : "",
      description: typeof r.description === "string" ? r.description : "",
      url:         typeof r.url === "string" ? r.url : undefined,
    };
  }).filter((t) => t.name && t.description);
}

function coerceFaq(v: unknown): FaqItem[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 6).map((entry) => {
    const r = entry as Record<string, unknown>;
    return {
      id:       newId(),
      question: typeof r.question === "string" ? r.question : "",
      answer:   typeof r.answer === "string" ? r.answer : "",
    };
  }).filter((f) => f.question && f.answer);
}

export async function POST() {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const [plan] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, sessionId))
    .limit(1);

  if (!plan) {
    return NextResponse.json({ error: "No plan to generate from" }, { status: 404 });
  }

  /* Free tier: 3 generations included. Premium: unlimited. The free
   * count + tier are stored on the plan row — the editor reads the
   * same values to show the counter / unlock state, so we don't need
   * a separate "quota" table. */
  const FREE_LIMIT = 3;
  const tier = plan.tier ?? "free";
  const count = plan.weddingGenerationCount ?? 0;
  if (tier !== "premium" && count >= FREE_LIMIT) {
    return NextResponse.json(
      {
        error:     "Free generation limit reached",
        code:      "GENERATION_LIMIT",
        used:      count,
        limit:     FREE_LIMIT,
        upgradeTo: "premium",
      },
      { status: 402 }, /* 402 Payment Required reads correctly for this */
    );
  }

  /* Pull venue context — name/city drive most of the copy. */
  let venueContext = "";
  if (plan.venueId != null) {
    const [v] = await db
      .select({
        name:      venues.name,
        city:      venues.city,
        venueType: venues.venueType,
        region:    venues.region,
      })
      .from(venues)
      .where(eq(venues.id, plan.venueId))
      .limit(1);
    if (v) {
      venueContext = `Venue: ${v.name ?? "TBD"} in ${v.city ?? plan.region ?? "Ontario"} (${v.venueType ?? "venue"}).`;
    }
  }

  const names = [plan.partner1Name, plan.partner2Name].filter(Boolean).join(" and ");
  const dateLine = plan.weddingDate ? `Wedding date: ${plan.weddingDate}.` : "";
  const guestLine = plan.guestCount ? `Expected guest count: ${plan.guestCount}.` : "";
  const regionLine = plan.region ? `Region: ${plan.region}.` : "";

  /* Steer tone via the typography choice — the visual feel and the
   * copy voice should match. */
  const typoId = plan.weddingTypographyStyle ?? defaultTypographyForTheme(plan.weddingTheme);
  const typo = TYPOGRAPHY_BY_ID[typoId];
  const toneLine = typo ? `Visual feel: ${typo.label}. ${typo.promptHint}` : "";

  const userPrompt = [
    `Couple: ${names || "Partner A and Partner B"}.`,
    venueContext,
    dateLine,
    guestLine,
    regionLine,
    toneLine,
    "",
    "Generate the wedding-website copy as specified in the system prompt.",
  ].filter(Boolean).join("\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let generated: GeneratedCopy;

  if (!apiKey) {
    /* No key — return the deterministic fallback so the UI flow still works
     * end-to-end during local dev. */
    console.warn("[wedding-website/generate] ANTHROPIC_API_KEY missing — using fallback");
    generated = fallbackCopy(plan.region, names);
  } else {
    try {
      const client = new Anthropic({ apiKey });
      const resp = (await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2400,
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
      })) as unknown as AnthropicMessageResp;

      const text = resp.content
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("\n");

      const parsed = safeParseJson(text);
      if (!parsed) {
        console.warn("[wedding-website/generate] Claude returned unparseable JSON — falling back");
        generated = fallbackCopy(plan.region, names);
      } else {
        generated = {
          heroTagline:   typeof parsed.heroTagline   === "string" ? parsed.heroTagline   : undefined,
          ourStory:      typeof parsed.ourStory      === "string" ? parsed.ourStory      : undefined,
          travelCopy:    typeof parsed.travelCopy    === "string" ? parsed.travelCopy    : undefined,
          dressCopyHint: typeof parsed.dressCopyHint === "string" ? parsed.dressCopyHint : undefined,
          thingsToDo:    coerceThings(parsed.thingsToDo),
          faqItems:      coerceFaq(parsed.faqItems),
          generatedAt:   new Date().toISOString(),
        };
      }
    } catch (err) {
      console.error("[wedding-website/generate] Claude call failed:", err);
      generated = fallbackCopy(plan.region, names);
    }
  }

  /* Persist alongside the editable fields so the editor can show
   * "AI suggested" preview chips next to each input. Increment the
   * generation counter in the same write — the counter is part of
   * the free-tier quota check at the top of this handler. */
  await db
    .update(weddingPlans)
    .set({
      weddingGeneratedCopy:     generated,
      weddingGenerationCount: (count ?? 0) + 1,
      updatedAt:                new Date(),
    })
    .where(eq(weddingPlans.sessionId, sessionId));

  const remaining = tier === "premium" ? null : Math.max(0, FREE_LIMIT - (count + 1));
  return NextResponse.json({ ok: true, generated, remaining, tier });
}

function fallbackCopy(region: string | null, names: string): GeneratedCopy {
  const things = defaultThingsToDo(region).slice(0, 3);
  return {
    heroTagline: "An Ontario wedding to remember",
    ourStory:
      `We're so excited to celebrate with you. ${names || "The two of us"} have been planning this for a while, and we can't wait to share the day with our favourite people. More of our story is coming soon — for now, save the date and tell us you're coming.`,
    travelCopy:
      "We'll add a hotel block, parking details, and a shuttle suggestion here closer to the date. If you're flying in, the nearest airport is the best starting point — we'll list the best routes once we know who's travelling.",
    dressCopyHint:
      "Dress code: Cocktail attire. The ceremony is partially outdoors — flat or block-heel shoes are a good call.",
    thingsToDo: things,
    faqItems: [
      { id: newId(), question: "When should I RSVP by?",                  answer: "Please RSVP at least 6 weeks before the wedding so we can finalize the seating chart and meals with the venue." },
      { id: newId(), question: "Are kids welcome?",                       answer: "We love your little ones — but this is an adults-only celebration. Reach out if you need help with childcare suggestions in the area." },
      { id: newId(), question: "Will there be vegetarian/gluten-free options?", answer: "Yes — the venue's catering team will offer vegetarian, gluten-free, and other accommodations. Let us know in your RSVP." },
      { id: newId(), question: "Is there parking at the venue?",          answer: "Yes, free on-site parking is available. We'll also share details about a shuttle option closer to the date." },
      { id: newId(), question: "Can I bring a plus-one?",                 answer: "Your invitation will specify whether a plus-one is included. If you'd like to bring someone, please reach out directly." },
    ],
    generatedAt: new Date().toISOString(),
  };
}
