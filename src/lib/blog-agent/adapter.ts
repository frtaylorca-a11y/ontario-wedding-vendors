/**
 * Content adapter — claude-haiku turns one blog post into platform-
 * specific shapes: GBP, Instagram (caption + 5-slide carousel),
 * Facebook, Pinterest, and an email snippet.
 *
 * The output is strictly typed and validated. We never trust Claude
 * to enforce character limits — every field is clamped on our side.
 */
import Anthropic from "@anthropic-ai/sdk";

type AnthropicMessageResp = { content: Array<{ type: string; text?: string }> };

export type AdaptedContent = {
  gbp: {
    text:         string;   /* ≤1500 chars */
    callToAction: { actionType: "LEARN_MORE"; url: string };
  };
  instagram: {
    caption:         string;   /* ≤2200 chars */
    hashtags:        string[]; /* 15-20 entries */
    carouselSlides:  Array<{ heading: string; body: string }>;  /* exactly 5 */
  };
  facebook: { text: string };  /* ≤500 chars */
  pinterest: {
    title:       string;   /* ≤100 chars */
    description: string;   /* ≤500 chars */
    board:       string;
  };
  emailSnippet: {
    subject: string;
    preview: string;   /* ≤50 chars */
    body:    string;   /* ≤200 chars */
  };
};

/* ─── Hashtag rules ──────────────────────────────────────────────── */

const REQUIRED_TAGS = [
  "#OntarioWedding",
  "#OntarioWeddingVendors",
  "#WeddingOntario",
  "#WeddingCanada",
];

const CATEGORY_TAGS: Record<string, string[]> = {
  photographer:    ["#WeddingPhotographer", "#OntarioWeddingPhotographer"],
  videographer:    ["#WeddingVideographer", "#OntarioWeddingFilm"],
  dj:              ["#WeddingDJ", "#OntarioWeddingDJ"],
  florist:         ["#WeddingFlorist", "#OntarioWeddingFlowers"],
  photo_booth:     ["#WeddingPhotoBooth", "#OntarioPhotoBooth"],
  catering:        ["#WeddingCatering", "#OntarioWeddingCatering"],
  cake:            ["#WeddingCake", "#OntarioWeddingCake"],
  hair_makeup:     ["#WeddingHairAndMakeup", "#BridalBeauty"],
  officiant:       ["#WeddingOfficiant", "#OntarioOfficiant"],
  limo:            ["#WeddingTransportation", "#OntarioWeddingLimo"],
  lighting_decor:  ["#WeddingLighting", "#WeddingDecor"],
  wedding_planner: ["#WeddingPlanner", "#OntarioWeddingPlanner"],
  venue:           ["#WeddingVenue", "#OntarioWeddingVenue"],
};

const REGION_TAGS: Record<string, string[]> = {
  niagara:  ["#NiagaraWedding",   "#NOTLWedding", "#NiagaraOnTheLakeWedding"],
  gta:      ["#TorontoWedding",   "#GTAWedding"],
  hamilton: ["#HamiltonWedding",  "#BurlingtonWedding"],
  all:      ["#OntarioWeddingPlanning"],
};

function buildHashtags(opts: { category?: string | null; region?: string | null }): string[] {
  const tags = new Set<string>(REQUIRED_TAGS);
  const cat = opts.category ?? "";
  for (const t of (CATEGORY_TAGS[cat] ?? [])) tags.add(t);
  const reg = opts.region ?? "all";
  for (const t of (REGION_TAGS[reg] ?? REGION_TAGS.all)) tags.add(t);
  /* Always include a couple of broad evergreen tags. */
  tags.add("#WeddingPlanning");
  tags.add("#EngagedInOntario");
  /* Cap to 20 — Instagram won't surface more than the first 20 effectively. */
  return Array.from(tags).slice(0, 20);
}

/* ─── Clamping ───────────────────────────────────────────────────── */

function clamp(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  /* Cut on a word boundary close to the limit. */
  const cut = s.slice(0, max);
  const lastSp = cut.lastIndexOf(" ");
  return (lastSp > max * 0.8 ? cut.slice(0, lastSp) : cut).trim() + "…";
}

/* ─── Prompt ─────────────────────────────────────────────────────── */

