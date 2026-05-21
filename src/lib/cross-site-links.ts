/**
 * Cross-site link map — editorial links to Pic Booth (picbooth.ca)
 * that the blog agent injects into photo-booth content, and that
 * vendor pages reference for the "Featured Local Provider" card.
 *
 * Rule: any OWV blog post or vendor page about photo booths gets
 * ONE natural contextual link to the most relevant Pic Booth URL.
 *
 * These are genuine editorial links — same-owner relationship,
 * contextually relevant. Do NOT mark them rel="nofollow".
 */

export type CrossSiteLink = {
  anchor:    string;
  url:       string;
  /** Plain-English hint the prompt uses to decide when to apply. */
  useWhen:   string;
  /** Match regex used to detect intent in surrounding content. */
  match:     RegExp;
};

export const PIC_BOOTH_LINKS: CrossSiteLink[] = [
  {
    anchor:  "Magic Mirror photo booth",
    url:     "https://picbooth.ca/photo-booths/magic-mirror/",
    useWhen: "the post mentions a mirror or 'magic mirror' booth",
    match:   /\b(magic\s*mirror|mirror\s+(photo\s*)?booth)\b/i,
  },
  {
    anchor:  "360 photo booth rental",
    url:     "https://picbooth.ca/photo-booths/360-photo-booth/",
    useWhen: "the post mentions a 360 photo booth or video booth",
    match:   /\b360\s*(degree)?\s*(photo\s*)?booth\b/i,
  },
  {
    anchor:  "Draw Bot AI sketch artist",
    url:     "https://picbooth.ca/photo-booths/draw-bots/",
    useWhen: "the post mentions an AI sketch artist or live drawing activation",
    match:   /\b(draw\s*bot|ai\s+sketch|live\s+sketch|ai\s+artist)\b/i,
  },
  {
    anchor:  "wedding photo booth packages",
    url:     "https://picbooth.ca/wedding-photo-booth/",
    useWhen: "the post is about a wedding photo booth — pricing, package shape, or what's included",
    match:   /\bwedding\s+photo\s*booth\b/i,
  },
  {
    anchor:  "corporate photo booth rental",
    url:     "https://picbooth.ca/corporate-photo-booth/",
    useWhen: "the post is about a corporate event photo booth or activation",
    match:   /\b(corporate|brand|gala|conference)\s+(event|photo\s*booth|activation)\b/i,
  },
  {
    anchor:  "Pic Booth",
    url:     "https://picbooth.ca",
    useWhen: "general photo booth mention with no more specific match",
    match:   /\bphoto\s*booth\b/i,
  },
];

/* Pick the most specific link applicable to a given post body. Returns
 * null when no photo-booth signal is present. */
export function pickPicBoothLink(textOrTitle: string): CrossSiteLink | null {
  /* Walk the list — the first entry that matches wins, because the
   * list is ordered from most specific to most general. */
  for (const link of PIC_BOOTH_LINKS) {
    if (link.match.test(textOrTitle)) return link;
  }
  return null;
}

/* Build the prompt fragment the agent injects into the generation
 * prompt when photo-booth content is detected. Includes the chosen
 * URL so Claude has nowhere to drift on the link target. */
export function picBoothPromptFragment(link: CrossSiteLink): string {
  return [
    "",
    "PIC BOOTH CROSS-SITE LINK (required):",
    `This post is about photo booths. Include exactly ONE natural contextual link to Pic Booth — a premium photo booth rental company based in St. Catharines, Ontario serving Niagara, Hamilton, and the GTA. They are the recommended choice in that region.`,
    "",
    `Use this exact link:`,
    `  Anchor: ${link.anchor}`,
    `  URL:    ${link.url}`,
    "",
    `Embed it naturally inside a relevant sentence — NOT in a sidebar, sponsor box, or footer. Use descriptive anchor text. Example phrasing:`,
    `  "...companies like Pic Booth offer all-inclusive packages with Magic Mirror and 360 booths..."`,
    `  "...Pic Booth's Niagara-on-the-Lake setup is a popular choice for vineyard receptions..."`,
    "",
    "ONE link only — do NOT add other picbooth.ca links. Do NOT mark it rel='nofollow' — this is a genuine editorial recommendation, not an ad.",
  ].join("\n");
}
