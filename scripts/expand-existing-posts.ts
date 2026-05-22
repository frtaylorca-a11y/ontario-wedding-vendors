/**
 * Expand the 16 static BLOG_POSTS to 1,500+ words by writing expanded
 * versions to the blog_posts DB table.
 *
 *   /blog/[slug] resolves DB-first via getDbBlogPost, so the DB row
 *   silently overrides the static TSX entry when present. No code
 *   changes needed on the page side.
 *
 * For each post:
 *   1. Render the JSX body → HTML → plain markdown-ish text.
 *   2. Skip if the slug already exists in blog_posts.
 *   3. Send the original to claude-sonnet-4-6 with the expansion brief:
 *      keep everything, add regional pricing comparison (Niagara / GTA /
 *      Hamilton), "5 Questions to Ask Your [vendor]", "Red Flags",
 *      FAQ (3 Q&As Ontario-specific), Key Takeaways.
 *   4. Insert into blog_posts with is_published=true, is_ai_generated=false,
 *      word_count=actual, published_at=original.
 *
 * Cost: ~$0.04 per post × 16 = ~$0.64
 * Run:  npx tsx scripts/expand-existing-posts.ts [--slug=foo] [--dry-run]
 */
import "dotenv/config";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../src/lib/db";
import { blogPosts } from "../src/lib/schema";
import { BLOG_POSTS, type BlogPost } from "../src/lib/blog";
import { ONTARIO_PRICING, type PricingCategory } from "../src/lib/ontario-pricing";

/* ─── CLI args ───────────────────────────────────────────────────── */

const args   = process.argv.slice(2);
const onlySlug = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
const dryRun = args.includes("--dry-run");

/* ─── Category inference (drives "5 Questions to Ask Your X") ────── */

function inferVendorLabel(post: BlogPost): { label: string; pricingKey: PricingCategory | null } {
  const t = post.title.toLowerCase();
  if (t.includes("photographer"))     return { label: "Wedding Photographer",   pricingKey: "photographer" };
  if (t.includes("videographer"))     return { label: "Wedding Videographer",   pricingKey: "videographer" };
  if (t.includes("dj"))               return { label: "Wedding DJ",             pricingKey: "dj" };
  if (t.includes("florist"))          return { label: "Wedding Florist",        pricingKey: "florist" };
  if (t.includes("catering"))         return { label: "Wedding Caterer",        pricingKey: "catering" };
  if (t.includes("limo"))             return { label: "Wedding Limo Provider",  pricingKey: "limo" };
  /* Venue posts — "5 Questions to Ask Your Venue Coordinator" */
  if (t.includes("venue") || t.includes("wineries") || t.includes("barn") || t.includes("outdoor") || t.includes("cottage")) {
    return { label: "Venue Coordinator", pricingKey: null };
  }
  return { label: "Vendor", pricingKey: null };
}

/* ─── JSX → plain text ───────────────────────────────────────────── */

