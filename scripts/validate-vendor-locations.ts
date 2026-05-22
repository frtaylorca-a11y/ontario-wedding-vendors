/**
 * Location validator — catches vendors who are listed as Ontario-
 * based but actually operate from outside the province (e.g. Brittany
 * Ford Photography filed under Picton, ON but with a 716 Buffalo
 * NY phone number and a Picton, NY address).
 *
 * Two-stage pipeline:
 *
 *   Stage 1 — cheap heuristics (free):
 *     - Phone area code NOT in ONTARIO_AREA_CODES
 *     - Province field NOT in {ON, Ontario}
 *     - City NOT in the canonical Ontario REGION_MAP keys
 *     - Address text contains a US state abbreviation
 *
 *   A row that passes ALL heuristics is assumed Ontario. Skip
 *   immediately — no Claude call.
 *
 *   Stage 2 — Claude verdict (only on rows that fail at least one
 *             heuristic):
 *     Send name + city + phone + website + address to claude-haiku-4-5
 *     with a strict-JSON prompt that returns:
 *       { is_ontario_based, actual_location, serves_ontario,
 *         confidence, reason }
 *
 *   Action matrix:
 *     is_ontario_based = true  → no action (false positive on heuristics)
 *     not Ontario AND serves_ontario = true:
 *       → keep visible, set needs_manual_review = true
 *         (an operator decides whether to relocate the row, since
 *         actual_location may not be in our regions schema)
 *     not Ontario AND serves_ontario = false:
 *       → hide with hidden_reason = 'outside_ontario'
 *     Claude confidence = low → skip (don't trust the verdict)
 *
 * Cost: ~$0.001 per Claude call. Stage-1 pre-filter typically gates
 * the pool to ~500 vendors → ~$0.50 total.
 *
 * CLI:
 *   npx tsx scripts/validate-vendor-locations.ts                # dry-run
 *   npx tsx scripts/validate-vendor-locations.ts --limit 50     # smoke
 *   npx tsx scripts/validate-vendor-locations.ts --confirm      # apply
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { REGION_MAP } from "../src/lib/regions";
import {
  extractAreaCode,
  ONTARIO_AREA_CODES,
  TOLL_FREE_AREA_CODES,
} from "../src/lib/ontario-phone-codes";

const PER_CALL_DELAY_MS  = 300;
const COST_PER_CHECK_USD = 0.001;

/* Cities that ARE in Ontario but don't (yet) have a region page in
 * REGION_MAP. The region-map controls URL routing for /cities/[slug];
 * this set is purely the location-validator's "is this an Ontario
 * city?" allowlist. Anything here is recognised as valid Ontario and
 * NOT flagged as unknown_city by the heuristic. Add freely. */
const ADDITIONAL_ONTARIO_CITIES = new Set<string>([
  /* GTA + Toronto former-municipalities */
  "etobicoke", "north-york", "scarborough", "york", "east-york",
  "whitchurch-stouffville", "stouffville", "georgina", "uxbridge",
  "clarington", "bowmanville", "innisfil", "bradford",
  /* Halton / Peel additional */
  "georgetown", "acton", "erin", "orangeville",
  /* Hamilton-adjacent */
  "stoney-creek", "dundas", "binbrook", "flamborough",
  /* Niagara additional (display variants only — most already in REGION_MAP) */
  "queenston", "st-davids",
  /* Cottage Country additional */
  "wasaga-beach", "port-carling", "parry-sound", "muskoka-lakes",
  /* Waterloo / Wellington additional */
  "paris", "rockwood", "arthur",
  /* Southwestern additional */
  "simcoe", "tillsonburg", "leamington", "ingersoll", "kincardine",
  "goderich", "owen-sound", "port-hope",
  /* Northern Ontario */
  "sudbury", "greater-sudbury", "thunder-bay", "timmins",
  "sault-ste-marie", "sault-ste.-marie", "north-bay",
  "elliot-lake", "kapuskasing",
  /* Eastern additional */
  "kawartha-lakes", "lindsay", "trenton", "quinte-west",
  "smiths-falls", "perth", "brockville", "cornwall",
  "pembroke", "renfrew", "carleton-place",
  /* Prince Edward County additional */
  "wellington", "consecon",
]);

