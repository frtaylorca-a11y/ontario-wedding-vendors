/**
 * One-shot backfill: recompute vendors.display_rank_score for every
 * row using the DISPLAY_RANK_SCORE_SQL formula in src/lib/queries.ts.
 *
 * The import + bio-enrichment paths now refresh this column whenever
 * they touch a row, so this script is only needed:
 *   - once after the column lands (initial backfill)
 *   - after the formula in queries.ts changes (re-rank everyone)
 *   - if you suspect drift from a partial run
 *
 * Safe to run multiple times — the same input produces the same
 * output. No --dry-run flag because there's no API cost and the
 * UPDATE is one statement.
 *
 * Usage:
 *   npx tsx scripts/recompute-vendor-rankings.ts
 */
import "dotenv/config";
import { recomputeAllDisplayRankScores } from "../src/lib/queries";

async function main() {
  console.log("Recomputing display_rank_score for all vendor rows…");
  const start = Date.now();
  const n = await recomputeAllDisplayRankScores();
  const ms = Date.now() - start;
  console.log(`Updated ${n.toLocaleString()} rows in ${ms} ms.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