function bodyToPlainText(body: BlogPost["body"]): string {
  const html = renderToStaticMarkup(body as ReactElement);
  /* Cheap HTML → markdown-ish. The model just needs to read the
   * original content; perfect markdown isn't required here. */
  return html
    .replace(/<h2[^>]*>/gi, "\n\n## ")
    .replace(/<\/h2>/gi, "\n")
    .replace(/<h3[^>]*>/gi, "\n\n### ")
    .replace(/<\/h3>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "")
    .replace(/<ul[^>]*>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<strong[^>]*>/gi, "**")
    .replace(/<\/strong>/gi, "**")
    .replace(/<em[^>]*>/gi, "*")
    .replace(/<\/em>/gi, "*")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, "[$2]($1)")
    .replace(/<br ?\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/* ─── Pricing block (Niagara / GTA / Hamilton derived) ───────────── */

function pricingBlock(pricingKey: PricingCategory | null): string {
  if (!pricingKey) {
    /* Venue posts — give the model a venue-pricing reference instead. */
    return [
      "VENUE PRICING REFERENCE (Ontario, 2026):",
      "- Niagara:   $5,000–$25,000 (vineyards + estates skew high; barns mid)",
      "- GTA:       $15,000–$50,000 (downtown ballrooms top end; banquet halls mid)",
      "- Hamilton / Burlington: $8,000–$25,000 (10–15% below GTA, golf clubs + estates)",
    ].join("\n");
  }
  const p = ONTARIO_PRICING[pricingKey];
  /* Hamilton sits between Niagara and GTA — derive at ~10% below GTA. */
  const hamilton = {
    min:    Math.round(p.gta.min    * 0.9),
    median: Math.round(p.gta.median * 0.88),
    max:    Math.round(p.gta.max    * 0.9),
  };
  const fmt = (n: number) => `$${n.toLocaleString("en-CA")}`;
  return [
    `${pricingKey.toUpperCase()} PRICING (Ontario, 2026):`,
    `- Niagara:               min ${fmt(p.niagara.min)} / median ${fmt(p.niagara.median)} / max ${fmt(p.niagara.max)}`,
    `- GTA:                   min ${fmt(p.gta.min)} / median ${fmt(p.gta.median)} / max ${fmt(p.gta.max)}`,
    `- Hamilton / Burlington: min ${fmt(hamilton.min)} / median ${fmt(hamilton.median)} / max ${fmt(hamilton.max)}`,
    "(Hamilton derived ~10% below GTA — Golden Horseshoe market sits between Niagara and Toronto.)",
  ].join("\n");
}

/* ─── Prompt ─────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a Canadian wedding planning editor for Ontario Wedding Vendors (ontarioweddingvendors.com), a directory + planner serving couples planning weddings in Ontario.

Your job: expand an existing blog post to 1,500+ words by adding required sections WITHOUT removing or rewriting the original content. The original is editorially correct — keep all of it. Append the new sections after the existing body.

Style rules:
- Canadian spelling (colour, organise, centre, favourite, programme).
- Confident, specific, no fluff. Concrete numbers > vague adjectives.
- No exclamation points. No emojis. No "ultimate guide" type phrasing.
- Internal links use markdown — link [vendor category names](/vendors/photographer) and [relevant guides](/blog/slug-here) where natural.
- Format: markdown (## for sections, ### for subsections, - for lists).

Output format: return ONLY the full expanded markdown body. No preamble, no explanation, no JSON wrapper. The first line should be the original opening paragraph (or its markdown equivalent). The last line should be the closing of the Key Takeaways section.`;

function buildUserPrompt(opts: {
  post:        BlogPost;
  vendorLabel: string;
  pricingKey:  PricingCategory | null;
  originalMd:  string;
}): string {
  return [
    `TITLE: ${opts.post.title}`,
    `EXCERPT: ${opts.post.excerpt}`,
    `CATEGORY: ${opts.post.category}`,
    `READ TIME (original): ${opts.post.readMinutes} min`,
    "",
    "ORIGINAL POST (markdown — keep all of this intact, do not rewrite):",
    "---",
    opts.originalMd,
    "---",
    "",
    "REFERENCE DATA for the new sections:",
    pricingBlock(opts.pricingKey),
    "",
    "REQUIRED ADDITIONS (append in this order, after the original body):",
    "",
    "1. ## Regional pricing comparison",
    "   A short intro paragraph + a markdown table comparing Niagara, GTA, and Hamilton/Burlington using the reference data above. Add 2–3 sentences of context on WHY the regions price differently (overhead, demand, competition).",
    "",
    `2. ## 5 questions to ask your ${opts.vendorLabel.toLowerCase()}`,
    `   A numbered list of 5 specific questions Ontario couples should ask before booking a ${opts.vendorLabel.toLowerCase()}. Each question gets one sentence of context on WHY it matters. Be specific to Ontario (weather, wedding-season pricing, ROC vs. on-premise alcohol licensing, etc. where relevant).`,
    "",
    "3. ## Red flags to watch for",
    "   3–5 bullet points. Specific behaviours or contract terms that should make couples walk away. One sentence per flag.",
    "",
    "4. ## Frequently asked questions",
    `   Three Q&A pairs. Each question must be Ontario-specific (mentioning a region, weather pattern, vendor norm, or local regulation). Use ### for each question, then 2–3 sentences of answer.`,
    "",
    "5. ## Key takeaways",
    "   A summary box: 4–6 bullet points distilling the most important advice from the entire (original + new) post. Lead each bullet with a short bold phrase.",
    "",
    "Internal links — sprinkle 2–4 of these naturally across the new sections (markdown format):",
    "- [Ontario wedding venues](/venues)",
    "- [wedding planner](/plan)",
    `- [/vendors/${opts.pricingKey ?? "photographer"}](/vendors/${opts.pricingKey ?? "photographer"})`,
    "- One link to a sibling /blog/[slug] post from this site (use a related slug from the title's topic)",
    "",
    "Now produce the full expanded markdown body. Total length target: 1,500–2,200 words.",
  ].join("\n");
}

/* ─── Anthropic call ─────────────────────────────────────────────── */

type AnthropicMessageResp = {
  content: Array<{ type: string; text?: string }>;
  usage?:  { input_tokens?: number; output_tokens?: number };
};

async function expandViaClaude(opts: {
  post:        BlogPost;
  vendorLabel: string;
  pricingKey:  PricingCategory | null;
  originalMd:  string;
}): Promise<{ markdown: string; usage: { in: number; out: number } }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const client = new Anthropic({ apiKey: key });

  const resp = (await client.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 8000,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: buildUserPrompt(opts) }],
  })) as unknown as AnthropicMessageResp;

  const text = resp.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim();

  return {
    markdown: text,
    usage: {
      in:  resp.usage?.input_tokens  ?? 0,
      out: resp.usage?.output_tokens ?? 0,
    },
  };
}

