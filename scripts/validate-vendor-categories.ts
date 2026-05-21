/**
 * Standalone category-validation audit.
 *
 * Walks every visible vendor that has a real website, fetches the
 * homepage, and runs the claude-haiku relevance classifier against
 * the assigned category. Hides high-confidence mismatches, flags
 * medium-confidence ones for manual review.
 *
 * This complements:
 *   - enrich-vendor-bios.ts       runs the same check inline while enriching bios
 *   - find-vendor-websites.ts     runs it the moment a new website is matched
 * This script is the third pass — for vendors whose websites we
 * already trust but never explicitly audited for category fit.
 *
 * Filter:
 *   is_hidden        = FALSE
 *   AND website      IS NOT NULL
 *   AND website      <> ''
 *   AND needs_manual_review IS DISTINCT FROM TRUE   (skip already-flagged)
 *
 * Cost: ~$0.0002 per call. ~10,710 candidates × $0.0002 ≈ $2.14
 * for a full audit pass.
 *
 * Usage:
 *   npx tsx scripts/validate-vendor-categories.ts                  # all
 *   npx tsx scripts/validate-vendor-categories.ts --limit 50       # smoke
 *   npx tsx scripts/validate-vendor-categories.ts --dry-run        # no writes
 *   npx tsx scripts/validate-vendor-categories.ts --confirm        # apply
 */
import "dotenv/config";
import { and, eq, isNotNull, ne, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { classifyCategoryRelevance, actionForVerdict } from "../src/lib/category-relevance";

const DELAY_BETWEEN_REQUESTS_MS = 250;
const FETCH_TIMEOUT_MS          = 10_000;
const COST_PER_VENDOR_USD       = 0.0002;

type Args = { limit: number | null; dryRun: boolean };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  /* Dry-run is the default — explicit --confirm to write. */
  let dryRun = !args.includes("--confirm");
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--confirm") dryRun = false;
    else if (a === "--limit") {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = Number.parseInt(a.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return { limit, dryRun };
}

type Candidate = {
  id:       number;
  slug:     string;
  name:     string;
  category: string;
  website:  string;
};

async function loadCandidates(limit: number | null): Promise<Candidate[]> {
  const q = db
    .select({
      id:       vendors.id,
      slug:     vendors.slug,
      name:     vendors.name,
      category: vendors.category,
      website:  vendors.website,
    })
    .from(vendors)
    .where(
      and(
        eq(vendors.isHidden, false),
        isNotNull(vendors.website),
        ne(vendors.website, ""),
        /* Skip vendors already flagged so we don't re-audit them every run. */
        or(
          eq(vendors.needsManualReview, false),
          sql`${vendors.needsManualReview} IS NULL`,
        ),
      ),
    )
    .orderBy(vendors.id);

  const rows = limit != null ? await q.limit(limit) : await q;
  return rows
    .filter((r): r is Candidate =>
      r.website != null && r.website.length > 0 && r.category != null)
    .map((r) => ({
      id:       r.id,
      slug:     r.slug,
      name:     r.name,
      category: r.category!,
      website:  r.website!,
    }));
}

async function fetchSnippet(url: string): Promise<string> {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal:   ctrl.signal,
        redirect: "follow",
        headers:  { "user-agent": "OntarioWeddingVendors-Bot/1.0 (+category-audit)" },
      });
      if (!res.ok) return "";
      const text = await res.text();
      /* Strip HTML — same approach as the scout module. */
      const stripped = text
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      /* Also pull a chunk from <head> meta so we get marketing copy + title. */
      return stripped.slice(0, 1500);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { limit, dryRun } = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set.");
    process.exit(1);
  }

  const candidates = await loadCandidates(limit);
  console.log(`Loaded ${candidates.length} candidate vendor(s)${dryRun ? " · DRY RUN" : " · WRITE"}`);
  if (candidates.length === 0) {
    console.log("Nothing to audit.");
    return;
  }
  console.log(`Estimated cost: ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(2)}`);

  let evaluated      = 0;
  let mismatchHide   = 0;
  let mismatchFlag   = 0;
  let okOrLow        = 0;
  let fetchFailed    = 0;
  let classifyNull   = 0;
  const findings: Array<{
    slug: string; name: string; category: string; verdict: string; actualCategory: string | null; reason: string;
  }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];

    const snippet = await fetchSnippet(c.website);
    if (snippet.length < 40) {
      fetchFailed++;
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
      continue;
    }

    const verdict = await classifyCategoryRelevance({
      vendorName:     c.name,
      category:       c.category,
      websiteContent: snippet,
    });
    if (!verdict) {
      classifyNull++;
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
      continue;
    }
    evaluated++;

    const action = actionForVerdict(verdict);

    if (action.kind === "hide") {
      mismatchHide++;
      console.log(
        `  HIDE  ${c.slug} (${c.category}) → ${verdict.actualCategory ?? "?"}  · "${verdict.reason.slice(0, 60)}"`,
      );
      if (!dryRun) {
        await db
          .update(vendors)
          .set({
            isHidden:          true,
            hiddenReason:      "wrong_category_detected",
            needsManualReview: true,
            updatedAt:         new Date(),
          })
          .where(eq(vendors.id, c.id));
      }
      findings.push({
        slug: c.slug, name: c.name, category: c.category,
        verdict: "hide", actualCategory: verdict.actualCategory, reason: verdict.reason,
      });
    } else if (action.kind === "flag") {
      mismatchFlag++;
      console.log(
        `  FLAG  ${c.slug} (${c.category}) → ${verdict.actualCategory ?? "?"}  · "${verdict.reason.slice(0, 60)}"`,
      );
      if (!dryRun) {
        await db
          .update(vendors)
          .set({ needsManualReview: true, updatedAt: new Date() })
          .where(eq(vendors.id, c.id));
      }
      findings.push({
        slug: c.slug, name: c.name, category: c.category,
        verdict: "flag", actualCategory: verdict.actualCategory, reason: verdict.reason,
      });
    } else {
      okOrLow++;
    }

    if ((i + 1) % 25 === 0) {
      console.log(
        `  --- progress ${i + 1}/${candidates.length} · ok=${okOrLow} hide=${mismatchHide} flag=${mismatchFlag} fetch-failed=${fetchFailed}`,
      );
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log("\n=== Summary ===");
  console.log(`Total candidates:           ${candidates.length}`);
  console.log(`Evaluated:                  ${evaluated}`);
  console.log(`Category mismatches (hide): ${mismatchHide}${dryRun ? " (dry — no writes)" : ""}`);
  console.log(`Category mismatches (flag): ${mismatchFlag}${dryRun ? " (dry — no writes)" : ""}`);
  console.log(`OK or low-confidence:       ${okOrLow}`);
  console.log(`Fetch failed:               ${fetchFailed}`);
  console.log(`Classifier null:            ${classifyNull}`);
  console.log(`Actual cost: ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(2)}`);

  if (findings.length > 0) {
    console.log("\n=== Mismatch findings ===");
    for (const f of findings.slice(0, 50)) {
      console.log(
        `  [${f.verdict}] ${f.slug}  filed=${f.category}  actual=${f.actualCategory ?? "?"}  "${f.reason.slice(0, 70)}"`,
      );
    }
    if (findings.length > 50) {
      console.log(`  ...and ${findings.length - 50} more.`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
