/**
 * Blog content engine — pure logic, no Next.js dependencies.
 *
 * Given a topic + competitor URL, this module:
 *   1. Fetches the competitor post (server-side) and extracts H2s.
 *   2. Pulls top-ranked Ontario vendors/venues by display_rank_score.
 *   3. Sends everything to claude-sonnet-4-6 with a strict system
 *      prompt that bans summarization and demands Ontario specifics.
 *   4. Returns a structured BlogDraftResult ready to persist or
 *      render in the admin preview.
 *
 * Cost estimate: ~$0.02 per post (Sonnet 4.6 input + output).
 */
import Anthropic from "@anthropic-ai/sdk";
import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { vendors, venues } from "@/lib/schema";
import { ONTARIO_PRICING, getPricing, type PricingCategory, type PricingRegion } from "@/lib/ontario-pricing";
import { pickPicBoothLink, picBoothPromptFragment } from "@/lib/cross-site-links";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

/* ─── Input + output types ──────────────────────────────────────── */

export type BlogGenerateInput = {
  topic:             string;
  competitorUrl:     string;
  targetKeyword:     string;
  /* Pricing region from ontario-pricing.ts ("niagara" | "gta") OR
   * "all" to keep pricing province-wide rather than regional. */
  targetRegion:      PricingRegion | "all" | "hamilton";
  /* When set, the post is anchored to a specific vendor category
   * (so internal links land on that category's listing). Pass null
   * to generate a venue-focused or topic-focused post. */
  category:          PricingCategory | "venue" | null;
  internalLinkCount: number;  /* defaults to 2 */
  /* Optional length target (Addendum A). When set, the generator
   * instructs Claude to write at least this many words and pushes
   * structure (H2 every 300-400 words, key-takeaways section). */
  targetWordCount?:  number;
};

export type InternalLink = {
  text: string;
  url:  string;
  kind: "vendor" | "venue" | "category" | "external";
};

export type BlogDraftResult = {
  title:           string;
  slug:            string;
  metaDescription: string;
  /* Markdown body (MDX-compatible — no JSX, just headings, paragraphs,
   * lists, and [text](url) links). Persist as TEXT to blog_drafts.content_mdx. */
  content:         string;
  publishDate:     string;       /* ISO YYYY-MM-DD */
  internalLinks:   InternalLink[];
  wordCount:       number;
  /* Diagnostic — kept for the admin preview so editors can see what
   * the generator pulled from the competitor and the DB. */
  diagnostics: {
    competitorHeadings: string[];
    pricingUsed:        Partial<Record<PricingCategory, { min: number; median: number; max: number }>>;
    vendorsLinked:      { name: string; slug: string; city: string | null; rating: string | null }[];
    venuesLinked:       { name: string; slug: string; city: string | null; rating: string | null }[];
  };
};

/* ─── Slug + word-count helpers ─────────────────────────────────── */

export function blogSlugify(title: string): string {
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

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/* ─── Competitor fetch + heading extraction ─────────────────────── */

/* Strip script/style tags then pull text from headings. Cheerio
 * isn't needed for this — a simple regex pass is sufficient and
 * keeps the dependency surface small. */
export async function fetchCompetitorStructure(url: string): Promise<{
  headings: string[];
  excerpt:  string;
}> {
  const res = await fetch(url, {
    headers: {
      /* Realistic UA — some content mills 403 default fetch agents. */
      "user-agent":
        "Mozilla/5.0 (compatible; OntarioWeddingVendorsBot/1.0; +https://ontarioweddingvendors.com)",
      accept: "text/html,*/*;q=0.8",
    },
    /* 12s ceiling — fail fast rather than block the API call. */
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`competitor fetch failed: ${res.status}`);
  const html = await res.text();

  const stripped = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");

  const headings: string[] = [];
  const headingRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(stripped)) !== null) {
    const text = m[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= 3 && text.length <= 140) headings.push(text);
    if (headings.length >= 20) break;
  }

  /* First 600 chars of body text as a topical signal — gives Claude
   * a sense of the competitor's angle without sending the whole page. */
  const bodyText = stripped
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);

  return { headings, excerpt: bodyText };
}