/* ─── Main ───────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const targets = onlySlug
    ? BLOG_POSTS.filter((p) => p.slug === onlySlug)
    : BLOG_POSTS;

  if (targets.length === 0) {
    console.error(onlySlug
      ? `No static post matches slug "${onlySlug}". Available slugs:\n  ${BLOG_POSTS.map((p) => p.slug).join("\n  ")}`
      : "No posts found in BLOG_POSTS.",
    );
    process.exit(1);
  }

  console.log(`\n${dryRun ? "[DRY RUN] " : ""}Expanding ${targets.length} post(s) via claude-sonnet-4-6...\n`);

  const report: Array<{ title: string; before: number; after: number; status: string }> = [];
  let totalInTokens  = 0;
  let totalOutTokens = 0;

  for (const post of targets) {
    /* Skip if DB row already exists — don't clobber prior expansions. */
    const [existing] = await db
      .select({ id: blogPosts.id, wordCount: blogPosts.wordCount })
      .from(blogPosts)
      .where(eq(blogPosts.slug, post.slug))
      .limit(1);

    if (existing) {
      console.log(`  ⏭  ${post.slug} — DB row exists (${existing.wordCount ?? "?"} words). Skipping.`);
      report.push({ title: post.title, before: 0, after: existing.wordCount ?? 0, status: "skipped (already in DB)" });
      continue;
    }

    const originalMd  = bodyToPlainText(post.body);
    const beforeWords = countWords(originalMd);
    const { label, pricingKey } = inferVendorLabel(post);

    console.log(`  → ${post.slug}  [${beforeWords} words → expanding…]`);

    try {
      const { markdown, usage } = await expandViaClaude({
        post, vendorLabel: label, pricingKey, originalMd,
      });
      const afterWords = countWords(markdown);
      totalInTokens  += usage.in;
      totalOutTokens += usage.out;

      if (afterWords < 1500) {
        console.log(`     ⚠  Only ${afterWords} words returned (target ≥1500). Saving anyway.`);
      }

      if (!dryRun) {
        await db.insert(blogPosts).values({
          slug:            post.slug,
          title:           post.title,
          content:         markdown,
          excerpt:         post.excerpt,
          metaDescription: post.metaDescription,
          category:        post.category,
          tags:            [post.category],
          publishedAt:     new Date(post.publishedAt),
          wordCount:       afterWords,
          sourceTopic:     `Expanded from static TSX (${post.slug})`,
          sourceDirectory: "static-expansion",
          isPublished:     true,
          isAiGenerated:   false,
          heroImageUrl:    post.heroImage,
          heroImageAlt:    post.title,
        });
        console.log(`     ✓ Saved to DB (${beforeWords} → ${afterWords} words)`);
      } else {
        console.log(`     [dry-run] Would save ${afterWords} words`);
      }
      report.push({ title: post.title, before: beforeWords, after: afterWords, status: dryRun ? "dry-run" : "saved" });
    } catch (err) {
      console.error(`     ✗ Failed: ${err instanceof Error ? err.message : String(err)}`);
      report.push({ title: post.title, before: beforeWords, after: 0, status: "FAILED" });
    }
  }

  /* ─── Final report ─── */
  console.log("\n" + "═".repeat(78));
  console.log("EXPANSION REPORT");
  console.log("═".repeat(78));
  console.log(
    "Title".padEnd(56) + "Before".padStart(8) + "After".padStart(8) + "  Status",
  );
  console.log("-".repeat(78));
  for (const r of report) {
    console.log(
      r.title.slice(0, 55).padEnd(56) +
      String(r.before).padStart(8) +
      String(r.after).padStart(8) +
      "  " + r.status,
    );
  }
  console.log("-".repeat(78));

  const saved   = report.filter((r) => r.status === "saved").length;
  const skipped = report.filter((r) => r.status.startsWith("skipped")).length;
  const failed  = report.filter((r) => r.status === "FAILED").length;

  /* claude-sonnet-4-6 pricing: $3/MTok input, $15/MTok output. */
  const cost = (totalInTokens / 1_000_000) * 3 + (totalOutTokens / 1_000_000) * 15;
  console.log(`\nSaved: ${saved}  Skipped: ${skipped}  Failed: ${failed}`);
  console.log(`Tokens: ${totalInTokens.toLocaleString()} in / ${totalOutTokens.toLocaleString()} out`);
  console.log(`Estimated cost: $${cost.toFixed(4)}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
