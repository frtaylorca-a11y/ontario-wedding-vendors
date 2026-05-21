/**
 * Daily agent — orchestrates scout → score → pick → generate →
 * (optional image) → (optional adapters) → persist.
 *
 * The agent is intentionally idempotent at the topic level: it locks
 * a topic by writing the blog_posts row early (is_published=false)
 * and refusing to overwrite an existing slug. Re-running the morning
 * pipeline produces a different topic, not a duplicate.
 */
import { and, desc, eq, gte, count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, blogAgentSettings, contentDistributionLog } from "@/lib/schema";
import { BLOG_POSTS } from "@/lib/blog";
import {
  runScout,
  pickTopic,
  markScoutItemUsed,
  type ScoutItem,
} from "@/lib/blog-agent/scout";
import { generateBlogPost, type BlogGenerateInput } from "@/lib/blog-generate";
import { generateAndUploadHeroImage } from "@/lib/blog-agent/hero-image";
import { adaptForPlatforms } from "@/lib/blog-agent/adapter";
import {
  publishToGbp,
  publishToInstagram,
  publishToFacebook,
  publishToPinterest,
  type PublishResult,
} from "@/lib/blog-agent/publishers";

const ONTARIO_REGION_RE  = /\b(niagara|toronto|gta|hamilton|burlington|oakville|muskoka)\b/i;
const COST_RE     = /\b(cost|price|pricing|budget|how much)\b/i;
const HOWTO_RE    = /\b(how to|guide|tips|checklist)\b/i;
const VENUE_RE    = /\b(venue|location|barn|winery|estate|outdoor|hotel|resort|hall)\b/i;
const CATEGORY_RE = [
  { re: /\b(photograph|photographer)\b/i,  cat: "photographer" as const },
  { re: /\bvideograph/i,                   cat: "videographer" as const },
  { re: /\bdj\b/i,                         cat: "dj" as const },
  { re: /\bflorist|flower/i,               cat: "florist" as const },
  { re: /\bofficiant/i,                    cat: "officiant" as const },
  { re: /\bhair.+makeup|makeup/i,          cat: "hair_makeup" as const },
  { re: /\bcater/i,                        cat: "catering" as const },
  { re: /\bplanner|coordinator/i,          cat: "wedding_planner" as const },
  { re: /\bcake/i,                         cat: "cake" as const },
  { re: /\blimo|transport/i,               cat: "limo" as const },
  { re: /\bphoto booth|photobooth/i,       cat: "photo_booth" as const },
  { re: /\blighting|decor/i,               cat: "lighting_decor" as const },
];

/* Infer the BlogGenerateInput from a scouted title + run-of-day. */
function inferGenerateInput(item: ScoutItem, run: "morning" | "afternoon" | "evening"): BlogGenerateInput {
  const t = item.title;
  /* Region — bias by the title; default niagara on morning, all on
   * afternoon, niagara again on evening (local-bias slot). */
  let targetRegion: BlogGenerateInput["targetRegion"] = run === "afternoon" ? "all" : "niagara";
  if (/\bniagara|notl|st\.?\s*catharines\b/i.test(t)) targetRegion = "niagara";
  else if (/\btoronto|gta\b/i.test(t))                 targetRegion = "gta";
  else if (/\bhamilton|burlington|oakville\b/i.test(t)) targetRegion = "hamilton";

  /* Category — first match wins; null means topic/venue post. */
  let category: BlogGenerateInput["category"] = null;
  for (const { re, cat } of CATEGORY_RE) {
    if (re.test(t)) { category = cat; break; }
  }
  if (!category && VENUE_RE.test(t)) category = "venue";

  return {
    topic:             t,
    competitorUrl:     item.sourceUrl ?? "",  /* may be empty — generator handles */
    targetKeyword:     buildKeyword(t, targetRegion),
    targetRegion,
    category,
    internalLinkCount: 2,
  };
}

