/**
 * Nightly vendor-website health check.
 *
 * Walks every vendor row with a non-null website (visible OR hidden —
 * we want the cached status fresh even for hidden rows in case they
 * later come off-hide). Pings each URL via checkUrl(), updates
 * website_status accordingly, and flips needs_website_search=true
 * on freshly-broken rows so the AI re-search pass can pick them up.
 *
 * Pacing: 10 vendors in parallel, 200ms between batches. Hits ~30/s,
 * polite enough for shared hosting while finishing 6000 rows in
 * ~3-4 min.
 *
 * Idempotent. Safe to re-run. No --confirm gate — the writes are
 * status updates only, never destructive.
 *
 * CLI:
 *   npx tsx scripts/check-vendor-websites.ts                # all
 *   npx tsx scripts/check-vendor-websites.ts --limit 100    # smoke
 *   npx tsx scripts/check-vendor-websites.ts --only-stale   # skip
 *                                                             rows
 *                                                             checked
 *                                                             < 24h
 *                                                             ago
 *   npx tsx scripts/check-vendor-websites.ts --dry-run      # don't
 *                                                             write
 */
import "dotenv/config";
import { and, eq, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { checkUrl, type UrlCheckResult } from "../src/lib/check-url";

const BATCH_SIZE   = 10;
const BATCH_DELAY  = 200;
const STALE_HOURS  = 24;

type Args = { limit: number | null; onlyStale: boolean; dryRun: boolean };

function parseArgs(): Args {
  const a = process.argv.slice(2);
  let limit: number | null = null;
  let onlyStale = false;
  let dryRun = false;
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === "--only-stale") onlyStale = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--limit") {
      const n = parseInt(a[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (arg.startsWith("--limit=")) {
      const n = parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { limit, onlyStale, dryRun };
}

type Candidate = {
  id:             number;
  slug:           string;
  website:        string;
  websiteStatus:  string | null;
};

async function loadCandidates(args: Args): Promise<Candidate[]> {
  /* Stale cutoff: only rows where last_website_check is older than
   * STALE_HOURS hours, OR never checked. */
  const staleCutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
  const q = db
    .select({
      id:            vendors.id,
      slug:          vendors.slug,
      website:       vendors.website,
      websiteStatus: vendors.websiteStatus,
    })
    .from(vendors)
    .where(
      and(
        isNotNull(vendors.website),
        sql`${vendors.website} <> ''`,
        args.onlyStale
          ? or(
              sql`${vendors.lastWebsiteCheck} IS NULL`,
              lt(vendors.lastWebsiteCheck, staleCutoff),
            )
          : sql`TRUE`,
      ),
    )
    .orderBy(sql`COALESCE(${vendors.lastWebsiteCheck}, '1970-01-01') ASC`);

  const rows = args.limit != null ? await q.limit(args.limit) : await q;
  return rows
    .filter((r): r is Candidate =>
      r.website != null && r.website.length > 0)
    .map((r) => ({
      id:            r.id,
      slug:          r.slug,
      website:       r.website!,
      websiteStatus: r.websiteStatus,
    }));
}

async function persistResult(c: Candidate, result: UrlCheckResult, dryRun: boolean): Promise<void> {
  if (dryRun) return;

  /* needs_website_search flips TRUE when newly-broken so the
   * AI re-search pass picks it up. We don't touch the flag when
   * the result is 'ok' (might already be true for other reasons).
   * For 'blocked' we treat the site as still real — no flag change. */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const patch: Record<string, any> = {
    websiteStatus:    result.kind,
    lastWebsiteCheck: new Date(),
    updatedAt:        new Date(),
  };
  if (result.kind === "broken") {
    patch.needsWebsiteSearch = true;
  }

  await db
    .update(vendors)
    .set(patch)
    .where(eq(vendors.id, c.id));
}

async function main() {
  const args = parseArgs();
  const candidates = await loadCandidates(args);
  console.log(
    `Loaded ${candidates.length} vendor websites to check` +
    `${args.limit != null ? ` (limit=${args.limit})` : ""}` +
    `${args.onlyStale ? " (stale-only)" : ""}` +
    `${args.dryRun ? " · DRY RUN" : ""}`,
  );
  if (candidates.length === 0) { console.log("Nothing to check."); return; }

  let ok = 0, broken = 0, blocked = 0, statusFlips = 0;
  const flipsToBroken: Array<{ slug: string; from: string | null; reason: string }> = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (c) => {
        const r = await checkUrl(c.website);
        return { c, r };
      }),
    );
    for (const { c, r } of results) {
      if (r.kind === "ok")          ok++;
      else if (r.kind === "blocked") blocked++;
      else                            broken++;
      if (c.websiteStatus !== r.kind) {
        statusFlips++;
        if (r.kind === "broken") {
          flipsToBroken.push({ slug: c.slug, from: c.websiteStatus, reason: r.reason });
        }
      }
      await persistResult(c, r, args.dryRun);
    }

    if ((i / BATCH_SIZE) % 10 === 0) {
      const done = Math.min(i + BATCH_SIZE, candidates.length);
      console.log(
        `  progress ${done}/${candidates.length} — ok=${ok} blocked=${blocked} broken=${broken} flips=${statusFlips}`,
      );
    }
    if (i + BATCH_SIZE < candidates.length) {
      await new Promise((res) => setTimeout(res, BATCH_DELAY));
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total checked:        ${candidates.length}`);
  console.log(`ok:                   ${ok}`);
  console.log(`blocked (real site):  ${blocked}`);
  console.log(`broken:               ${broken}`);
  console.log(`Status changes:       ${statusFlips}${args.dryRun ? " (dry run — no writes)" : ""}`);
  console.log(`Newly broken:         ${flipsToBroken.length}`);
  if (flipsToBroken.length > 0 && flipsToBroken.length <= 20) {
    console.log("\nFlipped to broken:");
    for (const f of flipsToBroken) console.log(`  ${f.slug} (was ${f.from ?? "null"}) — ${f.reason}`);
  } else if (flipsToBroken.length > 20) {
    console.log(`\nFlipped to broken (first 20 of ${flipsToBroken.length}):`);
    for (const f of flipsToBroken.slice(0, 20)) console.log(`  ${f.slug} (was ${f.from ?? "null"}) — ${f.reason}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
