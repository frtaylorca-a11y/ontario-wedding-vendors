/**
 * Venue deep-capture coverage audit — step 5 of the pipeline.
 *
 * Reports what the extractor + narrative + scoring pipeline has
 * actually produced across the whole venues table. Pure read; no
 * writes, no API calls. Run after each extraction batch.
 *
 *   - Tier counts (confirmed / partial / thin / not-processed)
 *   - Field-coverage % across promoted scalars + key JSON facts
 *   - Per-page extraction failures (rows whose deep_capture_at IS NULL
 *     but had a website on file)
 *   - Top 10 venues by completeness_score
 *
 * CLI:
 *   npx tsx scripts/audit-venue-deepcapture.ts
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  /* ── Population overview ───────────────────────────────────────── */
  const [pop] = await sql`
    SELECT
      COUNT(*)::int                                                                AS total,
      COUNT(*) FILTER (WHERE website IS NOT NULL AND website <> '')::int           AS with_site,
      COUNT(*) FILTER (WHERE deep_capture_at IS NOT NULL)::int                     AS processed,
      COUNT(*) FILTER (WHERE deep_capture_at IS NULL
                       AND website IS NOT NULL AND website <> '')::int             AS unprocessed_with_site,
      COUNT(*) FILTER (WHERE raw_site_text IS NOT NULL)::int                       AS with_cached_text
    FROM venues
  `;
  console.log(`── Venues population ──`);
  console.log(`  total:                          ${pop.total}`);
  console.log(`  with website:                   ${pop.with_site}`);
  console.log(`  deep_capture processed:         ${pop.processed}  (${pct(pop.processed, pop.with_site)} of with-website)`);
  console.log(`  unprocessed with website:       ${pop.unprocessed_with_site}`);
  console.log(`  cached raw_site_text:           ${pop.with_cached_text}`);

  /* ── Tier breakdown ────────────────────────────────────────────── */
  const [tiers] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE completeness_score >= 0.70)::int                     AS confirmed,
      COUNT(*) FILTER (WHERE completeness_score >= 0.40 AND completeness_score < 0.70)::int AS partial,
      COUNT(*) FILTER (WHERE completeness_score IS NOT NULL AND completeness_score < 0.40)::int AS thin,
      COUNT(*) FILTER (WHERE deep_capture_at IS NOT NULL AND completeness_score IS NULL)::int AS unscored
    FROM venues
  `;
  console.log(`\n── Trust tiers (processed only) ──`);
  console.log(`  confirmed (>= 0.70):  ${String(tiers.confirmed).padStart(5)}  ${pct(tiers.confirmed, pop.processed)}`);
  console.log(`  partial   (0.40–69):  ${String(tiers.partial).padStart(5)}  ${pct(tiers.partial, pop.processed)}`);
  console.log(`  thin      (<  0.40):  ${String(tiers.thin).padStart(5)}  ${pct(tiers.thin, pop.processed)}`);
  console.log(`  scored=null:          ${String(tiers.unscored).padStart(5)}  (run score-venue-completeness.ts)`);

  /* ── Field coverage — promoted scalars + selected JSON facts ──── */
  const [cov] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE ceremony_capacity      IS NOT NULL)::int AS ceremony_capacity,
      COUNT(*) FILTER (WHERE reception_seated_max   IS NOT NULL)::int AS reception_seated_max,
      COUNT(*) FILTER (WHERE reception_standing_max IS NOT NULL)::int AS reception_standing_max,
      COUNT(*) FILTER (WHERE price_tier             IS NOT NULL)::int AS price_tier,
      COUNT(*) FILTER (WHERE starting_price         IS NOT NULL)::int AS starting_price,
      COUNT(*) FILTER (WHERE catering_model         IS NOT NULL)::int AS catering_model,
      COUNT(*) FILTER (WHERE (deep_capture -> 'logistics' -> 'noise_curfew'  ->> 'value') IS NOT NULL)::int AS noise_curfew,
      COUNT(*) FILTER (WHERE (deep_capture -> 'logistics' -> 'vendor_policy' ->> 'value') IS NOT NULL)::int AS vendor_policy,
      COUNT(*) FILTER (WHERE (deep_capture -> 'spaces'    -> 'ceremony_onsite' ->> 'value') IS NOT NULL)::int AS ceremony_onsite,
      COUNT(*) FILTER (WHERE (deep_capture -> 'accommodations' -> 'on_site' ->> 'value') IS NOT NULL)::int   AS accom_on_site,
      COUNT(*) FILTER (WHERE (deep_capture -> 'narrative' -> 'about' ->> 'value') IS NOT NULL)::int           AS narrative_about
    FROM venues
    WHERE deep_capture_at IS NOT NULL
  `;
  console.log(`\n── Field coverage (% of ${pop.processed} processed venues) ──`);
  const fields: Array<[string, number]> = [
    ["ceremony_capacity",      cov.ceremony_capacity],
    ["reception_seated_max",   cov.reception_seated_max],
    ["reception_standing_max", cov.reception_standing_max],
    ["price_tier",             cov.price_tier],
    ["starting_price",         cov.starting_price],
    ["catering_model",         cov.catering_model],
    ["noise_curfew",           cov.noise_curfew],
    ["vendor_policy",          cov.vendor_policy],
    ["ceremony_onsite",        cov.ceremony_onsite],
    ["accom_on_site",          cov.accom_on_site],
    ["narrative_about",        cov.narrative_about],
  ];
  const widest = fields.reduce((w, [k]) => Math.max(w, k.length), 0);
  for (const [name, n] of fields) {
    console.log(`  ${name.padEnd(widest)}  ${String(n).padStart(4)}  ${pct(n, pop.processed)}`);
  }

  /* ── Top 10 by completeness ────────────────────────────────────── */
  const top = await sql`
    SELECT slug, name, completeness_score, ceremony_capacity, price_tier, starting_price
    FROM venues
    WHERE completeness_score IS NOT NULL
    ORDER BY completeness_score DESC, id
    LIMIT 10
  `;
  console.log(`\n── Top 10 venues by completeness ──`);
  for (const r of top) {
    const score = Number(r.completeness_score ?? 0).toFixed(3);
    const cap   = r.ceremony_capacity ?? "—";
    const tier  = r.price_tier ?? "—";
    const price = r.starting_price ?? "—";
    console.log(`  ${score}  cap=${String(cap).padStart(4)}  tier=${String(tier).padEnd(7)}  $${String(price).padStart(6)}  ${r.slug}`);
  }
  process.exit(0);
}
main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