function buildKeyword(title: string, region: BlogGenerateInput["targetRegion"]): string {
  /* Strip leading words like "How to", "The best…" then prepend the
   * region for SEO weight. */
  const stripped = title
    .replace(/^(how to|the best|top \d+|guide to|the complete|a beginner's guide to|the ultimate)\s+/i, "")
    .replace(/\s+\d{4}\s*$/, "")
    .slice(0, 80)
    .trim();
  const r = region === "all" ? "Ontario" : region.replace(/\b\w/g, (c) => c.toUpperCase());
  return `${r} ${stripped}`.toLowerCase();
}

/* ─── Settings + cron gating ─────────────────────────────────────── */

export type AgentSettings = {
  autoPublish:       boolean;
  dailyRunEnabled:   boolean;
  minWordCount:      number;
  maxWordCount:      number;
  targetRegions:     string[];
  wordCountPillar:   number;
  wordCountStandard: number;
  wordCountLocal:    number;
  launchBurstLimit:  number;
  clusterMode:       boolean;
  currentCluster:    string | null;
};

export async function getSettings(): Promise<AgentSettings> {
  const [row] = await db
    .select()
    .from(blogAgentSettings)
    .where(eq(blogAgentSettings.id, 1))
    .limit(1);
  if (!row) {
    return {
      autoPublish: false, dailyRunEnabled: true,
      minWordCount: 700, maxWordCount: 900,
      targetRegions: ["niagara", "gta", "hamilton"],
      wordCountPillar: 2200, wordCountStandard: 1700, wordCountLocal: 1000,
      launchBurstLimit: 90, clusterMode: false, currentCluster: null,
    };
  }
  return {
    autoPublish:       row.autoPublish     ?? false,
    dailyRunEnabled:   row.dailyRunEnabled ?? true,
    minWordCount:      row.minWordCount    ?? 700,
    maxWordCount:      row.maxWordCount    ?? 900,
    targetRegions:     Array.isArray(row.targetRegions) ? (row.targetRegions as string[]) : ["niagara"],
    wordCountPillar:   row.wordCountPillar   ?? 2200,
    wordCountStandard: row.wordCountStandard ?? 1700,
    wordCountLocal:    row.wordCountLocal    ?? 1000,
    launchBurstLimit:  row.launchBurstLimit  ?? 90,
    clusterMode:       row.clusterMode       ?? false,
    currentCluster:    row.currentCluster    ?? null,
  };
}

/* ─── Daily cadence — Addendum B ─────────────────────────────────── */

/* 3 posts/day until total published >= launchBurstLimit; 2/day after. */
export async function maxDailyAllowed(settings: AgentSettings): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true));
  return Number(value) < settings.launchBurstLimit ? 3 : 2;
}

export async function countPostsToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [{ value }] = await db
    .select({ value: count() })
    .from(blogPosts)
    .where(and(eq(blogPosts.isPublished, true), gte(blogPosts.publishedAt, startOfDay)));
  return Number(value);
}

/* ─── Topic-length classification — Addendum A ───────────────────── */

const PILLAR_RE = /\b(complete guide|ultimate|checklist|timeline|best venues|top \d+|everything you need|planning guide|comprehensive)\b/i;
const STANDARD_RE = /\b(how to choose|how much does|cost of|questions to ask|tips for|what to look for|how to)\b/i;
/* "Local/specific" — city + vendor combos: "wedding DJ Hamilton",
 * "florist Niagara Falls". Detected when the title has BOTH a city
 * marker AND a vendor-category word. */
const CITY_RE = /\b(niagara|toronto|gta|hamilton|burlington|oakville|muskoka|notl|niagara-on-the-lake|st\.?\s*catharines|kitchener|waterloo|guelph|barrie|collingwood|ottawa|kingston|london|brantford)\b/i;
const VENDOR_RE = /\b(photographer|videographer|dj|florist|caterer|officiant|hair|makeup|cake|limo|photo booth|planner|venue|barn|winery|estate)\b/i;

export type LengthClass = "pillar" | "standard" | "local";

export function classifyTopicLength(title: string): LengthClass {
  if (PILLAR_RE.test(title))     return "pillar";
  if (STANDARD_RE.test(title))   return "standard";
  if (CITY_RE.test(title) && VENDOR_RE.test(title)) return "local";
  return "standard";
}