/* ─── Internal-link sourcing ─────────────────────────────────────── */

type VendorRow = {
  name:   string;
  slug:   string;
  city:   string | null;
  region: string | null;
  category: string | null;
  rating: string | null;
};

type VenueRow = {
  name:   string;
  slug:   string;
  city:   string | null;
  region: string | null;
  rating: string | null;
};

export async function fetchTopVendors({
  category,
  region,
  limit,
}: {
  category: PricingCategory;
  region:   PricingRegion | "all" | "hamilton";
  limit:    number;
}): Promise<VendorRow[]> {
  const conditions = [
    eq(vendors.category, category),
    eq(vendors.isHidden, false),
  ];
  /* "hamilton" is sourced from the golden-horseshoe region. */
  if (region === "niagara") conditions.push(eq(vendors.region, "niagara"));
  if (region === "gta")     conditions.push(eq(vendors.region, "gta"));
  if (region === "hamilton") conditions.push(eq(vendors.region, "golden-horseshoe"));
  /* region === "all" keeps the province-wide pool. */

  const rows = await db
    .select({
      name:     vendors.name,
      slug:     vendors.slug,
      city:     vendors.city,
      region:   vendors.region,
      category: vendors.category,
      rating:   vendors.googleRating,
    })
    .from(vendors)
    .where(and(...conditions))
    .orderBy(desc(vendors.displayRankScore))
    .limit(limit);

  return rows;
}

export async function fetchTopVenues({
  region,
  limit,
}: {
  region: PricingRegion | "all" | "hamilton";
  limit:  number;
}): Promise<VenueRow[]> {
  const conditions = [sql`${venues.weddingReadinessScore} >= 50`];
  if (region === "niagara")  conditions.push(eq(venues.region, "niagara"));
  if (region === "gta")      conditions.push(eq(venues.region, "gta"));
  if (region === "hamilton") conditions.push(eq(venues.region, "golden-horseshoe"));

  const rows = await db
    .select({
      name:   venues.name,
      slug:   venues.slug,
      city:   venues.city,
      region: venues.region,
      rating: venues.googleRating,
    })
    .from(venues)
    .where(and(...conditions))
    .orderBy(desc(venues.weddingReadinessScore))
    .limit(limit);

  return rows;
}

/* ─── Pricing snapshot ──────────────────────────────────────────── */

/* Build a region-scoped pricing block to inject into the prompt.
 * When targetRegion="all" we send both Niagara + GTA so the post
 * can reference province-wide pricing variance honestly. */
function pricingSnapshotForPrompt(input: BlogGenerateInput): {
  textBlock: string;
  used:      Partial<Record<PricingCategory, { min: number; median: number; max: number }>>;
} {
  const used: Partial<Record<PricingCategory, { min: number; median: number; max: number }>> = {};
  const lines: string[] = [];

  /* If a category is set, prioritise it; otherwise include all 12. */
  const cats: PricingCategory[] = input.category && input.category !== "venue"
    ? [input.category as PricingCategory]
    : (Object.keys(ONTARIO_PRICING) as PricingCategory[]);

  const regionForPricing: PricingRegion = input.targetRegion === "all"
    ? "gta"  /* GTA is the larger sample; Niagara is shown alongside */
    : input.targetRegion === "hamilton"
      ? "gta"
      : input.targetRegion;

  for (const cat of cats) {
    const p = getPricing(cat, regionForPricing);
    if (!p) continue;
    used[cat] = { min: p.min, median: p.median, max: p.max };
    /* Show both regions when "all" so the writer can quote a variance. */
    if (input.targetRegion === "all") {
      const nia = getPricing(cat, "niagara");
      const gta = getPricing(cat, "gta");
      if (nia && gta) {
        lines.push(
          `- ${cat}: Niagara $${nia.min.toLocaleString("en-CA")}–$${nia.max.toLocaleString("en-CA")} (median $${nia.median.toLocaleString("en-CA")}); GTA $${gta.min.toLocaleString("en-CA")}–$${gta.max.toLocaleString("en-CA")} (median $${gta.median.toLocaleString("en-CA")})`,
        );
        continue;
      }
    }
    lines.push(
      `- ${cat}: $${p.min.toLocaleString("en-CA")}–$${p.max.toLocaleString("en-CA")} (median $${p.median.toLocaleString("en-CA")})`,
    );
  }

  return {
    textBlock: lines.length > 0
      ? `Real Ontario pricing data (use these numbers verbatim in the post — they are this site's proprietary data):\n${lines.join("\n")}`
      : "",
    used,
  };
}

