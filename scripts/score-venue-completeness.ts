/**
 * Venue completeness scoring — step 4 of deep-capture.
 *
 * For each row with a deep_capture object, walk every {value, confidence,
 * source} leaf in the structured payload and count how many carry a
 * meaningful value at HIGH or MEDIUM confidence. The ratio is the
 * completeness_score (0.000-1.000), persisted to its column.
 *
 *   completeness_score = (# leaves with value != null AND confidence in {high,medium})
 *                        / (# scoreable leaves)
 *
 * Trust tier (derived at render time, but logged here for the audit):
 *   >= 0.70  →  "confirmed"   (Details confirmed badge)
 *   0.40-0.69 → "partial"     (show what we know)
 *   <  0.40  →  "thin"        (noindex candidate)
 *
 * display_rank_score is also (re)written:
 *   base       = wedding_readiness_score ?? 0
 *   bonus      = 20 if completeness ≥ 0.70
 *              | 10 if completeness ≥ 0.40
 *              | 0
 *   display_rank_score = base + bonus
 *
 * Pure SQL pass — no API calls. Safe to run as often as you want.
 *
 * CLI:
 *   npx tsx scripts/score-venue-completeness.ts            # dry-run
 *   npx tsx scripts/score-venue-completeness.ts --confirm
 */
import "dotenv/config";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "../src/lib/db";
import { venues } from "../src/lib/schema";

type Args = { confirm: boolean };
function parseArgs(): Args {
  let confirm = false;
  for (const a of process.argv.slice(2)) {
    if (a === "--confirm") confirm = true;
    else if (a === "--dry-run") confirm = false;
  }
  return { confirm };
}

type Leaf = { value: unknown; confidence: unknown; source?: unknown };
function isLeaf(node: unknown): node is Leaf {
  return !!node && typeof node === "object"
      && "value" in (node as Record<string, unknown>)
      && "confidence" in (node as Record<string, unknown>);
}

function valueIsMeaningful(v: unknown): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true; /* number, boolean */
}

/** Count (filled-with-good-confidence, total) across deep_capture,
 *  skipping the narrative + _meta envelopes (those are pipeline-
 *  internal, not scoreable facts). */
function countLeaves(dc: unknown): { good: number; total: number } {
  let good = 0, total = 0;
  const walk = (node: unknown, parentKey: string | null): void => {
    if (!node || typeof node !== "object") return;
    if (isLeaf(node)) {
      total++;
      const conf = (node as Leaf).confidence;
      if (valueIsMeaningful((node as Leaf).value) && (conf === "high" || conf === "medium")) {
        good++;
      }
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (parentKey == null && (k === "narrative" || k === "_meta" || k === "schema_version")) continue;
      walk(v, k);
    }
  };
  walk(dc, null);
  return { good, total };
}

function tierFor(score: number): "confirmed" | "partial" | "thin" {
  if (score >= 0.70) return "confirmed";
  if (score >= 0.40) return "partial";
  return "thin";
}

function bonusFor(score: number): number {
  if (score >= 0.70) return 20;
  if (score >= 0.40) return 10;
  return 0;
}

async function main() {
  const { confirm } = parseArgs();

  const rows = await db
    .select({
      id:                   venues.id,
      slug:                 venues.slug,
      name:                 venues.name,
      deepCapture:          venues.deepCapture,
      weddingReadinessScore: venues.weddingReadinessScore,
    })
    .from(venues)
    .where(isNotNull(venues.deepCapture))
    .orderBy(venues.id);

  console.log(`Mode: ${confirm ? "WRITE" : "DRY-RUN"}`);
  console.log(`Candidates: ${rows.length}\n`);

  const tally = { confirmed: 0, partial: 0, thin: 0 };
  const top:   Array<{ slug: string; name: string; score: number; good: number; total: number }> = [];

  for (const v of rows) {
    const { good, total } = countLeaves(v.deepCapture);
    const score = total > 0 ? Math.round((good / total) * 1000) / 1000 : 0;
    const tier  = tierFor(score);
    const bonus = bonusFor(score);
    const display = (v.weddingReadinessScore ?? 0) + bonus;

    tally[tier]++;
    top.push({ slug: v.slug, name: v.name, score, good, total });

    if (confirm) {
      await db
        .update(venues)
        .set({
          completenessScore: String(score),
          displayRankScore:  display,
          updatedAt:         new Date(),
        })
        .where(eq(venues.id, v.id));
    }
  }

  console.log(`Tier counts:`);
  console.log(`  confirmed (>= 0.70): ${tally.confirmed}`);
  console.log(`  partial   (0.40-0.69): ${tally.partial}`);
  console.log(`  thin      (<  0.40): ${tally.thin}`);

  top.sort((a, b) => b.score - a.score);
  console.log(`\nTop 10 by completeness:`);
  for (const r of top.slice(0, 10)) {
    console.log(`  ${(r.score.toFixed(3)).padStart(5)}  ${String(r.good).padStart(3)}/${String(r.total).padStart(3)}  ${r.slug}`);
  }

  if (!confirm) console.log("\nDry-run — pass --confirm to persist completeness_score + display_rank_score.");
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