export function targetWordCountFor(cls: LengthClass, settings: AgentSettings): number {
  switch (cls) {
    case "pillar":   return settings.wordCountPillar;
    case "standard": return settings.wordCountStandard;
    case "local":    return settings.wordCountLocal;
  }
}

/* ─── Cluster matcher — Addendum D ───────────────────────────────── */

/* Buckets: 'photography', 'venues', 'budget', 'planning', 'vendors',
 * 'regional'. The match is regex-based and intentionally permissive
 * — clusterMode is a topical bias, not a strict filter. */
const CLUSTER_PATTERNS: Record<string, RegExp> = {
  photography: /\b(photograph|videograph|engagement\s+photo)/i,
  venues:      /\b(venue|barn|winery|estate|hotel|resort|hall|outdoor|garden|conservation)/i,
  budget:      /\b(cost|price|pricing|budget|how much|cheap|affordable|expensive|save\s+money)/i,
  planning:    /\b(plan|checklist|timeline|how to|guide|tips|questions|when to|red flag)/i,
  vendors:     /\b(dj|florist|caterer|cake|hair|makeup|officiant|photo booth|limo|planner|coordinator|lighting|decor)/i,
  regional:    /\b(niagara|toronto|gta|hamilton|burlington|oakville|muskoka|notl|st\.?\s*catharines|kitchener|waterloo|guelph|barrie|collingwood|ottawa|kingston|london)/i,
};

export function topicMatchesCluster(title: string, cluster: string): boolean {
  const re = CLUSTER_PATTERNS[cluster.toLowerCase()];
  if (!re) return true;  /* unknown cluster name — don't filter */
  return re.test(title);
}

/* ─── Competitor depth check — Addendum A ────────────────────────── */

/* Fetch the competitor URL and estimate word count from raw text.
 * char_count / 5 is the common shorthand for word count. Returns
 * 0 when we can't fetch (fail-open — caller uses class default). */
export async function estimateCompetitorWordCount(url: string): Promise<number> {
  if (!url) return 0;
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; OntarioWeddingVendorsBot/1.0; +https://ontarioweddingvendors.com)",
        accept: "text/html,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return 0;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return Math.floor(text.length / 5);
  } catch {
    return 0;
  }
}

/* ─── Existing-title dedupe (used by scout pre-filter too) ───────── */

export async function publishedPostTitlesRecent(): Promise<string[]> {
  const dbRows = await db
    .select({ title: blogPosts.title })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, true))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(200);
  return [...BLOG_POSTS.map((p) => p.title), ...dbRows.map((r) => r.title)];
}

/* ─── The daily pipeline ─────────────────────────────────────────── */

export type DailyAgentResult = {
  ok:           boolean;
  reason?:      string;        /* set when ok=false */
  topic?:       string;
  slug?:        string;
  postId?:      number;
  wordCount?:   number;
  autoPublished: boolean;
  scoutLogged:  number;
  /* Image-pipeline outcome — null when no attempt was made. */
  heroImage?: {
    status:     "ok" | "skipped" | "failed";
    url?:       string;
    reason?:    string;
    exifStatus?: string;
  };
  /* Distribution-pipeline outcomes — one entry per platform attempt. */
  distribution?: PublishResult[];
};