/* ─── DB-wide stat snapshot — the "unique data point" axis ──────── */

export async function fetchSiteDataPoints(input: BlogGenerateInput): Promise<string[]> {
  const points: string[] = [];

  /* Vendor count for the category, scoped to region if set. */
  if (input.category && input.category !== "venue") {
    const conds = [eq(vendors.category, input.category), eq(vendors.isHidden, false)];
    if (input.targetRegion === "niagara")  conds.push(eq(vendors.region, "niagara"));
    if (input.targetRegion === "gta")      conds.push(eq(vendors.region, "gta"));
    if (input.targetRegion === "hamilton") conds.push(eq(vendors.region, "golden-horseshoe"));
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendors)
      .where(and(...conds));
    points.push(
      `Our directory has ${count.toLocaleString()} verified ${input.category}${input.targetRegion === "all" ? "s across Ontario" : ` in ${labelRegion(input.targetRegion)}`}.`,
    );
  }

  /* Venue count when category is "venue" or null. */
  if (input.category === "venue" || input.category == null) {
    const conds = [sql`${venues.weddingReadinessScore} >= 50`];
    if (input.targetRegion === "niagara")  conds.push(eq(venues.region, "niagara"));
    if (input.targetRegion === "gta")      conds.push(eq(venues.region, "gta"));
    if (input.targetRegion === "hamilton") conds.push(eq(venues.region, "golden-horseshoe"));
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(venues)
      .where(and(...conds));
    points.push(
      `Our directory tracks ${count.toLocaleString()} wedding venue${count === 1 ? "" : "s"}${input.targetRegion === "all" ? " across Ontario" : ` in ${labelRegion(input.targetRegion)}`} with a wedding-readiness score of 50 or higher.`,
    );
  }

  return points;
}

function labelRegion(r: BlogGenerateInput["targetRegion"]): string {
  switch (r) {
    case "niagara":  return "Niagara";
    case "gta":      return "the GTA";
    case "hamilton": return "Hamilton & Burlington";
    case "all":      return "Ontario";
  }
}

