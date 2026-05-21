/**
 * Planning Resources map — vendor category → two blog slugs.
 *
 *   how-to:  /blog/how-to-choose-a-wedding-{category}-in-ontario
 *   cost:    /blog/wedding-{category}-cost-ontario  (legacy)
 *            OR /blog/how-much-does-a-wedding-{X}-cost-in-ontario  (seed-19)
 *
 * The seeded posts from scripts/seed-19-posts.ts use the longer slugs
 * because they're generated from the post title verbatim. Existing
 * legacy posts use the shorter slug pattern. We list BOTH candidates
 * for each category — the renderer picks the first one that resolves
 * to a real post.
 */
import type { VendorCategory } from "@/types";

export type ResourceLinks = {
  howToSlugCandidates: string[];
  costSlugCandidates:  string[];
};

export const VENDOR_RESOURCES: Record<VendorCategory, ResourceLinks> = {
  photographer: {
    howToSlugCandidates: ["how-to-choose-a-wedding-photographer-in-ontario", "how-to-choose-wedding-photographer-ontario"],
    costSlugCandidates:  ["wedding-photographer-cost-ontario", "how-much-does-a-wedding-photographer-cost-in-ontario"],
  },
  videographer: {
    howToSlugCandidates: ["how-to-choose-a-wedding-videographer-in-ontario", "how-to-choose-wedding-videographer-ontario"],
    costSlugCandidates:  ["wedding-videographer-cost-ontario", "how-much-does-a-wedding-videographer-cost-in-ontario"],
  },
  dj: {
    howToSlugCandidates: ["how-to-choose-a-wedding-dj-in-ontario", "how-to-choose-wedding-dj-ontario"],
    costSlugCandidates:  ["wedding-dj-cost-ontario", "how-much-does-a-wedding-dj-cost-in-ontario"],
  },
  florist: {
    howToSlugCandidates: ["how-to-choose-a-wedding-florist-in-ontario", "how-to-choose-wedding-florist-ontario"],
    costSlugCandidates:  ["wedding-florist-cost-ontario", "how-much-do-wedding-flowers-cost-in-ontario"],
  },
  photo_booth: {
    howToSlugCandidates: ["how-to-choose-a-wedding-photo-booth-in-ontario"],
    costSlugCandidates:  ["wedding-photo-booth-rental-cost-in-ontario-2026", "wedding-photo-booth-cost-ontario"],
  },
  catering: {
    howToSlugCandidates: ["how-to-choose-a-wedding-caterer-in-ontario", "how-to-choose-wedding-caterer-ontario"],
    costSlugCandidates:  ["wedding-catering-cost-ontario", "how-much-does-wedding-catering-cost-in-ontario"],
  },
  cake: {
    howToSlugCandidates: ["how-to-choose-your-wedding-cake-in-ontario", "how-to-choose-wedding-cake-ontario"],
    costSlugCandidates:  ["wedding-cake-costs-in-ontario-what-couples-pay", "wedding-cake-cost-ontario"],
  },
  hair_makeup: {
    howToSlugCandidates: ["how-to-choose-wedding-hair-and-makeup-in-ontario", "how-to-choose-bridal-hair-makeup-ontario"],
    costSlugCandidates:  ["wedding-hair-and-makeup-costs-in-ontario-2026", "wedding-hair-makeup-cost-ontario"],
  },
  officiant: {
    howToSlugCandidates: ["how-to-choose-a-wedding-officiant-in-ontario", "how-to-choose-wedding-officiant-ontario"],
    costSlugCandidates:  ["how-much-does-a-wedding-officiant-cost-in-ontario", "wedding-officiant-cost-ontario"],
  },
  limo: {
    howToSlugCandidates: ["how-to-choose-wedding-transportation-in-ontario", "how-to-choose-wedding-limo-ontario"],
    costSlugCandidates:  ["wedding-limo-cost-ontario", "wedding-transportation-cost-ontario"],
  },
  lighting_decor: {
    howToSlugCandidates: ["wedding-lighting-and-decor-in-ontario-a-guide", "how-to-choose-wedding-lighting-decor-ontario"],
    costSlugCandidates:  ["wedding-lighting-and-decor-costs-in-ontario", "wedding-lighting-cost-ontario"],
  },
  wedding_planner: {
    howToSlugCandidates: ["do-you-need-a-wedding-planner-in-ontario", "how-to-choose-wedding-planner-ontario"],
    costSlugCandidates:  ["how-much-does-a-wedding-planner-cost-in-ontario", "wedding-planner-cost-ontario"],
  },
};

const HOW_TO_LABELS: Record<VendorCategory, string> = {
  photographer:    "How to choose a wedding photographer in Ontario",
  videographer:    "How to choose a wedding videographer in Ontario",
  dj:              "How to choose a wedding DJ in Ontario",
  florist:         "How to choose a wedding florist in Ontario",
  photo_booth:     "How to choose a wedding photo booth in Ontario",
  catering:        "How to choose a wedding caterer in Ontario",
  cake:            "How to choose your wedding cake in Ontario",
  hair_makeup:     "How to choose wedding hair & makeup in Ontario",
  officiant:       "How to choose a wedding officiant in Ontario",
  limo:            "How to choose wedding transportation in Ontario",
  lighting_decor:  "Wedding lighting & decor in Ontario — a guide",
  wedding_planner: "Do you need a wedding planner in Ontario?",
};

const COST_LABELS: Record<VendorCategory, string> = {
  photographer:    "What does a wedding photographer cost in Ontario?",
  videographer:    "What does a wedding videographer cost in Ontario?",
  dj:              "What does a wedding DJ cost in Ontario?",
  florist:         "What do wedding flowers cost in Ontario?",
  photo_booth:     "What does a wedding photo booth cost in Ontario?",
  catering:        "What does wedding catering cost in Ontario?",
  cake:            "What does a wedding cake cost in Ontario?",
  hair_makeup:     "What does wedding hair & makeup cost in Ontario?",
  officiant:       "What does a wedding officiant cost in Ontario?",
  limo:            "What does wedding transportation cost in Ontario?",
  lighting_decor:  "What do wedding lighting & decor cost in Ontario?",
  wedding_planner: "What does a wedding planner cost in Ontario?",
};

export function howToLabelFor(category: VendorCategory): string { return HOW_TO_LABELS[category]; }
export function costLabelFor(category:  VendorCategory): string { return COST_LABELS[category]; }