/* Reverse the city slugs in REGION_MAP + ADDITIONAL_ONTARIO_CITIES
 * into a set we can match against the raw city string. Both the slug
 * ("niagara-on-the-lake") and a normalized version of the display
 * name ("niagara on the lake") are accepted. */
const ONTARIO_CITY_SET = (() => {
  const s = new Set<string>();
  const addBoth = (slug: string) => {
    s.add(slug);
    s.add(slug.replace(/-/g, " "));
    /* Strip any non-letter punctuation so "sault-ste.-marie" also
     * matches the cleaner "sault ste marie" form. */
    const clean = slug.replace(/[^a-z0-9-]/g, "");
    if (clean !== slug) {
      s.add(clean);
      s.add(clean.replace(/-/g, " "));
    }
  };
  for (const slug of Object.keys(REGION_MAP)) addBoth(slug);
  for (const slug of ADDITIONAL_ONTARIO_CITIES) addBoth(slug);
  return s;
})();

function cityIsKnownOntario(city: string | null): boolean {
  if (!city) return false;
  const norm = city.toLowerCase().trim();
  if (ONTARIO_CITY_SET.has(norm)) return true;
  /* slug variant — strip punctuation, collapse whitespace */
  const slugLike = norm.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  return ONTARIO_CITY_SET.has(slugLike);
}

/* US state abbreviations / names that might appear in an address.
 * Conservative list — only the strong indicators. */
const US_STATE_TOKENS = [
  /\bNY\b/i,  /\bNew York\b/i,
  /\bCA\b/i,  /\bCalifornia\b/i,
  /\bFL\b/i,  /\bFlorida\b/i,
  /\bMI\b/i,  /\bMichigan\b/i,
  /\bOH\b/i,  /\bOhio\b/i,
  /\bPA\b/i,  /\bPennsylvania\b/i,
  /\bIL\b/i,  /\bIllinois\b/i,
  /\bTX\b/i,  /\bTexas\b/i,
  /\bMA\b/i,  /\bMassachusetts\b/i,
  /\bNJ\b/i,  /\bNew Jersey\b/i,
  /\bWA\b/i,  /\bWashington\b/i,
];

function addressHasUSState(address: string | null): boolean {
  if (!address) return false;
  for (const re of US_STATE_TOKENS) if (re.test(address)) return true;
  return false;
}

/* ─── Heuristic gate ────────────────────────────────────────────── */

type Heuristic =
  | { kind: "ok" }
  | { kind: "suspect"; reasons: string[] };

function heuristicCheck(v: {
  city:     string | null;
  province: string | null;
  phone:    string | null;
  address:  string | null;
  website:  string | null;
}): Heuristic {
  const reasons: string[] = [];

  /* Province explicitly non-ON. */
  const prov = (v.province ?? "").trim().toUpperCase();
  if (prov && prov !== "ON" && prov !== "ONTARIO") {
    reasons.push(`province=${prov}`);
  }

  /* Phone area code non-Ontario. Only flag if we have a phone AND
   * it parses cleanly — missing/un-parseable phones don't condemn.
   * Toll-free codes (800/888/877/...) say nothing about location and
   * are deliberately skipped — a Toronto florist with an 1-800 line
   * is still a Toronto florist. Other heuristics (address, city,
   * website) still apply. */
  const areaCode = extractAreaCode(v.phone);
  if (areaCode && !ONTARIO_AREA_CODES.has(areaCode) && !TOLL_FREE_AREA_CODES.has(areaCode)) {
    reasons.push(`area_code=${areaCode}`);
  }

  /* City not in our known Ontario set. Reset: only flag if BOTH a
   * city is set AND it's not on the known list. A null city is
   * weak signal, not condemnation. */
  if (v.city && !cityIsKnownOntario(v.city)) {
    reasons.push(`unknown_city=${v.city}`);
  }

  /* US state token in address. */
  if (addressHasUSState(v.address)) {
    reasons.push("us_state_in_address");
  }

  return reasons.length === 0 ? { kind: "ok" } : { kind: "suspect", reasons };
}