/* ─── Prompt builder ────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are writing SEO content for Ontario Wedding Vendors (ontarioweddingvendors.com), an Ontario wedding directory. Write for Ontario couples in Canadian English (colour, centre, organise, etc.). Reference real Ontario regions, venues, and vendors by name when given.

Rules:
- Do NOT summarize or paraphrase the competitor post. Use it ONLY to understand what topics couples expect this post to cover. The output must be original, with our angle and our data.
- Use the Ontario pricing numbers provided VERBATIM — they are this site's proprietary data and the primary reason this post will outrank the competitor.
- Mention real local landmarks, regions, and venues when relevant. Examples: Niagara-on-the-Lake's wineries, Toronto's distillery district, Hamilton's escarpment, Muskoka cottage country, the GTA, Burlington waterfront.
- Embed exactly the internal links provided in the user prompt as markdown links [text](url). Do NOT add other internal links. External links are forbidden.
- Tone: warm, direct, practical. Like an Ontario-based wedding professional explaining things to a couple in their first meeting. No marketing fluff. No emoji. No "in today's world" or "in this article". No exclamation marks.
- Structure: open with a 2-paragraph hook that names the unique data point. Then 4-6 H2 sections, each with substantive body content (not bullet-point soup). End with a short "Next steps" paragraph that points to the directory.

Return ONLY valid JSON in this exact shape — no markdown fences, no surrounding text:

{
  "title":           "<SEO title — include the target keyword, 50-65 chars>",
  "metaDescription": "<140-155 chars — include the keyword, mention Ontario, end with action>",
  "content":         "<Markdown body — H2 headings as ## Heading, paragraphs separated by blank lines, internal links as [anchor](url). DO NOT include the H1 title — that's rendered separately. 900-1400 words.>"
}`;

function buildUserPrompt({
  input,
  competitorHeadings,
  competitorExcerpt,
  pricingBlock,
  dataPoints,
  internalLinks,
}: {
  input:              BlogGenerateInput;
  competitorHeadings: string[];
  competitorExcerpt:  string;
  pricingBlock:       string;
  dataPoints:         string[];
  internalLinks:      InternalLink[];
}): string {
  const links = internalLinks
    .map((l, i) => `  ${i + 1}. Anchor text: "${l.text}"  →  URL: ${l.url}  (${l.kind})`)
    .join("\n");

  /* Cross-site link to Pic Booth — injected when the topic + competitor
   * context signals photo-booth content. Specific URL picked from the
   * CROSS_SITE_LINKS map by best-fit match against the topic + headings. */
  const crossSiteHaystack = [
    input.topic,
    input.targetKeyword,
    input.category === "photo_booth" ? "photo booth" : "",
    competitorExcerpt,
    competitorHeadings.join(" "),
  ].join(" ");
  const picBoothLink     = pickPicBoothLink(crossSiteHaystack);
  const picBoothFragment = picBoothLink ? picBoothPromptFragment(picBoothLink) : "";

  const wordLine = input.targetWordCount
    ? [
        `Length target:   ${input.targetWordCount} words MINIMUM. Do not write shorter.`,
        "Structure rules:",
        "  - H2 subheading every 300-400 words.",
        "  - Short paragraphs (3-4 sentences max).",
        "  - Bullet points for any list of 3+ items.",
        "  - End the post with a ## Key Takeaways section (5-7 bullet points) before any final CTA paragraph.",
      ].join("\n")
    : "";

  return [
    `Topic:           ${input.topic}`,
    `Target keyword:  ${input.targetKeyword}`,
    `Target region:   ${labelRegion(input.targetRegion)}`,
    input.category ? `Vendor focus:    ${input.category}` : "Vendor focus:    (general — no single category)",
    wordLine,
    "",
    "Competitor post structure (their H2 headings — for topic-coverage signal only, do NOT summarize):",
    competitorHeadings.length > 0
      ? competitorHeadings.map((h) => `  - ${h}`).join("\n")
      : "  (no headings extracted — competitor post had unusual structure)",
    "",
    "Competitor post opening text (first 600 chars — for topic context only, do NOT paraphrase):",
    `"""${competitorExcerpt}"""`,
    "",
    pricingBlock,
    "",
    dataPoints.length > 0
      ? `Our unique data points (use one of these in the opening hook, prominently):\n${dataPoints.map((d) => `  - ${d}`).join("\n")}`
      : "",
    "",
    "Internal links you MUST embed naturally in the body (exactly as specified — do not change the URL):",
    links,
    picBoothFragment,
    "",
    "Return the JSON exactly as specified in the system prompt. Do not include the title as an H1 inside the content field.",
  ].filter(Boolean).join("\n");
}

/* ─── JSON-safe parser (defensive against fenced output) ──────────── */

function safeParseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}

type AnthropicMessageResp = {
  content: Array<{ type: string; text?: string }>;
};

/* ─── The main generator ──────────────────────────────────────────── */

