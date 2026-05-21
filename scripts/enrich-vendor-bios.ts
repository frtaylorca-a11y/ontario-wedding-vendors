/**
 * Replace generic ("highly-rated…", "wedding-ready…") or missing vendor
 * descriptions with authentic 2-3-sentence bios extracted from each
 * vendor's own website via Claude Haiku 4.5.
 *
 * Pipeline per vendor:
 *   1. Fetch the homepage. Also try {base}/about and {base}/about-us.
 *      Strip HTML to plain text via cheerio. Pick the variant with the
 *      most extractable text (typically the about page).
 *   2. Send the first 3,000 chars to claude-haiku-4-5 with a strict JSON
 *      extraction prompt — description, owner, years, service areas,
 *      specialties, awards, team size, style.
 *   3. UPDATE vendors row with:
 *        description       = extracted 2-3 sentence narrative
 *        owner_name        = present-if-found
 *        years_in_business = present-if-found
 *        specialties       = jsonb array
 *        service_areas     = jsonb array
 *        bio_enriched_at   = NOW()
 *      (awards + team_size + style are extracted but not persisted yet —
 *      no columns for them; ship as a follow-up when the UI surfaces them.)
 *
 * Skips:
 *   - vendors with bio_enriched_at already set (re-runs are no-ops)
 *   - vendors without a website
 *   - vendors whose websites we couldn't reach in time
 *   - extracted content <200 chars (not enough signal for Claude)
 *
 * Pacing: 300ms between vendors (independent of per-vendor request fan-out).
 * Cost: ~$0.004 / vendor (Haiku 4.5, ~3,500 input + ~200 output tokens).
 *       Current dataset has 302 candidates → full run ≈ $1.20.
 *
 * Usage:
 *   npx tsx scripts/enrich-vendor-bios.ts                # all candidates
 *   npx tsx scripts/enrich-vendor-bios.ts --limit 20     # smoke test
 *   npx tsx scripts/enrich-vendor-bios.ts --dry-run      # no DB writes
 */
import "dotenv/config";
import { and, eq, isNull, isNotNull, like, ne, or } from "drizzle-orm";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../src/lib/db";
import { vendors } from "../src/lib/schema";
import { classifyCategoryRelevance, actionForVerdict } from "../src/lib/category-relevance";

const DELAY_BETWEEN_REQUESTS_MS = 300;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES        = 5 * 1024 * 1024;
const MAX_CHARS_FOR_CLAUDE = 8_000;
const MIN_CHARS_FOR_CLAUDE =   200;
const COST_PER_VENDOR_USD = 0.004;

type Args = { limit: number | null; dryRun: boolean };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--limit") {
      const n = Number.parseInt(args[++i] ?? "", 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer");
        process.exit(1);
      }
      limit = n;
    } else if (a.startsWith("--limit=")) {
      const n = Number.parseInt(a.slice("--limit=".length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--limit requires a positive integer");
        process.exit(1);
      }
      limit = n;
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return { limit, dryRun };
}

type Candidate = {
  id: number;
  slug: string;
  name: string;
  category: string;
  website: string;
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
        isNotNull(vendors.website),
        ne(vendors.website, ""),
        isNull(vendors.bioEnrichedAt),
        or(
          isNull(vendors.description),
          like(vendors.description, "%highly-rated%"),
          like(vendors.description, "%wedding-ready%"),
          like(vendors.description, "%fully wedding-ready%"),
        ),
      ),
    )
    .orderBy(vendors.id);

  const rows = limit != null ? await q.limit(limit) : await q;
  return rows
    .filter((r): r is Candidate => r.website != null && r.website.length > 0)
    .map((r) => ({ id: r.id, slug: r.slug, name: r.name, category: r.category, website: r.website }));
}

/* ─── Web fetch ─────────────────────────────────────────────────────── */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithLimits(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "OntarioWeddingVendors-Bot/1.0 (+bio-enrichment)" },
    });
    if (!res.ok) return null;
    const reader = res.body?.getReader();
    if (!reader) return await res.text().catch(() => null);
    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel().catch(() => {});
          break;
        }
        chunks.push(value);
      }
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return buf.toString("utf8");
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildVariantUrl(base: string, path: string): string | null {
  try {
    return new URL(path, base.endsWith("/") ? base : `${base}/`).href;
  } catch {
    return null;
  }
}

