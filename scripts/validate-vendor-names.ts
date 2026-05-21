/**
 * Rule-based category mismatch detector — no AI, no API calls.
 *
 * For each visible vendor, scan the NAME for category-signal keywords
 * (e.g. "photography", "disc jockey", "catering"). If the name signals
 * categories that do NOT include the vendor's filed category, that's
 * a mismatch — hide with hidden_reason='wrong_category_detected'.
 *
 * Examples this catches:
 *   "Supreme DJs And Entertainment" filed as hair_makeup → hide
 *   "Zahara Parisa Photography"     filed as limo        → hide
 *   "Elisabeth & Beau Florals"      filed as officiant   → hide
 *
 * Examples this LEAVES ALONE:
 *   "Joe's Catering & Cakes" filed as catering — name signals both
 *     catering AND cake, filed category is one of them → OK
 *   "Bridge Photography Studio" filed as photographer → name signals
 *     match the filed category → OK
 *   "Acme Inc." filed as florist — name signals NO categories at all
 *     (can't conclude anything from name) → SKIPPED
 *
 * Filter:
 *   is_hidden = false
 *
 * CLI:
 *   npx tsx scripts/validate-vendor-names.ts                # dry-run, full preview
 *   npx tsx scripts/validate-vendor-names.ts --limit 50     # dry-run, smoke
 *   npx tsx scripts/validate-vendor-names.ts --confirm      # apply hides
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";

/* Category → signal keywords. Each keyword is matched case-
 * insensitively as a SUBSTRING of the lowercased vendor name with
 * word boundaries on both sides (so "djembe" doesn't trigger "dj").
 *
 * Conservative on purpose: a category is detected only when an
 * unambiguous keyword appears. Generic words like "studio",
 * "events", "co", "inc" are intentionally OFF the list — they
 * appear across categories. */
const NAME_SIGNALS: Record<string, string[]> = {
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
    /* Specific bridal-beauty signals only. Removed: 'salon', 'spa',
     * 'beauty', 'aesthetics' — all generic enough to appear across
     * categories ("Flower Salon", "Resort & Spa", "Beauty Lounge"
     * etc.) and trigger false positives. */
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

/* Wrap keyword in word-boundary regex. JavaScript's \b doesn't play
 * with non-ASCII characters but vendor names are mostly ASCII. */
function nameContainsSignal(name: string, signal: string): boolean {
  /* Signals that include leading/trailing space are already bounded — */
  /* match as raw substring. Others get \b boundaries. */
  if (signal.startsWith(" ") || signal.endsWith(" ")) {
    return name.includes(signal);
  }
  /* Escape regex special chars in the signal. */
  const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  return re.test(name);
}

function detectCategoriesFromName(name: string): string[] {
  const padded = ` ${name.toLowerCase()} `;  /* lets " dj " match start/end */
  const hits: string[] = [];
  for (const [cat, signals] of Object.entries(NAME_SIGNALS)) {
    for (const sig of signals) {
      if (nameContainsSignal(padded, sig)) {
        hits.push(cat);
        break;  /* one hit per category is enough */
      }
    }
  }
  return hits;
}

/* ─── CLI ──────────────────────────────────────────────────────── */

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

async function main() {
  const args = parseArgs();

  const allVisible = await db
    .select({
      id:       vendors.id,
      slug:     vendors.slug,
      name:     vendors.name,
      category: vendors.category,
    })
    .from(vendors)
    .where(eq(vendors.isHidden, false));

  console.log(`Loaded ${allVisible.length} visible vendors. Scanning names…${args.dryRun ? "  · DRY RUN" : "  · WRITE"}\n`);

  type Mismatch = {
    id:        number;
    slug:      string;
    name:      string;
    filedAs:   string;
    detected:  string[];
  };
  const mismatches: Mismatch[] = [];
  const okCount: Record<string, number> = {};
  let noSignal = 0;

  for (const v of allVisible) {
    const detected = detectCategoriesFromName(v.name);
    if (detected.length === 0) { noSignal++; continue; }
    if (detected.includes(v.category!)) {
      /* Name confirms filed category — count as a positive validation. */
      okCount[v.category!] = (okCount[v.category!] ?? 0) + 1;
      continue;
    }
    mismatches.push({
      id:       v.id,
      slug:     v.slug,
      name:     v.name,
      filedAs:  v.category!,
      detected,
    });
  }

  console.log(`Scan summary:`);
  console.log(`  visible vendors:          ${allVisible.length}`);
  console.log(`  name confirms filed cat:  ${Object.values(okCount).reduce((a, b) => a + b, 0)}`);
  console.log(`  no name signal at all:    ${noSignal}`);
  console.log(`  MISMATCHES:               ${mismatches.length}\n`);

  if (mismatches.length === 0) {
    console.log("No mismatches detected — nothing to do.");
    return;
  }

  /* Per-mismatch breakdown by filed→detected pair for the operator. */
  const pairTally: Record<string, number> = {};
  for (const m of mismatches) {
    for (const d of m.detected) {
      const key = `${m.filedAs} → ${d}`;
      pairTally[key] = (pairTally[key] ?? 0) + 1;
    }
  }
  console.log("Top filed → actual transitions:");
  const sortedPairs = Object.entries(pairTally).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [pair, n] of sortedPairs) {
    console.log(`  ${pair.padEnd(40)} ${n}`);
  }

  /* Sample print. */
  console.log("\nSample mismatches (first 20):");
  for (const m of mismatches.slice(0, 20)) {
    console.log(
      `  [${m.id}] "${m.name}" — filed=${m.filedAs} · detected=${m.detected.join(", ")}`,
    );
  }
  if (mismatches.length > 20) {
    console.log(`  ...and ${mismatches.length - 20} more.`);
  }

  /* Apply --limit AFTER computing the full report so the dry-run
   * shows the full scope but --confirm respects the safety cap. */
  const toApply = mismatches.slice(0, args.limit);

  if (args.dryRun) {
    console.log(`\nDry run — would hide ${toApply.length} vendor(s) with hidden_reason='wrong_category_detected'.`);
    console.log("Pass --confirm to apply.");
    return;
  }

  const ids = toApply.map((m) => m.id);
  if (ids.length === 0) { console.log("Nothing to apply."); return; }
  await db
    .update(vendors)
    .set({
      isHidden:     true,
      hiddenReason: "wrong_category_detected",
      updatedAt:    new Date(),
    })
    .where(and(eq(vendors.isHidden, false), inArray(vendors.id, ids)));

  console.log(`\nApplied — ${ids.length} vendors hidden.`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