export async function generateBlogPost(input: BlogGenerateInput): Promise<BlogDraftResult> {
  /* 1. Pull competitor structure (fail fast on bad URL). */
  const { headings: competitorHeadings, excerpt: competitorExcerpt } =
    await fetchCompetitorStructure(input.competitorUrl);

  /* 2. Pull internal links from the DB. Default mix: top-N
   *    vendors when category is set; top-N venues when not. */
  const linkCount = Math.max(1, Math.min(4, input.internalLinkCount ?? 2));
  const internalLinks: InternalLink[] = [];
  const vendorsLinked: BlogDraftResult["diagnostics"]["vendorsLinked"] = [];
  const venuesLinked:  BlogDraftResult["diagnostics"]["venuesLinked"]  = [];

  if (input.category && input.category !== "venue") {
    const rows = await fetchTopVendors({
      category: input.category as PricingCategory,
      region:   input.targetRegion,
      limit:    linkCount,
    });
    for (const r of rows) {
      vendorsLinked.push({ name: r.name, slug: r.slug, city: r.city, rating: r.rating });
      internalLinks.push({
        text: r.name,
        url:  `${SITE_URL}/vendors/${input.category}/${r.slug}`,
        kind: "vendor",
      });
    }
    /* Always include the category listing link as a third tail link
     * so the post is funnel-complete even if all vendor anchors are
     * embedded as in-line mentions. */
    internalLinks.push({
      text: `wedding ${input.category}s in ${labelRegion(input.targetRegion).toLowerCase()}`,
      url:  `${SITE_URL}/vendors/${input.category}`,
      kind: "category",
    });
  } else {
    const rows = await fetchTopVenues({ region: input.targetRegion, limit: linkCount });
    for (const r of rows) {
      venuesLinked.push({ name: r.name, slug: r.slug, city: r.city, rating: r.rating });
      internalLinks.push({
        text: r.name,
        url:  `${SITE_URL}/venues/${r.slug}`,
        kind: "venue",
      });
    }
    internalLinks.push({
      text: `wedding venues${input.targetRegion === "all" ? " across Ontario" : ` in ${labelRegion(input.targetRegion).toLowerCase()}`}`,
      url:  input.targetRegion === "all" || input.targetRegion === "hamilton"
        ? `${SITE_URL}/venues`
        : `${SITE_URL}/regions/${input.targetRegion}`,
      kind: "category",
    });
  }

  /* Surface the Pic Booth cross-site link in internal_links so it's
   * persisted + audit-visible. The link itself is enforced via the
   * prompt fragment in buildUserPrompt. */
  const picBoothLink = pickPicBoothLink(
    `${input.topic} ${input.targetKeyword} ${input.category === "photo_booth" ? "photo booth" : ""}`,
  );
  if (picBoothLink) {
    internalLinks.push({
      text: picBoothLink.anchor,
      url:  picBoothLink.url,
      kind: "external",
    });
  }

  /* 3. Build pricing snapshot + DB data points. */
  const { textBlock: pricingBlock, used: pricingUsed } = pricingSnapshotForPrompt(input);
  const dataPoints = await fetchSiteDataPoints(input);

  /* 4. Call Claude. */
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY missing — cannot generate blog draft.");
  }
  const client = new Anthropic({ apiKey });

  const userPrompt = buildUserPrompt({
    input,
    competitorHeadings,
    competitorExcerpt,
    pricingBlock,
    dataPoints,
    internalLinks,
  });

  /* Longer posts need a higher token ceiling — 2200-word pillar posts
   * easily blow past the 4K default. Allocate ~2× the target word
   * count in tokens to leave room for JSON envelope + markdown. */
  const maxTokens = input.targetWordCount
    ? Math.min(16_000, Math.max(4_000, input.targetWordCount * 2))
    : 4_000;

  const resp = (await client.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: userPrompt }],
  })) as unknown as AnthropicMessageResp;

  const text = resp.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");

  const parsed = safeParseJson(text);
  if (!parsed) {
    throw new Error("Claude returned unparseable JSON for the blog draft.");
  }

  const title           = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const metaDescription = typeof parsed.metaDescription === "string" ? parsed.metaDescription.trim() : "";
  const content         = typeof parsed.content === "string" ? parsed.content.trim() : "";
  if (!title || !content) {
    throw new Error("Claude response missing required fields (title or content).");
  }

  const slug = blogSlugify(title);
  const publishDate = new Date().toISOString().slice(0, 10);

  return {
    title,
    slug,
    metaDescription,
    content,
    publishDate,
    internalLinks,
    wordCount: countWords(content),
    diagnostics: {
      competitorHeadings,
      pricingUsed,
      vendorsLinked,
      venuesLinked,
    },
  };
}