/* ─── Claude verdict ────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You audit Ontario wedding-vendor directory listings for location accuracy. Given the vendor's name + listed city + phone + website + address, determine whether they are actually based in Ontario, Canada.

You will see vendors filed under Ontario cities ("Picton") who are really based at the SAME-NAMED city in the US (Picton is a town in Erie County, NY). The phone area code is your strongest signal. North-American area codes are tied to physical geography:
  Ontario:  416 647 437 905 289 365 613 343 705 249 683 807 519 226 548 753
  Buffalo NY area: 716
  Other US codes: anything not in the Ontario list

Return ONE JSON object — no markdown fences, no surrounding text:

{
  "is_ontario_based": true | false,
  "actual_location":  "<best guess of city/state — e.g. 'Picton, NY' / 'Buffalo, NY' / 'Toronto, ON' / null if you can't tell>",
  "serves_ontario":   true | false,
  "confidence":       "high" | "medium" | "low",
  "reason":           "<one short sentence — what signal made you decide>"
}

Confidence rubric:
  high   — phone + website + address are mutually consistent
  medium — at least one strong signal but others are mixed
  low    — only weak signals (e.g. just a non-ON area code with no website/address corroboration)`;

type AnthropicResp = { content: Array<{ type: string; text?: string }> };

type Verdict = {
  isOntarioBased:  boolean;
  actualLocation:  string | null;
  servesOntario:   boolean;
  confidence:      "high" | "medium" | "low";
  reason:          string;
};

function safeParseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(cleaned); }
  catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
    return null;
  }
}

async function claudeVerdict(
  client: Anthropic,
  v: { name: string; city: string | null; phone: string | null; website: string | null; address: string | null },
): Promise<Verdict | null> {
  const user = [
    `Name:     ${v.name}`,
    `City:     ${v.city ?? "(not set)"}`,
    `Phone:    ${v.phone ?? "(not set)"}`,
    `Website:  ${v.website ?? "(not set)"}`,
    `Address:  ${v.address ?? "(not set)"}`,
    "",
    "Return the JSON now.",
  ].join("\n");

  let res: AnthropicResp;
  try {
    res = (await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 400,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: user }],
    })) as unknown as AnthropicResp;
  } catch (err) {
    console.warn(`  [error] Claude call failed:`, err instanceof Error ? err.message : err);
    return null;
  }

  const text = res.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
  const parsed = safeParseJson(text);
  if (!parsed) return null;

  const conf = (parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low")
    ? parsed.confidence : "low";
  return {
    isOntarioBased: parsed.is_ontario_based === true,
    actualLocation: typeof parsed.actual_location === "string" ? parsed.actual_location.trim() || null : null,
    servesOntario:  parsed.serves_ontario === true,
    confidence:     conf,
    reason:         typeof parsed.reason === "string" ? parsed.reason : "",
  };
}

/* ─── CLI + main loop ───────────────────────────────────────────── */