const ADAPTER_SYSTEM = `You write platform-native social copy for Ontario Wedding Vendors (ontarioweddingvendors.com) — an Ontario wedding directory. The source is a long-form blog post; your job is to compress the most useful angle of it into each platform's voice.

Voice: warm, concrete, Canadian English. No emoji. No exclamation marks. Reference real Ontario regions when relevant.

Return ONE JSON object with these exact keys and shapes. Stay UNDER each character limit — do not test the limit.

{
  "gbpText": "Google Business Profile LocalPost body — 350-450 chars. Practical hook. Mention one concrete Ontario detail.",
  "instagramCaption": "Instagram caption — 600-900 chars (under 2200 hard cap). 3 short paragraphs separated by line breaks. End with a 'link in bio' nudge (no emoji).",
  "carouselSlides": [
    { "heading": "Slide 1 hook — under 40 chars", "body": "60-110 chars of body" },
    { "heading": "Slide 2", "body": "..." },
    { "heading": "Slide 3", "body": "..." },
    { "heading": "Slide 4", "body": "..." },
    { "heading": "Slide 5 CTA", "body": "Read the full guide — link in bio." }
  ],
  "facebookText": "Facebook post — 300-450 chars. One actionable insight + soft CTA.",
  "pinterestTitle": "Pinterest pin title — 60-90 chars. Searchable. Keyword-led.",
  "pinterestDescription": "Pinterest pin description — 300-450 chars. Tip-format prose. Keyword-led.",
  "emailSubject": "Email subject line — 40-60 chars.",
  "emailPreview": "Email preview text — 30-45 chars.",
  "emailBody": "Email body intro — 140-190 chars. One concrete promise + read-more nudge."
}

Return the JSON only. No markdown fences. No prose around it.`;

/* ─── Main entry point ──────────────────────────────────────────── */

export async function adaptForPlatforms(opts: {
  title:        string;
  excerpt:      string;
  contentBody:  string;   /* full markdown — first ~2000 chars used as context */
  postUrl:      string;
  category:     string | null;
  region:       string | null;
}): Promise<AdaptedContent> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const client = new Anthropic({ apiKey: key });

  const userPrompt = [
    `Blog post URL: ${opts.postUrl}`,
    `Title:         ${opts.title}`,
    `Excerpt:       ${opts.excerpt}`,
    "",
    `Category:      ${opts.category ?? "(general)"}`,
    `Region:        ${opts.region ?? "(general)"}`,
    "",
    "Post body (first 2000 chars):",
    opts.contentBody.slice(0, 2000),
    "",
    "Return the JSON now.",
  ].join("\n");

  const resp = (await client.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 2500,
    system:     ADAPTER_SYSTEM,
    messages:   [{ role: "user", content: userPrompt }],
  })) as unknown as AnthropicMessageResp;

  const text = resp.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Could not parse adapter JSON");
    parsed = JSON.parse(m[0]);
  }

  /* Coerce + clamp every field. Carousel: pad to 5 / trim past 5. */
  const rawSlides = Array.isArray(parsed.carouselSlides) ? parsed.carouselSlides : [];
  const carouselSlides = rawSlides
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .slice(0, 5)
    .map((s) => ({
      heading: clamp(typeof s.heading === "string" ? s.heading : "", 40),
      body:    clamp(typeof s.body    === "string" ? s.body    : "", 110),
    }));
  while (carouselSlides.length < 5) {
    carouselSlides.push({
      heading: `Slide ${carouselSlides.length + 1}`,
      body:    "Read the full guide — link in bio.",
    });
  }

  return {
    gbp: {
      text:         clamp(typeof parsed.gbpText === "string" ? parsed.gbpText : opts.excerpt, 1500),
      callToAction: { actionType: "LEARN_MORE", url: opts.postUrl },
    },
    instagram: {
      caption:        clamp(typeof parsed.instagramCaption === "string" ? parsed.instagramCaption : opts.excerpt, 2200),
      hashtags:       buildHashtags({ category: opts.category, region: opts.region }),
      carouselSlides,
    },
    facebook: {
      text: clamp(typeof parsed.facebookText === "string" ? parsed.facebookText : opts.excerpt, 500),
    },
    pinterest: {
      title:       clamp(typeof parsed.pinterestTitle === "string" ? parsed.pinterestTitle : opts.title, 100),
      description: clamp(typeof parsed.pinterestDescription === "string" ? parsed.pinterestDescription : opts.excerpt, 500),
      board:       pinterestBoardFor(opts.category, opts.region),
    },
    emailSnippet: {
      subject: clamp(typeof parsed.emailSubject === "string" ? parsed.emailSubject : opts.title, 78),
      preview: clamp(typeof parsed.emailPreview === "string" ? parsed.emailPreview : opts.excerpt, 50),
      body:    clamp(typeof parsed.emailBody    === "string" ? parsed.emailBody    : opts.excerpt, 200),
    },
  };
}

/* Choose a Pinterest board name from category + region. The actual
 * board ID is resolved at publish time from PINTEREST_BOARD_IDS env. */
function pinterestBoardFor(category: string | null, region: string | null): string {
  if (category === "venue")                return "Ontario Wedding Venues";
  if (category === "photographer")         return "Ontario Wedding Photographers";
  if (category === "florist")              return "Ontario Wedding Florals";
  if (category === "cake")                 return "Ontario Wedding Cakes";
  if (category === "hair_makeup")          return "Ontario Bridal Beauty";
  if (region   === "niagara")              return "Niagara Wedding Inspiration";
  if (region   === "gta")                  return "Toronto + GTA Wedding Inspiration";
  if (region   === "hamilton")             return "Hamilton + Burlington Weddings";
  return "Ontario Wedding Planning";
}
