/**
 * Retrofit script — finds blog_posts rows about photo booths and adds
 * ONE contextual Pic Booth link if none is already present.
 *
 * Why a script (not a migration): post content lives in markdown text;
 * the link injection is a content edit, not a schema change. Also:
 * we want to be conservative — only modify posts that are clearly
 * about photo booths AND don't already mention picbooth.ca.
 *
 * What it does:
 *   1. SELECT id, slug, title, content FROM blog_posts
 *        WHERE  (category = 'photo_booth'
 *           OR   title   ILIKE '%photo booth%'
 *           OR   content ILIKE '%photo booth%')
 *        AND   content NOT ILIKE '%picbooth.ca%'
 *   2. For each row, pick the most specific PIC_BOOTH_LINKS entry
 *      that matches the content.
 *   3. Inject the link into the first paragraph that mentions
 *      "photo booth" — rewriting "photo booth" → "[anchor](url)"
 *      ONLY on the first occurrence. Keep the rest of the markdown
 *      untouched.
 *   4. UPDATE the row.
 *
 * CLI:
 *   npx tsx scripts/retrofit-picbooth-links.ts             # dry-run
 *   npx tsx scripts/retrofit-picbooth-links.ts --confirm   # actually write
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { blogPosts } from "../src/lib/schema";
import { PIC_BOOTH_LINKS, pickPicBoothLink, type CrossSiteLink } from "../src/lib/cross-site-links";

function injectLink(content: string, link: CrossSiteLink): { content: string; replaced: boolean } {
  /* Strategy: find the first paragraph containing "photo booth" and
   * replace the FIRST literal "photo booth" in that paragraph with the
   * markdown anchor. Use a markdown link rather than HTML so the
   * existing renderMarkdown converter handles it. */
  const paragraphs = content.split(/\n{2,}/);
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (!/photo booth/i.test(p)) continue;
    /* Skip headings + lines that already contain a markdown link to
     * any picbooth.ca URL. */
    if (p.startsWith("#")) continue;
    if (/picbooth\.ca/.test(p)) continue;

    /* Replace only the first case-insensitive occurrence of
     * "photo booth" in this paragraph with [anchor](url). The anchor
     * comes from the matched CrossSiteLink so it reads naturally. */
    const replaced = p.replace(
      /(photo booth)/i,
      `[${link.anchor}](${link.url})`,
    );
    paragraphs[i] = replaced;
    return { content: paragraphs.join("\n\n"), replaced: true };
  }
  return { content, replaced: false };
}

async function main() {
  const confirm = process.argv.includes("--confirm");

  const rows = await db
    .select({
      id:       blogPosts.id,
      slug:     blogPosts.slug,
      title:    blogPosts.title,
      content:  blogPosts.content,
      category: blogPosts.category,
    })
    .from(blogPosts)
    .where(sql`
      (
        ${blogPosts.category} = 'photo_booth' OR
        ${blogPosts.title}   ILIKE '%photo booth%' OR
        ${blogPosts.content} ILIKE '%photo booth%'
      )
      AND ${blogPosts.content} NOT ILIKE '%picbooth.ca%'
    `);

  console.log(`[retrofit] candidates: ${rows.length}${confirm ? "" : "  (DRY RUN — pass --confirm to write)"}`);

  let updated = 0, skipped = 0;
  for (const r of rows) {
    /* Pick the best link from the post's content. Fallback to the
     * generic Pic Booth URL when no specific signal matches. */
    const link = pickPicBoothLink(`${r.title} ${r.content}`) ?? PIC_BOOTH_LINKS[PIC_BOOTH_LINKS.length - 1];
    const { content: next, replaced } = injectLink(r.content, link);

    if (!replaced) {
      console.log(`  SKIP  id=${r.id}  slug=${r.slug}  (no injectable paragraph)`);
      skipped++;
      continue;
    }

    console.log(`  ${confirm ? "WRITE" : "WOULD-WRITE"}  id=${r.id}  slug=${r.slug}  →  ${link.anchor}`);
    if (confirm) {
      await db
        .update(blogPosts)
        .set({ content: next, updatedAt: new Date() })
        .where(eq(blogPosts.id, r.id));
    }
    updated++;
  }

  console.log(`\n[retrofit] done · ${confirm ? "updated" : "would update"}=${updated}  skipped=${skipped}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
