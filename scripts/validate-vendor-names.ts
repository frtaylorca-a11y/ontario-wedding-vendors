/**
 * Rule-based category mismatch detector — no AI, no API calls.
 *
 * For each visible vendor, scan the NAME for category-signal keywords
 * (e.g. "photography", "disc jockey", "catering"). Compare what the
 * name signals against the row's filed category and bucket by
 * confidence:
 *
 *   HIGH confidence — name signals EXACTLY ONE category, and it's
 *                     NOT the filed category. Unambiguous mismatch.
 *                     Action: hide with hidden_reason='name_category_mismatch'.
 *
 *   MEDIUM confidence — name signals TWO+ categories, NONE of which
 *                       is the filed category. Could be a multi-
 *                       service vendor (e.g. "Joe's Photo & Video"
 *                       — could legitimately be either category).
 *                       Action: needs_manual_review = true. Stay visible.
 *
 *   No action — name signals match the filed category, OR no signals
 *               at all (skipped).
 *
 * Examples this catches:
 *   "Supreme DJs And Entertainment" filed as hair_makeup
 *     → HIGH (only DJ signal) → hide
 *   "Zahara Parisa Photography" filed as limo
 *     → HIGH (only photographer signal) → hide
 *   "DJ Webb Photography" filed as limo
 *     → MEDIUM (signals BOTH dj and photographer, filed=limo)
 *     → keep visible, flag for review
 *
 * Examples it LEAVES ALONE:
 *   "Joe's Catering & Cakes" filed as catering → name signals both,
 *     filed IS in the set → OK
 *   "Bridge Photography Studio" filed as photographer → match → OK
 *   "Acme Inc." filed as florist → no signals at all → SKIP
 *
 * Filter: is_hidden = false
 *
 * CLI:
 *   npx tsx scripts/validate-vendor-names.ts                    # dry-run, full report
 *   npx tsx scripts/validate-vendor-names.ts --category dj      # only scan vendors filed as dj
 *   npx tsx scripts/validate-vendor-names.ts --confirm          # apply hides + flags
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";

/* Category → signal keywords. Per the user spec, with one tightening:
 * 'salon' / 'spa' / 'beauty' / 'aesthetics' removed from hair_makeup
 * because dry-runs surfaced false positives like "Flower Salon",
 * "Resort & Spa", "Beauty Lounge". Specific bridal-beauty signals
 * preserved (makeup artist, hair studio, etc.). */
export const NAME_SIGNALS: Record<string, string[]> = {
  dj: [
    " dj ", "djs ", " djs", "dj's", "disc jockey", "disc jockeys",
    "deejay", "deejays", "entertainment dj", "music dj",
  ],
  photographer: [
    "photography", "photographer", "photographers",
    "photo studio", "photo studios", "portraits",
    "photographic",
  ],
  videographer: [
    "videography", "videographer", "videographers",
    "cinematography", "cinematographer",
    "wedding films", "wedding film", "video production",
    "video productions",
  ],
  florist: [
    "floral", "florals", "florist", "florists",
    "flowers", "blooms", "botanicals", "petals", "bouquet",
    "flower shop", "flower studio",
  ],
  cake: [
    "cakes", "cake co", "cake studio", "cake design",
    "bakery", "patisserie", "pastry", "pastries",
    "bake shop", "bakeshop", "confection", "confections",
  ],
  limo: [
    "limo", "limos", "limousine", "limousines",
    "livery", "chauffeur", "chauffeurs",
    "transportation", "party bus", "coach service",
  ],
  officiant: [
    "officiant", "officiants", "celebrant", "celebrants",
    "minister", "reverend", "ordained",
  ],
  wedding_planner: [
    "wedding planner", "wedding planners", "wedding planning",
    "wedding coordinator", "event planner", "event planners",
    "event planning", "event coordinator", "event coordinators",
  ],
  catering: [
    "catering", "caterer", "caterers", "catered",
    "chef", "cuisine", "food service", "food services",
  ],
  hair_makeup: [
    "makeup artist", "makeup artists",
    "hair studio", "hair design",
    "hairstylist", "hairstylists",
    "bridal hair", "bridal makeup", "bridal beauty",
    "hair and makeup", "hair & makeup", "hair + makeup",
    "mua",
  ],
  photo_booth: [
    "photo booth", "photobooth", "photo booths", "photobooths",
    "selfie booth", "mirror booth",
  ],
  lighting_decor: [
    "lighting design", "wedding lighting",
    "wedding decor", "wedding decór",
    "event decor", "drapery", "drape",
  ],
};

/* Word-boundary substring match. Signals padded with whitespace are
 * matched as raw substrings; others get regex \b boundaries. */
function nameContainsSignal(name: string, signal: string): boolean {
  if (signal.startsWith(" ") || signal.endsWith(" ")) {
    return name.includes(signal);
  }
  const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  return re.test(name);
}

/* All categories whose signal list matches the given name. */
export function detectCategoriesFromName(name: string): string[] {
  const padded = ` ${name.toLowerCase()} `;
  const hits: string[] = [];
  for (const [cat, signals] of Object.entries(NAME_SIGNALS)) {
    for (const sig of signals) {
      if (nameContainsSignal(padded, sig)) { hits.push(cat); break; }
    }
  }
  return hits;
}

/* Single decision function — exported so import-vendors.ts can reuse
 * the same logic for its post-insert warning hook. */
export type NameVerdict =
  | { kind: "ok" }
  | { kind: "high-mismatch";   detected: string[] }
  | { kind: "medium-mismatch"; detected: string[] };