export async function runDailyAgent(run: "morning" | "afternoon" | "evening"): Promise<DailyAgentResult> {
  const settings = await getSettings();
  if (!settings.dailyRunEnabled) {
    return { ok: false, reason: "daily_run_enabled is false", autoPublished: false, scoutLogged: 0 };
  }

  /* Addendum B — cadence cap. */
  const maxDaily   = await maxDailyAllowed(settings);
  const todayCount = await countPostsToday();
  if (todayCount >= maxDaily) {
    return {
      ok: false,
      reason: `daily cap reached (${todayCount}/${maxDaily} posts published today)`,
      autoPublished: false,
      scoutLogged: 0,
    };
  }

  /* 1. Scout. */
  const candidates = await runScout();
  if (candidates.length === 0) {
    return { ok: false, reason: "scout found no usable topics", autoPublished: false, scoutLogged: 0 };
  }

  /* Addendum D — cluster filter. When cluster_mode is on, restrict the
   * candidate pool to topics that look like they belong to the active
   * cluster. Falls back to the unfiltered pool if filtering would
   * empty the pool. */
  const clusterCandidates = settings.clusterMode && settings.currentCluster
    ? candidates.filter((c) => topicMatchesCluster(c.title, settings.currentCluster!))
    : candidates;
  const workingPool = clusterCandidates.length > 0 ? clusterCandidates : candidates;

  /* 2. Pick — try the top candidate, then walk down the list if the
   *    generator fails (most commonly: competitor URL 403/timeout). */
  let lastError: string | null = null;
  for (let i = 0; i < Math.min(workingPool.length, 5); i++) {
    const item = pickTopic(workingPool.slice(i), run);
    if (!item) break;

    const input = inferGenerateInput(item, run);
    if (!input.competitorUrl) {
      lastError = "no competitor URL on candidate";
      continue;
    }

    /* Addendum A — smart word count. Floor = max(typeTarget, competitor + 200). */
    const lengthClass     = classifyTopicLength(item.title);
    const classTarget     = targetWordCountFor(lengthClass, settings);
    const competitorWords = await estimateCompetitorWordCount(input.competitorUrl);
    input.targetWordCount = Math.max(classTarget, competitorWords + 200);

    try {
      const draft = await generateBlogPost(input);

      /* Refuse to overwrite an existing slug. */
      const [exists] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.slug, draft.slug))
        .limit(1);
      if (exists) {
        lastError = `slug already exists: ${draft.slug}`;
        continue;
      }

      const willPublish = settings.autoPublish;
      const tags = buildTags(item.title, input.targetRegion, input.category);

      const excerpt = buildExcerpt(draft.content);
      const [row] = await db
        .insert(blogPosts)
        .values({
          slug:             draft.slug,
          title:            draft.title,
          content:          draft.content,
          metaDescription:  draft.metaDescription || null,
          excerpt,
          category:         input.category ?? null,
          tags,
          publishedAt:      willPublish ? new Date() : null,
          wordCount:        draft.wordCount,
          sourceTopic:      item.title,
          sourceDirectory:  item.sourceName,
          internalLinks:    draft.internalLinks,
          isPublished:      willPublish,
          isAiGenerated:    true,
        })
        .returning({ id: blogPosts.id });

      await markScoutItemUsed(item.sourceName, item.title, draft.slug);

      /* Image pipeline — best-effort. A skip or failure does NOT roll
       * back the post. */
      let heroResult: DailyAgentResult["heroImage"];
      try {
        const r = await generateAndUploadHeroImage({
          postSlug: draft.slug,
          title:    draft.title,
          excerpt,
        });
        if (r.kind === "ok") {
          await db
            .update(blogPosts)
            .set({
              heroImageUrl:         r.url,
              heroImageAlt:         r.alt,
              heroImagePrompt:      r.prompt,
              heroImageGeneratedAt: new Date(),
              updatedAt:            new Date(),
            })
            .where(eq(blogPosts.id, row.id));
          heroResult = { status: "ok", url: r.url, exifStatus: r.exifStatus };
        } else {
          heroResult = { status: "skipped", reason: r.reason };
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[daily-agent] hero image failed for ${draft.slug}:`, reason);
        heroResult = { status: "failed", reason };
      }

      /* Distribution — only attempt when the post is actually being
       * published. Drafts (autoPublish=false) skip the social rollout. */
      let distribution: PublishResult[] | undefined;
      if (willPublish) {
        try {
          distribution = await distributeToPlatforms({
            postId:       row.id,
            slug:         draft.slug,
            title:        draft.title,
            excerpt,
            contentBody:  draft.content,
            category:     input.category ?? null,
            region:       input.targetRegion,
            heroImageUrl: heroResult?.url ?? null,
          });
        } catch (err) {
          console.warn(`[daily-agent] distribution failed for ${draft.slug}:`,
            err instanceof Error ? err.message : err);
        }
      }

      return {
        ok:            true,
        topic:         item.title,
        slug:          draft.slug,
        postId:        row.id,
        wordCount:     draft.wordCount,
        autoPublished: willPublish,
        scoutLogged:   candidates.length,
        heroImage:     heroResult,
        distribution,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[daily-agent] generator failed on candidate ${i}:`, lastError);
      /* fall through to next candidate */
    }
  }

  return {
    ok: false,
    reason: `generator exhausted ${Math.min(candidates.length, 5)} candidates; last: ${lastError ?? "unknown"}`,
    autoPublished: false,
    scoutLogged: candidates.length,
  };
}

