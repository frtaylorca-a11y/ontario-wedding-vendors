/**
 * Daily agent — orchestrates scout → score → pick → generate →
 * (optional image) → (optional adapters) → persist.
 *
 * The agent is intentionally idempotent at the topic level: it locks
 * a topic by writing the blog_posts row early (is_published=false)
 * and refusing to overwrite an existing slug. Re-running the morning
 * pipeline produces a different topic, not a duplicate.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts, blogAgentSettings } from "@/lib/schema";
import { BLOG_POSTS } from "@/lib/blog";
import {
  runScout,
  pickTopic,
  markScoutItemUsed,
  type ScoutItem,
} from "@/lib/blog-agent/scout";
import { generateBlogPost, type BlogGenerateInput } from "@/lib/blog-generate";
import { generateAndUploadHeroImage } from "@/lib/blog-agent/hero-image";

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
function inferGenerateInput(item: ScoutItem, run: "morning" | "afternoon"): BlogGenerateInput {
  const t = item.title;
  /* Region — bias by the title; default niagara on morning, all on afternoon. */
  let targetRegion: BlogGenerateInput["targetRegion"] = run === "morning" ? "niagara" : "all";
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

export async function getSettings(): Promise<{
  autoPublish:     boolean;
  dailyRunEnabled: boolean;
  minWordCount:    number;
  maxWordCount:    number;
  targetRegions:   string[];
}> {
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
    };
  }
  return {
    autoPublish:     row.autoPublish     ?? false,
    dailyRunEnabled: row.dailyRunEnabled ?? true,
    minWordCount:    row.minWordCount    ?? 700,
    maxWordCount:    row.maxWordCount    ?? 900,
    targetRegions:   Array.isArray(row.targetRegions) ? (row.targetRegions as string[]) : ["niagara"],
  };
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
};

export async function runDailyAgent(run: "morning" | "afternoon"): Promise<DailyAgentResult> {
  const settings = await getSettings();
  if (!settings.dailyRunEnabled) {
    return { ok: false, reason: "daily_run_enabled is false", autoPublished: false, scoutLogged: 0 };
  }

  /* 1. Scout. */
  const candidates = await runScout();
  if (candidates.length === 0) {
    return { ok: false, reason: "scout found no usable topics", autoPublished: false, scoutLogged: 0 };
  }

  /* 2. Pick — try the top candidate, then walk down the list if the
   *    generator fails (most commonly: competitor URL 403/timeout). */
  let lastError: string | null = null;
  for (let i = 0; i < Math.min(candidates.length, 5); i++) {
    const item = pickTopic(candidates.slice(i), run);
    if (!item) break;

    const input = inferGenerateInput(item, run);
    if (!input.competitorUrl) {
      lastError = "no competitor URL on candidate";
      continue;
    }

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

      return {
        ok:            true,
        topic:         item.title,
        slug:          draft.slug,
        postId:        row.id,
        wordCount:     draft.wordCount,
        autoPublished: willPublish,
        scoutLogged:   candidates.length,
        heroImage:     heroResult,
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
