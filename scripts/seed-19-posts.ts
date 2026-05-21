/**
 * Bootstrap script — generates the 19 specified blog posts through the
 * existing generateBlogPost pipeline and writes them to blog_posts.
 *
 * Each post:
 *   - Runs through the full pipeline (competitor fetch + Ontario pricing
 *     + internal-link injection + cross-site Pic Booth link when relevant)
 *   - Persisted with isPublished=true, isAiGenerated=true
 *   - publishedAt is staggered every 2 weeks starting June 2, 2026
 *
 * Resumability: if a slug already exists in blog_posts the script skips
 * that topic. Safe to re-run after a failure.
 *
 * Cost: ~19 × $0.02 ≈ $0.40 for Sonnet 4.6 generation. No images here —
 * run scripts/seed-19-post-images.ts after if you want hero images.
 *
 * Run:
 *   npx tsx scripts/seed-19-posts.ts                 # all 19
 *   npx tsx scripts/seed-19-posts.ts --only 1,3,11   # specific positions
 *   npx tsx scripts/seed-19-posts.ts --dry-run       # show what would run
 */
import { eq } from "drizzle-orm";
import "dotenv/config";
import { db } from "../src/lib/db";
import { blogPosts } from "../src/lib/schema";
import { generateBlogPost, type BlogGenerateInput } from "../src/lib/blog-generate";

type SeedPost = {
  /* Position in the list — also used by --only. */
  n:              number;
  topic:          string;
  targetKeyword:  string;
  targetRegion:   BlogGenerateInput["targetRegion"];
  category:       BlogGenerateInput["category"];
  competitorUrl:  string;
  /* Length class — drives targetWordCount. */
  length:         "standard" | "pillar";
};

/* The 19 posts, in the order specified. Competitor URLs default to
 * theknot.com guides when the user didn't specify one (Google's index
 * makes them the canonical comparison post). */
