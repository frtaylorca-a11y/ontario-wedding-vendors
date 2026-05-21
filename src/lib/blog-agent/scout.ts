/**
 * Blog scout — fetches the 10 directories, extracts recent post
 * titles, scores them for Ontario-relevance + topic value, and
 * writes everything (good + bad) to blog_scout_log for audit.
 *
 * Returns the persisted rows so downstream steps can pick the
 * highest-scoring unused title.
 */
import * as cheerio from "cheerio";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogScoutLog } from "@/lib/schema";
import { BLOG_POSTS } from "@/lib/blog";

export type Directory = { name: string; url: string };

export const DIRECTORIES: Directory[] = [
  { name: "The Knot",                url: "https://www.theknot.com/content" },
  { name: "WeddingWire",             url: "https://www.weddingwire.com/wedding-ideas" },
  { name: "Zola",                    url: "https://www.zola.com/expert-advice" },
  { name: "Brides",                  url: "https://www.brides.com/wedding-ideas-4800090" },
  { name: "Elegant Wedding",         url: "https://www.elegantwedding.ca" },
  { name: "Style Me Pretty Canada",  url: "https://www.stylemepretty.com/canada" },
  { name: "June Bug Weddings",       url: "https://junebugweddings.com/wedding-blog" },
  { name: "Green Wedding Shoes",     url: "https://greenweddingshoes.com" },
  { name: "Martha Stewart Weddings", url: "https://www.marthastewart.com/weddings" },
  { name: "Wedding Chicks",          url: "https://www.weddingchicks.com" },
];

export type ScoutItem = {
  title:      string;
  sourceName: string;
  sourceUrl:  string | null;
  score:      number;
};

/* ─── Title extraction ───────────────────────────────────────────── */

/* Generic title harvester — works on most editorial sites because they
 * all wrap post titles in <a> within <article>, <h2>, or <h3>. We dedupe
 * by lowercase text and trim to 4-140 chars to drop nav / category
 * link noise. The per-directory parser is intentionally NOT bespoke:
 * a single heuristic is easier to maintain than 10 brittle scrapers. */
function harvestTitles(html: string, baseUrl: string): { title: string; url: string }[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];

  const sels = [
    "article h2 a",
    "article h3 a",
    "main h2 a",
    "main h3 a",
    "h2 a",
    "h3 a",
  ];
  for (const sel of sels) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim().replace(/\s+/g, " ");
      if (text.length < 4 || text.length > 140) return;
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const href = $el.attr("href") ?? "";
      let url = href;
      if (href.startsWith("/")) {
        try { url = new URL(href, baseUrl).toString(); } catch { url = href; }
      } else if (!href.startsWith("http")) {
        return;  /* skip mailto, anchors, javascript: */
      }
      out.push({ title: text, url });
      if (out.length >= 40) return false;
    });
    if (out.length >= 40) break;
  }
  return out;
}

async function fetchDirectory(dir: Directory): Promise<{ title: string; url: string }[]> {
  try {
    const res = await fetch(dir.url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; OntarioWeddingVendorsBot/1.0; +https://ontarioweddingvendors.com)",
        accept: "text/html,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.warn(`[scout] ${dir.name} returned ${res.status}`);
      return [];
    }
    const html = await res.text();
    return harvestTitles(html, dir.url);
  } catch (err) {
    console.warn(`[scout] ${dir.name} fetch failed:`, err);
    return [];
  }
}

/* ─── Scoring ────────────────────────────────────────────────────── */

const COST_RE     = /\b(cost|price|pricing|budget|how much|cheap|affordable|expensive)\b/i;
const HOWTO_RE    = /\b(how to|guide|tips|checklist|what to|when to|do you need|should you|steps)\b/i;
const VENUE_RE    = /\b(venue|location|place|barn|winery|estate|outdoor|garden|hotel|resort|hall)\b/i;
const TREND_RE    = /\b(trend|2026|2027|inspir|style|theme|aesthetic|colou?r palette|new for)\b/i;
const REAL_WED_RE = /\b(real wedding|featured wedding|spotlight|story|gallery|see.*wedding)\b/i;
const CELEB_RE    = /\b(celebrity|royal|kardashian|jenner|bieber|beyonce|swift|hollywood|red carpet)\b/i;
const ONTARIO_RE  = /\b(ontario|niagara|toronto|gta|hamilton|burlington|oakville|muskoka|cottage country)\b/i;

export function scoreTitle(title: string): number {
  let score = 0;
  if (COST_RE.test(title))     score += 8;
  if (HOWTO_RE.test(title))    score += 7;
  if (VENUE_RE.test(title))    score += 6;
  if (TREND_RE.test(title))    score += 5;
  if (REAL_WED_RE.test(title)) score -= 10;
  if (CELEB_RE.test(title))    score -= 5;
  /* Bonus if the title already references Ontario — those are gold. */
  if (ONTARIO_RE.test(title))  score += 4;
  return score;
}

/* ─── Dedupe vs our own blog ─────────────────────────────────────── */