type Args = { limit: number; dryRun: boolean };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let limit = Number.MAX_SAFE_INTEGER;
  let confirm = false;
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === "--confirm") confirm = true;
    else if (arg === "--dry-run") confirm = false;
    else if (arg === "--limit") {
      const n = parseInt(a[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (arg.startsWith("--limit=")) {
      const n = parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { limit, dryRun: !confirm };
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const args = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set."); process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const visible = await db
    .select({
      id:       vendors.id,
      slug:     vendors.slug,
      name:     vendors.name,
      city:     vendors.city,
      province: vendors.province,
      phone:    vendors.phone,
      website:  vendors.website,
      address:  vendors.address,
    })
    .from(vendors)
    .where(and(
      eq(vendors.isHidden, false),
      isNotNull(vendors.website),
      sql`${vendors.website} <> ''`,
    ));

  /* Stage 1 — heuristic pre-filter. */
  const suspects: Array<typeof visible[number] & { reasons: string[] }> = [];
  for (const v of visible) {
    const h = heuristicCheck(v);
    if (h.kind === "suspect") suspects.push({ ...v, reasons: h.reasons });
  }
  console.log(
    `Loaded ${visible.length} visible vendors with website.\n` +
    `Stage 1 (heuristics): ${suspects.length} flagged as suspect.\n` +
    `Stage 2 (Claude):     ${Math.min(suspects.length, args.limit)} will be checked  · ${args.dryRun ? "DRY RUN" : "WRITE"}\n` +
    `Estimated cost: ~$${(Math.min(suspects.length, args.limit) * COST_PER_CHECK_USD).toFixed(3)}\n`,
  );

  if (suspects.length === 0) { console.log("Nothing to check."); return; }

  const toCheck = suspects.slice(0, args.limit);

  let toHide:    Array<{ id: number; slug: string; reason: string; location: string | null }> = [];
  let toFlag:    Array<{ id: number; slug: string; reason: string; location: string | null }> = [];
  let actualOnt = 0;
  let lowConf   = 0;
  let errored   = 0;

  for (let i = 0; i < toCheck.length; i++) {
    const v = toCheck[i];
    const verdict = await claudeVerdict(client, v);

    if (!verdict) { errored++; await sleep(PER_CALL_DELAY_MS); continue; }

    const log = (tag: string) =>
      console.log(
        `  [${i + 1}/${toCheck.length}] ${tag.padEnd(7)} ${v.slug}  ` +
        `· filed=${v.city ?? "?"}/${v.province ?? "?"}/${v.phone ?? "?"}  ` +
        `· actual=${verdict.actualLocation ?? "?"}  ` +
        `· conf=${verdict.confidence}  ` +
        `· ${verdict.reason.slice(0, 50)}`,
      );

    if (verdict.confidence === "low") {
      log("LOW");
      lowConf++;
    } else if (verdict.isOntarioBased) {
      log("OK-ONT");
      actualOnt++;
    } else if (verdict.servesOntario) {
      log("FLAG");
      toFlag.push({ id: v.id, slug: v.slug, reason: verdict.reason, location: verdict.actualLocation });
    } else {
      log("HIDE");
      toHide.push({ id: v.id, slug: v.slug, reason: verdict.reason, location: verdict.actualLocation });
    }

    await sleep(PER_CALL_DELAY_MS);
  }

  console.log(`\n=== Verdict summary ===`);
  console.log(`Checked:                  ${toCheck.length}`);
  console.log(`HIDE  (outside Ontario):  ${toHide.length}${args.dryRun ? " (dry — no writes)" : ""}`);
  console.log(`FLAG  (serves Ontario):   ${toFlag.length}${args.dryRun ? " (dry — no writes)" : ""}`);
  console.log(`OK    (verified Ontario): ${actualOnt}  (heuristic false positives)`);
  console.log(`LOW   (skipped):          ${lowConf}`);
  console.log(`Errored:                  ${errored}`);

  if (args.dryRun) {
    console.log(`\nDry run — pass --confirm to:`);
    console.log(`  hide  ${toHide.length} vendors with hidden_reason='outside_ontario'`);
    console.log(`  flag  ${toFlag.length} vendors with needs_manual_review=true`);
    return;
  }

  if (toHide.length > 0) {
    await db
      .update(vendors)
      .set({
        isHidden:     true,
        hiddenReason: "outside_ontario",
        updatedAt:    new Date(),
      })
      .where(and(eq(vendors.isHidden, false), inArray(vendors.id, toHide.map((v) => v.id))));
  }
  if (toFlag.length > 0) {
    await db
      .update(vendors)
      .set({ needsManualReview: true, updatedAt: new Date() })
      .where(inArray(vendors.id, toFlag.map((v) => v.id)));
  }

  console.log(`\nApplied:`);
  console.log(`  hidden:   ${toHide.length}`);
  console.log(`  flagged:  ${toFlag.length}`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