const POSTS: SeedPost[] = [
  /* ─── 12 how-to-choose posts (1,500-2,000 words) ───────────────── */
  {
    n: 1,  topic: "How to Choose a Wedding Photographer in Ontario",
    targetKeyword: "how to choose wedding photographer Ontario",
    targetRegion: "all", category: "photographer", length: "standard",
    competitorUrl: "https://www.theknot.com/content/how-to-choose-wedding-photographer",
  },
  {
    n: 2,  topic: "How to Choose a Wedding Videographer in Ontario",
    targetKeyword: "how to choose wedding videographer Ontario",
    targetRegion: "all", category: "videographer", length: "standard",
    competitorUrl: "https://www.theknot.com/content/how-to-choose-a-wedding-videographer",
  },
  {
    n: 3,  topic: "How to Choose a Wedding DJ in Ontario",
    targetKeyword: "how to choose wedding DJ Ontario",
    targetRegion: "all", category: "dj", length: "standard",
    competitorUrl: "https://www.theknot.com/content/how-to-find-a-wedding-dj",
  },
  {
    n: 4,  topic: "How to Choose a Wedding Florist in Ontario",
    targetKeyword: "how to choose wedding florist Ontario",
    targetRegion: "all", category: "florist", length: "standard",
    competitorUrl: "https://www.theknot.com/content/how-to-pick-wedding-florist",
  },
  {
    n: 5,  topic: "How to Choose a Wedding Caterer in Ontario",
    targetKeyword: "how to choose wedding caterer Ontario",
    targetRegion: "all", category: "catering", length: "standard",
    competitorUrl: "https://www.theknot.com/content/how-to-choose-a-wedding-caterer",
  },
  {
    n: 6,  topic: "How to Choose a Wedding Officiant in Ontario",
    targetKeyword: "how to choose wedding officiant Ontario",
    targetRegion: "all", category: "officiant", length: "standard",
    competitorUrl: "https://www.theknot.com/content/how-to-choose-an-officiant",
  },
  {
    n: 7,  topic: "How to Choose Wedding Hair and Makeup in Ontario",
    targetKeyword: "how to choose wedding hair makeup Ontario",
    targetRegion: "all", category: "hair_makeup", length: "standard",
    competitorUrl: "https://www.theknot.com/content/how-to-choose-a-wedding-makeup-artist",
  },
  {
    n: 8,  topic: "Do You Need a Wedding Planner in Ontario?",
    targetKeyword: "wedding planner Ontario worth it",
    targetRegion: "all", category: "wedding_planner", length: "standard",
    competitorUrl: "https://www.theknot.com/content/do-i-need-a-wedding-planner",
  },
  {
    n: 9,  topic: "How to Choose Your Wedding Cake in Ontario",
    targetKeyword: "how to choose wedding cake Ontario",
    targetRegion: "all", category: "cake", length: "standard",
    competitorUrl: "https://www.theknot.com/content/wedding-cake-101",
  },
  {
    n: 10, topic: "How to Choose Wedding Transportation in Ontario",
    targetKeyword: "wedding limo transportation Ontario",
    targetRegion: "all", category: "limo", length: "standard",
    competitorUrl: "https://www.theknot.com/content/how-to-pick-wedding-transportation",
  },
  {
    n: 11, topic: "How to Choose a Wedding Photo Booth in Ontario",
    targetKeyword: "how to choose wedding photo booth Ontario",
    targetRegion: "all", category: "photo_booth", length: "standard",
    competitorUrl: "https://www.theknot.com/content/wedding-photo-booth-tips",
  },
  {
    n: 12, topic: "Wedding Lighting and Decor in Ontario: A Guide",
    targetKeyword: "wedding lighting decor Ontario",
    targetRegion: "all", category: "lighting_decor", length: "standard",
    competitorUrl: "https://www.theknot.com/content/wedding-lighting-ideas",
  },

  /* ─── 7 cost posts (1,500-2,000 words) ─────────────────────────── */
  {
    n: 13, topic: "How Much Does a Wedding Officiant Cost in Ontario?",
    targetKeyword: "wedding officiant cost Ontario",
    targetRegion: "all", category: "officiant", length: "standard",
    competitorUrl: "https://www.theknot.com/content/officiant-cost",
  },
  {
    n: 14, topic: "Wedding Hair and Makeup Costs in Ontario (2026)",
    targetKeyword: "wedding hair makeup cost Ontario",
    targetRegion: "all", category: "hair_makeup", length: "standard",
    competitorUrl: "https://www.theknot.com/content/average-bridal-makeup-cost",
  },
  {
    n: 15, topic: "How Much Does a Wedding Planner Cost in Ontario?",
    targetKeyword: "wedding planner cost Ontario",
    targetRegion: "all", category: "wedding_planner", length: "standard",
    competitorUrl: "https://www.theknot.com/content/wedding-planner-cost",
  },
  {
    n: 16, topic: "Wedding Cake Costs in Ontario: What Couples Pay",
    targetKeyword: "wedding cake cost Ontario",
    targetRegion: "all", category: "cake", length: "standard",
    competitorUrl: "https://www.theknot.com/content/average-wedding-cake-cost",
  },
  {
    n: 17, topic: "Wedding Photo Booth Rental Cost in Ontario (2026)",
    targetKeyword: "wedding photo booth cost Ontario",
    targetRegion: "all", category: "photo_booth", length: "standard",
    competitorUrl: "https://www.theknot.com/content/wedding-photo-booth-cost",
  },
  {
    n: 18, topic: "Wedding Lighting and Decor Costs in Ontario",
    targetKeyword: "wedding lighting decor cost Ontario",
    targetRegion: "all", category: "lighting_decor", length: "standard",
    competitorUrl: "https://www.theknot.com/content/wedding-lighting-cost",
  },
  {
    n: 19, topic: "How Much Does a Wedding Venue Cost in Ontario?",
    targetKeyword: "wedding venue cost Ontario",
    targetRegion: "all", category: "venue", length: "pillar",
    competitorUrl: "https://www.theknot.com/content/wedding-venue-cost",
  },
];

/* Publish dates — every 2 weeks starting June 2, 2026 (next after the
 * existing editorial calendar that ended May 12, 2026). */
const PUBLISH_DATE_START = new Date("2026-06-02T12:00:00-04:00");

function publishDateFor(n: number): Date {
  const d = new Date(PUBLISH_DATE_START);
  d.setDate(d.getDate() + (n - 1) * 14);
  return d;
}

function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