function stripToText(html: string): string {
  const $ = cheerio.load(html);
  /* Drop the obvious chrome — nav, footer, scripts, etc. */
  $("script, style, noscript, nav, footer, header, aside").remove();
  $('[class*="cookie"], [class*="menu"], [class*="nav"], [class*="footer"]').remove();

  /* Prefer <main> if present — it's usually the actual content. */
  const mainOrBody = $("main").length ? $("main") : $("body");
  const text = (mainOrBody.length ? mainOrBody.text() : $.root().text())
    .replace(/\s+/g, " ")
    .replace(/ /g, " ")
    .trim();
  return text;
}

async function pickBestVariant(website: string): Promise<string> {
  /* Fetch homepage + about page + FAQ page in parallel. Combine all
   * three into a single corpus so Claude sees:
   *   - homepage voice + service proposition
   *   - about-page personal story (longest of /about /about-us)
   *   - FAQ content (longest of /faq /faqs /frequently-asked-questions)
   * Cap the joined text at MAX_CHARS_FOR_CLAUDE. */
  const home    = buildVariantUrl(website, "");
  const aboutA  = buildVariantUrl(website, "about");
  const aboutB  = buildVariantUrl(website, "about-us");
  const faqA    = buildVariantUrl(website, "faq");
  const faqB    = buildVariantUrl(website, "faqs");
  const faqC    = buildVariantUrl(website, "frequently-asked-questions");
  const urls = [home, aboutA, aboutB, faqA, faqB, faqC].filter((u): u is string => u != null);

  const variants = await Promise.all(
    urls.map(async (u) => {
      const html = await fetchWithLimits(u);
      if (!html) return { url: u, text: "" };
      return { url: u, text: stripToText(html) };
    }),
  );

  const homeText  = home ? variants.find((v) => v.url === home)?.text ?? "" : "";
  const aboutText = [aboutA, aboutB]
    .map((u) => (u ? variants.find((v) => v.url === u)?.text ?? "" : ""))
    .sort((a, b) => b.length - a.length)[0] ?? "";
  const faqText   = [faqA, faqB, faqC]
    .map((u) => (u ? variants.find((v) => v.url === u)?.text ?? "" : ""))
    .sort((a, b) => b.length - a.length)[0] ?? "";

  /* Stitch with section markers so Claude can keep voice/story/FAQ
   * distinct when extracting fields. Missing sections just drop out
   * of the corpus — no empty placeholders. */
  const parts = [
    homeText,
    aboutText ? `--- /about ---\n\n${aboutText}` : "",
    faqText   ? `--- /faq ---\n\n${faqText}`     : "",
  ].filter((p) => p.length > 0);
  return parts.join("\n\n").slice(0, MAX_CHARS_FOR_CLAUDE);
}

/* ─── Claude ───────────────────────────────────────────────────────── */

type ExtractedFaq = {
  question: string;
  answer:   string;
};

type ExtractedBio = {
  description:     string;
  ownerName:       string | null;
  yearsInBusiness: number | null;
  serviceAreas:    string[];
  specialties:     string[];
  press:           string[];
  teamSize:        number | null;
  style:           string | null;
  faqs:            ExtractedFaq[];
};

const SYSTEM_PROMPT =
  "You write editorial descriptions for wedding vendor profiles on Ontario Wedding Vendors. " +
  "Your goal is a richer narrative than a typical directory blurb — readers should finish feeling like they have a sense of the vendor's voice, approach, and what makes them distinct. " +
  "Use the vendor's own language and terminology where possible. Avoid generic adjectives. " +
  "Be factual and specific. Only include information actually present on the page content provided.";