export function verdictFor(name: string, filedCategory: string): NameVerdict {
  const detected = detectCategoriesFromName(name);
  if (detected.length === 0) return { kind: "ok" };
  if (detected.includes(filedCategory)) return { kind: "ok" };
  if (detected.length === 1) return { kind: "high-mismatch", detected };
  return { kind: "medium-mismatch", detected };
}

/* ─── CLI ──────────────────────────────────────────────────────── */

type Args = { dryRun: boolean; category: string | null };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let confirm = false;
  let category: string | null = null;
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === "--confirm") confirm = true;
    else if (arg === "--dry-run") confirm = false;
    else if (arg === "--category") category = a[++i] ?? null;
    else if (arg.startsWith("--category=")) category = arg.slice("--category=".length);
  }
  return { dryRun: !confirm, category };
}

async function main() {
  const args = parseArgs();

  const baseWhere = args.category
    ? and(eq(vendors.isHidden, false), eq(vendors.category, args.category))
    : eq(vendors.isHidden, false);

  const visible = await db
    .select({
      id:       vendors.id,
      slug:     vendors.slug,
      name:     vendors.name,
      category: vendors.category,
    })
    .from(vendors)
    .where(baseWhere);

  console.log(
    `Loaded ${visible.length} visible vendors` +
    `${args.category ? ` filed as '${args.category}'` : ""}. ` +
    `${args.dryRun ? "DRY RUN" : "WRITE"}\n`,
  );

  type Mismatch = {
    id:         number;
    slug:       string;
    name:       string;
    filedAs:    string;
    detected:   string[];
    confidence: "high" | "medium";
  };
  const high:   Mismatch[] = [];
  const medium: Mismatch[] = [];
  const okPerCategory: Record<string, number> = {};
  let noSignal = 0;

  for (const v of visible) {
    const verdict = verdictFor(v.name, v.category!);
    if (verdict.kind === "ok") {
      const detected = detectCategoriesFromName(v.name);
      if (detected.length === 0) noSignal++;
      else okPerCategory[v.category!] = (okPerCategory[v.category!] ?? 0) + 1;
      continue;
    }
    const m: Mismatch = {
      id:         v.id,
      slug:       v.slug,
      name:       v.name,
      filedAs:    v.category!,
      detected:   verdict.detected,
      confidence: verdict.kind === "high-mismatch" ? "high" : "medium",
    };
    if (verdict.kind === "high-mismatch") high.push(m);
    else medium.push(m);
  }

  console.log(`Scan summary:`);
  console.log(`  visible vendors scanned:     ${visible.length}`);
  console.log(`  name confirms filed cat:     ${Object.values(okPerCategory).reduce((a, b) => a + b, 0)}`);
  console.log(`  no name signal at all:       ${noSignal}`);
  console.log(`  HIGH-confidence mismatches:  ${high.length}  (would hide)`);
  console.log(`  MEDIUM-confidence ambiguous: ${medium.length}  (would flag needs_manual_review)\n`);

  /* "How many hidden per category" — by FILED category. */
  const hidesByFiled: Record<string, number> = {};
  for (const m of high) {
    hidesByFiled[m.filedAs] = (hidesByFiled[m.filedAs] ?? 0) + 1;
  }
  console.log("HIGH-confidence hides by filed category:");
  const sortedHides = Object.entries(hidesByFiled).sort((a, b) => b[1] - a[1]);
  for (const [cat, n] of sortedHides) {
    console.log(`  ${cat.padEnd(20)} ${n}`);
  }

  /* Top filed → actual transitions (HIGH only). */
  const pairTally: Record<string, number> = {};
  for (const m of high) {
    pairTally[`${m.filedAs} → ${m.detected[0]}`] = (pairTally[`${m.filedAs} → ${m.detected[0]}`] ?? 0) + 1;
  }
  console.log("\nTop HIGH transitions (filed → detected):");
  for (const [pair, n] of Object.entries(pairTally).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${pair.padEnd(40)} ${n}`);
  }

  if (medium.length > 0) {
    console.log("\nSample MEDIUM-confidence rows (first 10):");
    for (const m of medium.slice(0, 10)) {
      console.log(`  [${m.id}] "${m.name}" — filed=${m.filedAs} · signals=${m.detected.join(", ")}`);
    }
    if (medium.length > 10) console.log(`  ...and ${medium.length - 10} more.`);
  }

  if (args.dryRun) {
    console.log(`\nDry run — pass --confirm to:`);
    console.log(`  hide  ${high.length} HIGH-confidence mismatches (hidden_reason='name_category_mismatch')`);
    console.log(`  flag  ${medium.length} MEDIUM rows (needs_manual_review=true)`);
    return;
  }

  /* Apply both buckets. */
  if (high.length > 0) {
    await db
      .update(vendors)
      .set({
        isHidden:     true,
        hiddenReason: "name_category_mismatch",
        updatedAt:    new Date(),
      })
      .where(and(eq(vendors.isHidden, false), inArray(vendors.id, high.map((m) => m.id))));
  }
  if (medium.length > 0) {
    await db
      .update(vendors)
      .set({
        needsManualReview: true,
        updatedAt:         new Date(),
      })
      .where(inArray(vendors.id, medium.map((m) => m.id)));
  }

  console.log(`\nApplied:`);
  console.log(`  hidden:   ${high.length} (hidden_reason='name_category_mismatch')`);
  console.log(`  flagged:  ${medium.length} (needs_manual_review=true)`);
}

/* Only auto-run main() when this file is invoked directly via
 * `npx tsx scripts/validate-vendor-names.ts`. When import-vendors.ts
 * imports verdictFor() from this module, we want the helpers
 * available without the CLI side-effect running. */
const isDirectInvocation =
  process.argv[1] && /validate-vendor-names\.tsx?$/.test(process.argv[1]);
if (isDirectInvocation) {
  main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
}