/* Parse --only "1,3,11" into a Set<number>. */
function parseOnlyArg(): Set<number> | null {
  const arg = process.argv.find((a) => a.startsWith("--only"));
  if (!arg) return null;
  const value = arg.includes("=") ? arg.split("=", 2)[1] : process.argv[process.argv.indexOf(arg) + 1];
  if (!value) return null;
  const out = new Set<number>();
  for (const piece of value.split(",")) {
    const n = parseInt(piece.trim(), 10);
    if (Number.isFinite(n)) out.add(n);
  }
  return out;
}

function tagsFor(post: SeedPost): string[] {
  const tags = new Set<string>(["Ontario weddings"]);
  if (post.topic.toLowerCase().includes("cost") || post.topic.toLowerCase().includes("how much")) {
    tags.add("Cost guide");
  }
  if (post.topic.toLowerCase().startsWith("how to choose")) tags.add("How-to-choose");
  if (post.category && post.category !== "venue") {
    tags.add(post.category.replace(/_/g, " "));
  }
  if (post.category === "venue") tags.add("Venues");
  return Array.from(tags);
}

function categoryLabel(post: SeedPost): string {
  if (!post.category) return "Ontario weddings";
  if (post.category === "venue") return "Venue guides";
  if (post.topic.toLowerCase().includes("cost") || post.topic.toLowerCase().includes("how much")) {
    return "Cost guides";
  }
  return "How to choose";
}

function buildExcerpt(markdown: string): string {
  const first = markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .find((p) => !p.startsWith("#") && p.length > 60);
  if (!first) return markdown.slice(0, 240);
  const words = first.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").split(/\s+/);
  return words.slice(0, 50).join(" ") + (words.length > 50 ? "…" : "");
}

const WORD_COUNT_BY_CLASS: Record<SeedPost["length"], number> = {
  standard: 1700,
  pillar:   2200,
};

async function main() {
  const onlySet = parseOnlyArg();
  const dryRun  = process.argv.includes("--dry-run");

  const targets = POSTS.filter((p) => !onlySet || onlySet.has(p.n));
  console.log(`[seed-19] running ${targets.length} of ${POSTS.length} posts${dryRun ? " [DRY RUN]" : ""}`);

  let success = 0, skipped = 0, failed: number[] = [];

  for (const post of targets) {
    const slug = slugFromTitle(post.topic);
    const publishedAt = publishDateFor(post.n);

    /* Skip-if-exists. Resumable. */
    const [exists] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
    if (exists) {
      console.log(`  [${post.n}/19] SKIP  slug exists: ${slug}`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [${post.n}/19] WOULD GENERATE  slug=${slug}  cat=${post.category}  publish=${publishedAt.toISOString().slice(0, 10)}`);
      continue;
    }

    const input: BlogGenerateInput = {
      topic:             post.topic,
      competitorUrl:     post.competitorUrl,
      targetKeyword:     post.targetKeyword,
      targetRegion:      post.targetRegion,
      category:          post.category,
      internalLinkCount: 2,
      targetWordCount:   WORD_COUNT_BY_CLASS[post.length],
    };

    console.log(`  [${post.n}/19] generating: ${post.topic}`);
    try {
      const draft = await generateBlogPost(input);

      /* Force the slug to match what we picked from the topic title, so
       * the publish schedule lines up with the URL the user expects. */
      const effectiveSlug = exists ? slug : (draft.slug || slug);
      const excerpt       = buildExcerpt(draft.content);

      const [row] = await db
        .insert(blogPosts)
        .values({
          slug:             effectiveSlug,
          title:            draft.title,
          content:          draft.content,
          metaDescription:  draft.metaDescription || null,
          excerpt,
          category:         categoryLabel(post),
          tags:             tagsFor(post),
          publishedAt,
          wordCount:        draft.wordCount,
          sourceTopic:      post.topic,
          sourceDirectory:  "seed-19-posts",
          internalLinks:    draft.internalLinks,
          isPublished:      true,
          isAiGenerated:    true,
        })
        .returning({ id: blogPosts.id });

      console.log(`    ✓ words=${draft.wordCount} id=${row.id} publish=${publishedAt.toISOString().slice(0, 10)}`);
      success++;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`    ✗ failed: ${reason}`);
      failed.push(post.n);
    }
  }

  console.log(`\n[seed-19] done · generated=${success} skipped=${skipped} failed=${failed.length}`);
  if (failed.length > 0) {
    console.log(`[seed-19] re-run failures: npx tsx scripts/seed-19-posts.ts --only ${failed.join(",")}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