/* A topic is "covered" if any existing TSX post OR DB post shares
 * 3+ significant words with the candidate title. Stopwords excluded.
 * Restricted to posts published in the last 90 days. */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at",
  "by", "with", "from", "your", "you", "my", "our", "this", "that",
  "is", "are", "be", "do", "what", "how", "why", "when", "where",
  "wedding", "weddings",  /* too common to be discriminating */
]);

function significantTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

export function topicAlreadyCovered(title: string, existingTitles: string[]): boolean {
  const candidate = new Set(significantTokens(title));
  if (candidate.size < 2) return true;  /* too generic */
  for (const t of existingTitles) {
    const ex = new Set(significantTokens(t));
    let overlap = 0;
    for (const w of candidate) if (ex.has(w)) overlap++;
    if (overlap >= 3) return true;
    /* For shorter candidates, a 2-word overlap with most-of-candidate is enough. */
    if (candidate.size <= 3 && overlap >= 2) return true;
  }
  return false;
}

/* ─── Persistence + selection ────────────────────────────────────── */

export async function runScout(): Promise<ScoutItem[]> {
  const fetched = await Promise.all(
    DIRECTORIES.map(async (dir) => {
      const items = await fetchDirectory(dir);
      return { dir, items };
    }),
  );

  /* Build the existing-titles set from BOTH static blog and DB blog. */
  const dbTitles = await db
    .select({ title: sql<string>`title` })
    .from(sql`blog_posts`)
    .where(sql`is_published = TRUE AND published_at > NOW() - INTERVAL '90 days'`);
  const existingTitles = [
    ...BLOG_POSTS.map((p) => p.title),
    ...dbTitles.map((r) => r.title),
  ];

  const candidates: ScoutItem[] = [];
  for (const { dir, items } of fetched) {
    for (const it of items) {
      const score = scoreTitle(it.title);
      candidates.push({
        title:      it.title,
        sourceName: dir.name,
        sourceUrl:  it.url ?? null,
        score,
      });
    }
  }

  /* Persist every candidate so the scout log is a complete audit. */
  if (candidates.length > 0) {
    await db
      .insert(blogScoutLog)
      .values(candidates.map((c) => ({
        title:      c.title,
        sourceName: c.sourceName,
        sourceUrl:  c.sourceUrl ?? undefined,
        score:      c.score,
        used:       false,
      })))
      .onConflictDoNothing();
  }

  /* Annotate dedupe AFTER persistence (so audit shows raw score). */
  return candidates
    .filter((c) => !topicAlreadyCovered(c.title, existingTitles))
    .filter((c) => c.score >= 5)
    .sort((a, b) => b.score - a.score);
}

/* Pick a topic with a run-of-day bias.
 * Morning: prioritize cost + how-to.
 * Afternoon: prioritize venue + inspiration.
 * Evening (first 90 posts only): local city + vendor-specific posts. */
const CITY_VENDOR_RE = /\b(niagara|toronto|gta|hamilton|burlington|oakville|muskoka|notl)\b.*\b(photograph|dj|florist|venue|caterer|cake|hair|makeup|planner|photo booth|limo|barn|winery|estate)\b/i;

export function pickTopic(
  candidates: ScoutItem[],
  run: "morning" | "afternoon" | "evening",
): ScoutItem | null {
  if (candidates.length === 0) return null;

  /* Compute a bias-adjusted score for the selection without mutating
   * the original score (which gets persisted). */
  const ranked = candidates
    .map((c) => {
      let adj = c.score;
      if (run === "morning") {
        if (COST_RE.test(c.title))  adj += 3;
        if (HOWTO_RE.test(c.title)) adj += 2;
      } else if (run === "afternoon") {
        if (VENUE_RE.test(c.title)) adj += 3;
        if (TREND_RE.test(c.title)) adj += 2;
      } else {
        /* Evening — bias toward (city × vendor) combos. */
        if (CITY_VENDOR_RE.test(c.title)) adj += 4;
      }
      return { c, adj };
    })
    .sort((a, b) => b.adj - a.adj);

  return ranked[0].c;
}

/* Look up an existing scout-log row by (source, title) and flip its
 * used flag to true once we generate a post from it. */
export async function markScoutItemUsed(
  sourceName: string,
  title:      string,
  ourPostSlug: string,
): Promise<void> {
  await db
    .update(blogScoutLog)
    .set({ used: true, usedAt: new Date(), ourPostSlug })
    .where(
      and(
        eq(blogScoutLog.sourceName, sourceName),
        eq(blogScoutLog.title, title),
      ),
    );
}

/* Used by the admin UI: most recent N candidates with their used flag. */
export async function listRecentScout(limit = 100, onlyUnused = false) {
  const where = onlyUnused
    ? and(eq(blogScoutLog.used, false), gt(blogScoutLog.score, 4))
    : undefined;
  const rows = await db
    .select()
    .from(blogScoutLog)
    .where(where)
    .orderBy(desc(blogScoutLog.discoveredAt))
    .limit(limit);
  return rows;
}