function buildTags(
  title: string,
  region: BlogGenerateInput["targetRegion"],
  category: BlogGenerateInput["category"],
): string[] {
  const tags = new Set<string>(["Ontario weddings"]);
  if (region === "niagara")  tags.add("Niagara");
  if (region === "gta")      tags.add("GTA");
  if (region === "hamilton") tags.add("Hamilton");
  if (category && category !== "venue") tags.add(category.replace(/_/g, " "));
  if (COST_RE.test(title))   tags.add("Cost guide");
  if (HOWTO_RE.test(title))  tags.add("How-to");
  if (VENUE_RE.test(title))  tags.add("Venues");
  return Array.from(tags);
}

function buildExcerpt(markdown: string): string {
  /* First paragraph stripped of headings, ~50 words. */
  const first = markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .find((p) => !p.startsWith("#") && p.length > 60);
  if (!first) return markdown.slice(0, 240);
  const words = first.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").split(/\s+/);
  return words.slice(0, 50).join(" ") + (words.length > 50 ? "…" : "");
}

/* ─── Distribution orchestrator ─────────────────────────────────── */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

async function distributeToPlatforms(opts: {
  postId:       number;
  slug:         string;
  title:        string;
  excerpt:      string;
  contentBody:  string;
  category:     string | null;
  region:       string | null;
  heroImageUrl: string | null;
}): Promise<PublishResult[]> {
  const postUrl = `${SITE_URL}/blog/${opts.slug}`;

  /* 1. Adapt — single Claude call produces all platform shapes. */
  const adapted = await adaptForPlatforms({
    title:       opts.title,
    excerpt:     opts.excerpt,
    contentBody: opts.contentBody,
    postUrl,
    category:    opts.category,
    region:      opts.region,
  });

  /* 2. Publish in parallel. Each publisher self-handles missing
   *    credentials with a 'skipped' result — never throws. */
  const fail = (platform: string, err: unknown): PublishResult => ({
    platform,
    status: "failed",
    reason: err instanceof Error ? err.message : String(err),
  });

  const results: PublishResult[] = await Promise.all([
    publishToGbp({
      postUrl,
      adapted,
      heroImageUrl: opts.heroImageUrl,
    }).catch((err) => fail("gbp", err)),
    publishToInstagram({
      caption:      adapted.instagram.caption,
      hashtags:     adapted.instagram.hashtags,
      heroImageUrl: opts.heroImageUrl,
    }).catch((err) => fail("instagram", err)),
    publishToFacebook({
      text:         adapted.facebook.text,
      postUrl,
      heroImageUrl: opts.heroImageUrl,
    }).catch((err) => fail("facebook", err)),
    publishToPinterest({
      title:        adapted.pinterest.title,
      description:  adapted.pinterest.description,
      board:        adapted.pinterest.board,
      postUrl,
      heroImageUrl: opts.heroImageUrl,
    }).catch((err) => fail("pinterest", err)),
  ]);

  /* 3. Persist content_distribution_log rows for every attempt. */
  await db.insert(contentDistributionLog).values(
    results.map((r) => ({
      blogPostId:     opts.postId,
      platform:       r.platform,
      platformPostId: r.platformPostId ?? null,
      publishedAt:    r.status === "published" ? new Date() : null,
      status:         r.status,
      errorMessage:   r.reason ?? null,
    })),
  );

  return results;
}