async function extractBio(
  anthropic: Anthropic,
  content: string,
): Promise<ExtractedBio | null> {
  const trimmed = content.slice(0, MAX_CHARS_FOR_CLAUDE);
  const userPrompt =
    `Website content (homepage + about page combined, stripped HTML, up to ${MAX_CHARS_FOR_CLAUDE} chars):\n` +
    `"""\n${trimmed}\n"""\n\n` +
    `Extract the editorial profile as JSON:\n` +
    `{\n` +
    `  "description":    "<150-250 word narrative in THIRD PERSON. Open with what they actually do — their style, approach, or what they specialise in. Include at least one concrete detail (years in business, signature style, a short quote from their site, a specific service area, a published feature, anything specific to them). Close with what kind of couple they'd be a good fit for, IF the site signals that. Use THEIR own language and terminology. Banned words/phrases — never use: 'highly-rated', 'wedding-ready', 'fully wedding-ready', 'exceptional', 'passionate', 'dedicated', 'talented', 'professional'.>",\n` +
    `  "ownerName":      "<owner or founder name if on the page, else null>",\n` +
    `  "yearsInBusiness": <integer or null>,\n` +
    `  "serviceAreas":   ["<specific cities mentioned on the site — Toronto, Mississauga, Niagara, Burlington, Hamilton, etc. Only return 'Ontario' as a last resort when no specific cities are present.>"],\n` +
    `  "specialties":    ["<style / niche / approach the vendor uses to describe themselves — e.g. 'candid documentary', 'South Asian weddings', 'editorial', 'fine art'>"],\n` +
    `  "press":          ["<publications or shows that have featured them — 'Wedding Bells', 'Today's Bride', 'CTV', etc. Only include if explicitly mentioned. NOT for awards — see note below.>"],\n` +
    `  "teamSize":       <integer or null — only if explicitly stated>,\n` +
    `  "style":          "<their described shooting / working style if stated, else null>",\n` +
    `  "faqs":           [\n` +
    `    {"question": "<exact question text from the site, 5-15 words>", "answer": "<answer text, 1-3 sentences, in their own words>"}\n` +
    `  ]\n` +
    `}\n\n` +
    `For "faqs" — only extract questions actually present on the site (look for explicit FAQ sections, "Frequently asked questions", or Q&A blocks). Up to 5 entries. If there are no real FAQs on the site, return an empty array []. Do NOT invent FAQs. Each answer should preserve the vendor's own voice — keep the original phrasing where possible, just clean up obvious whitespace.\n\n` +
    `Note: previously this field was called 'awards' — many vendors are featured in press but very few list real industry awards. Press features count; vague self-claimed 'best of' ribbons do not.\n\n` +
    `Reply with ONLY the JSON object — no preamble, no code fence.`;

  const res = await anthropic.messages.create({
    model:     "claude-haiku-4-5",
    max_tokens: 1200,
    system:    SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = res.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");

  /* Be tolerant: model sometimes wraps in ```json``` despite the instruction. */
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<{
      description:     unknown;
      ownerName:       unknown;
      yearsInBusiness: unknown;
      serviceAreas:    unknown;
      specialties:     unknown;
      press:           unknown;
      awards:          unknown; /* legacy — older outputs still use this key */
      teamSize:        unknown;
      style:           unknown;
      faqs:            unknown;
    }>;
    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    if (!description) return null; /* Without a description there's nothing useful to persist. */
    /* Accept either `press` (new schema) or `awards` (legacy fallback)
     * so a Claude output that drifts back to the old key still parses. */
    const pressSource = Array.isArray(parsed.press)
      ? parsed.press
      : Array.isArray(parsed.awards)
        ? parsed.awards
        : [];
    /* Coerce faqs — accept only objects with non-empty question +
     * answer. Cap at 5 to avoid pathological pages where Claude
     * over-extracts from a long FAQ section. */
    const faqs: ExtractedFaq[] = Array.isArray(parsed.faqs)
      ? (parsed.faqs as unknown[])
          .map((entry): ExtractedFaq | null => {
            if (!entry || typeof entry !== "object") return null;
            const r = entry as Record<string, unknown>;
            const question = typeof r.question === "string" ? r.question.trim() : "";
            const answer   = typeof r.answer   === "string" ? r.answer.trim()   : "";
            if (!question || !answer) return null;
            return { question, answer };
          })
          .filter((f): f is ExtractedFaq => f != null)
          .slice(0, 5)
      : [];

    return {
      description,
      ownerName:       typeof parsed.ownerName === "string" && parsed.ownerName.trim() ? parsed.ownerName.trim() : null,
      yearsInBusiness: typeof parsed.yearsInBusiness === "number" && Number.isFinite(parsed.yearsInBusiness) ? parsed.yearsInBusiness : null,
      serviceAreas:    Array.isArray(parsed.serviceAreas) ? parsed.serviceAreas.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : [],
      specialties:     Array.isArray(parsed.specialties) ? parsed.specialties.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : [],
      press:           pressSource.filter((s): s is string => typeof s === "string" && s.trim().length > 0),
      teamSize:        typeof parsed.teamSize === "number" && Number.isFinite(parsed.teamSize) ? parsed.teamSize : null,
      style:           typeof parsed.style === "string" && parsed.style.trim() ? parsed.style.trim() : null,
      faqs,
    };
  } catch {
    return null;
  }
}

/* ─── Main ─────────────────────────────────────────────────────────── */

type Outcome =
  | { kind: "enriched" }
  | { kind: "no-content" }
  | { kind: "no-extract" }
  | { kind: "category-mismatch-hidden";  actualCategory: string | null; reason: string }
  | { kind: "category-mismatch-flagged"; actualCategory: string | null; reason: string }
  | { kind: "error"; message: string };

async function processVendor(
  vendor: Candidate,
  anthropic: Anthropic,
  dryRun: boolean,
): Promise<Outcome> {
  let content: string;
  try {
    content = await pickBestVariant(vendor.website);
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
  if (content.length < MIN_CHARS_FOR_CLAUDE) {
    return { kind: "no-content" };
  }

  /* Category relevance check — runs BEFORE bio extraction so wrong-
   * category vendors get hidden without burning the bio-extraction
   * call. The classifier reads the first ~1000 chars; on high-
   * confidence mismatch we hide + flag; medium-confidence we flag
   * only; low / relevant we proceed. */
  const verdict = await classifyCategoryRelevance({
    vendorName:     vendor.name,
    category:       vendor.category,
    websiteContent: content,
  });
  const action = actionForVerdict(verdict);

  if (action.kind === "hide") {
    console.log(
      `  MISMATCH: ${vendor.name} listed as ${vendor.category} but website suggests ${action.actualCategory ?? "?"}`,
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
        .where(eq(vendors.id, vendor.id));
    }
    return {
      kind:           "category-mismatch-hidden",
      actualCategory: action.actualCategory,
      reason:         action.reason,
    };
  }

  if (action.kind === "flag") {
    if (!dryRun) {
      await db
        .update(vendors)
        .set({ needsManualReview: true, updatedAt: new Date() })
        .where(eq(vendors.id, vendor.id));
    }
    /* Flagged-but-not-hidden vendors still get a bio — they're plausibly
     * relevant, just worth a manual eyeball. Fall through to extraction. */
  }

  let bio: ExtractedBio | null;
  try {
    bio = await extractBio(anthropic, content);
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
  if (!bio) return { kind: "no-extract" };

  if (!dryRun) {
    /* Tag each FAQ with source='vendor_website' so the Part-2 hybrid
     * UI on the vendor detail page can tell them apart from
     * OWV-generated category FAQs. */
    const taggedFaqs = bio.faqs.map((f) => ({
      question: f.question,
      answer:   f.answer,
      source:   "vendor_website" as const,
    }));
    await db
      .update(vendors)
      .set({
        description:      bio.description,
        ownerName:        bio.ownerName,
        yearsInBusiness:  bio.yearsInBusiness,
        specialties:      bio.specialties.length > 0 ? bio.specialties : null,
        serviceAreas:     bio.serviceAreas.length > 0 ? bio.serviceAreas : null,
        faqs:             taggedFaqs.length > 0 ? taggedFaqs : [],
        bioEnrichedAt:    new Date(),
        updatedAt:        new Date(),
      })
      .where(eq(vendors.id, vendor.id));

    /* Bump the composite ranking + flip is_indexable=true now that
     * the row carries a real description with a fresh
     * bio_enriched_at timestamp. Both flags are per-row updates so
     * the cost stays local to this vendor. */
    const {
      recomputeVendorDisplayRankScore,
      recomputeVendorIsIndexable,
    } = await import("../src/lib/queries");
    await recomputeVendorDisplayRankScore(vendor.id);
    await recomputeVendorIsIndexable(vendor.id);
  }

  return { kind: "enriched" };
}

type CatStats = {
  enriched:               number;
  noContent:              number;
  noExtract:              number;
  errored:                number;
  categoryMismatchHidden:  number;
  categoryMismatchFlagged: number;
};

function newStats(): CatStats {
  return {
    enriched: 0, noContent: 0, noExtract: 0, errored: 0,
    categoryMismatchHidden: 0, categoryMismatchFlagged: 0,
  };
}

async function main() {
  const { limit, dryRun } = parseArgs();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const candidates = await loadCandidates(limit);
  console.log(
    `Loaded ${candidates.length} candidate vendor(s)` +
      `${limit != null ? ` (limit=${limit})` : ""}${dryRun ? " · DRY RUN" : ""}`,
  );
  if (candidates.length === 0) {
    console.log("Nothing to do.");
    return;
  }
  console.log(`Estimated cost: ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(2)}`);

  const perCategory: Record<string, CatStats> = {};
  const totals = newStats();
  const failureSamples: Array<{ slug: string; reason: string }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const catName = c.category || "(unknown)";
    if (!perCategory[catName]) perCategory[catName] = newStats();
    const cat = perCategory[catName];

    const r = await processVendor(c, anthropic, dryRun);
    switch (r.kind) {
      case "enriched":
        cat.enriched++; totals.enriched++;
        console.log(`  ✓ ${c.slug} (${catName})`);
        break;
      case "no-content":
        cat.noContent++; totals.noContent++;
        failureSamples.push({ slug: c.slug, reason: "no-content" });
        break;
      case "no-extract":
        cat.noExtract++; totals.noExtract++;
        failureSamples.push({ slug: c.slug, reason: "no-extract" });
        break;
      case "category-mismatch-hidden":
        cat.categoryMismatchHidden++; totals.categoryMismatchHidden++;
        failureSamples.push({
          slug:   c.slug,
          reason: `mismatch HIDE — ${r.actualCategory ?? "?"} (${r.reason.slice(0, 50)})`,
        });
        break;
      case "category-mismatch-flagged":
        cat.categoryMismatchFlagged++; totals.categoryMismatchFlagged++;
        break;
      case "error":
        cat.errored++; totals.errored++;
        failureSamples.push({ slug: c.slug, reason: r.message.slice(0, 80) });
        break;
    }

    /* Progress line every 20 vendors so long runs are inspectable */
    if ((i + 1) % 20 === 0) {
      console.log(
        `  ── ${i + 1}/${candidates.length} · enriched=${totals.enriched} ` +
          `no-content=${totals.noContent} no-extract=${totals.noExtract} ` +
          `mismatch:hidden=${totals.categoryMismatchHidden} ` +
          `mismatch:flagged=${totals.categoryMismatchFlagged} errored=${totals.errored}`,
      );
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log("\n=== Per-category summary ===");
  console.log(
    `${"category".padEnd(20)} ${"enriched".padStart(9)} ${"no-content".padStart(11)} ` +
      `${"no-extract".padStart(11)} ${"errored".padStart(8)}`,
  );
  for (const [name, s] of Object.entries(perCategory).sort()) {
    if (s.enriched + s.noContent + s.noExtract + s.errored === 0) continue;
    console.log(
      `${name.padEnd(20)} ${String(s.enriched).padStart(9)} ${String(s.noContent).padStart(11)} ` +
        `${String(s.noExtract).padStart(11)} ${String(s.errored).padStart(8)}`,
    );
  }

  console.log("\n=== Grand totals ===");
  console.log(`Enriched:                  ${totals.enriched}${dryRun ? " (dry run — no writes)" : ""}`);
  console.log(`No content:                ${totals.noContent}`);
  console.log(`No extract:                ${totals.noExtract}`);
  console.log(`Category mismatches detected: ${totals.categoryMismatchHidden + totals.categoryMismatchFlagged} vendors`);
  console.log(`  → hidden (high confidence):    ${totals.categoryMismatchHidden}`);
  console.log(`  → flagged for review (medium): ${totals.categoryMismatchFlagged}`);
  console.log(`Errored:                   ${totals.errored}`);
  console.log(`Actual cost: ~$${(candidates.length * COST_PER_VENDOR_USD).toFixed(2)}`);

  if (failureSamples.length > 0 && failureSamples.length <= 25) {
    console.log("\nIssue samples:");
    for (const f of failureSamples.slice(0, 25)) console.log(`  ${f.slug} — ${f.reason}`);
  } else if (failureSamples.length > 25) {
    console.log(`\n${failureSamples.length} issues total (first 15):`);
    for (const f of failureSamples.slice(0, 15)) console.log(`  ${f.slug} — ${f.reason}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
