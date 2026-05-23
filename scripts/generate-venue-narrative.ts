/**
 * Venue narrative generation — step 3 of deep-capture.
 *
 * After extract-venue-deepcapture.ts fills deep_capture with raw facts,
 * this script asks claude-haiku-4-5 to write a SHORT, fact-dense paragraph
 * + 3-5 highlight bullets grounded ONLY in the extracted JSON values.
 *
 * The model never sees the raw_site_text — the input is the filled
 * deep_capture facts only, by design. Two consequences:
 *   - No risk of copying the venue's marketing prose.
 *   - Every sentence is verifiable against a structured value the
 *     pipeline already extracted (no hallucination beyond the data).
 *
 * Output is merged back into deep_capture.narrative — leaves the rest
 * of the deep_capture object intact.
 *
 * CLI:
 *   npx tsx scripts/generate-venue-narrative.ts                 # dry-run
 *   npx tsx scripts/generate-venue-narrative.ts --limit 10
 *   npx tsx scripts/generate-venue-narrative.ts --confirm
 *   npx tsx scripts/generate-venue-narrative.ts --confirm --rerun
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { venues } from "../src/lib/schema";

const MODEL              = "claude-haiku-4-5";
const PER_VENUE_PAUSE_MS = 200;
const DEFAULT_LIMIT      = Number.MAX_SAFE_INTEGER;

type Args = { limit: number; confirm: boolean; rerun: boolean };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let limit   = DEFAULT_LIMIT;
  let confirm = false;
  let rerun   = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--confirm") confirm = true;
    else if (a === "--dry-run") confirm = false;
    else if (a === "--rerun") rerun = true;
    else if (a === "--limit") {
      const n = parseInt(argv[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = parseInt(a.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { limit, confirm, rerun };
}

const SYSTEM_PROMPT = `Write original directory copy for a wedding venue using ONLY the structured facts provided.
Do not copy phrasing from any source. Do not state any fact not in the data. No fluff, no "perfect partner for your dream day" clichés. Every sentence must contain a concrete fact (capacity, price, space, location, policy). One paragraph (60-90 words) + 3-5 one-line highlights.

Return a SINGLE JSON object — no markdown, no code fences:
{
  "about":      "<one paragraph, 60-90 words>",
  "highlights": ["<bullet 1>", "<bullet 2>", "<bullet 3>"]
}`;

function safeParseJson(raw: string): { about?: string; highlights?: string[] } | null {
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

type NarrativeResult = { about: string; highlights: string[] };

async function generateOne(
  client:        Anthropic,
  name:          string,
  city:          string | null,
  region:        string | null,
  deepCapture:   Record<string, unknown>,
): Promise<NarrativeResult | null> {
  /* Strip the existing narrative + _meta from the input so the model
   * focuses on facts, not pipeline state. */
  const facts: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(deepCapture)) {
    if (k === "narrative" || k === "_meta") continue;
    facts[k] = v;
  }

  const user = [
    `VENUE: ${name} — ${city ?? "?"}, ${region ?? "?"}, Ontario`,
    "",
    "FACTS (only these may inform the copy — every value carries {value, confidence, source}):",
    JSON.stringify(facts, null, 2),
  ].join("\n");

  let res;
  try {
    res = await client.messages.create({
      model:      MODEL,
      max_tokens: 600,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: user }],
    });
  } catch (err) {
    console.warn(`  [claude error] ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const text = res.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const parsed = safeParseJson(text);
  if (!parsed) return null;

  const about      = typeof parsed.about === "string" ? parsed.about.trim() : null;
  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights.filter((s): s is string => typeof s === "string").map((s) => s.trim()).filter(Boolean)
    : [];
  if (!about || about.length < 20) return null;
  return { about, highlights };
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set."); process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  /* Targets: rows that have a deep_capture object AND no narrative yet,
   * unless --rerun says we want to regenerate. */
  const noNarrativeFilter = sql`(${venues.deepCapture} -> 'narrative' -> 'about' ->> 'value') IS NULL`;
  const filter = and(
    isNotNull(venues.deepCaptureAt),
    isNotNull(venues.deepCapture),
    args.rerun ? undefined : noNarrativeFilter,
  );

  const rows = await db
    .select({
      id:          venues.id,
      slug:        venues.slug,
      name:        venues.name,
      city:        venues.city,
      region:      venues.region,
      deepCapture: venues.deepCapture,
    })
    .from(venues)
    .where(filter as ReturnType<typeof and>)
    .orderBy(venues.id)
    .limit(args.limit);

  console.log(`Mode: ${args.confirm ? "WRITE" : "DRY-RUN"}`);
  console.log(`Candidates: ${rows.length}\n`);

  let ok = 0, failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i];
    const dc = (v.deepCapture as Record<string, unknown> | null) ?? {};
    const out = await generateOne(client, v.name, v.city, v.region, dc);

    if (!out) {
      failed++;
      console.log(`  [${i + 1}/${rows.length}] FAIL ${v.slug}`);
      await sleep(PER_VENUE_PAUSE_MS);
      continue;
    }
    ok++;

    const merged: Record<string, unknown> = { ...dc };
    merged.narrative = {
      about:      { value: out.about,      confidence: "medium", source: "generated" },
      highlights: { value: out.highlights, confidence: "medium", source: "generated" },
    };

    console.log(`  [${i + 1}/${rows.length}] OK   ${v.slug}  · ${out.highlights.length} bullets`);

    if (args.confirm) {
      await db
        .update(venues)
        .set({ deepCapture: merged, updatedAt: new Date() })
        .where(eq(venues.id, v.id));
    } else if (i < 3) {
      /* Dry-run preview — first 3 venues */
      console.log(`     about: ${out.about.slice(0, 220)}${out.about.length > 220 ? "…" : ""}`);
      for (const h of out.highlights) console.log(`       • ${h}`);
    }

    await sleep(PER_VENUE_PAUSE_MS);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Generated: ${ok}`);
  console.log(`Failed:    ${failed}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
