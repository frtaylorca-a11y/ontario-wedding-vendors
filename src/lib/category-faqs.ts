/**
 * Three FAQ entries per vendor category, rendered on the category
 * page (/vendors/[category]) and used as the OWV-generated portion of
 * the Part-2 hybrid FAQ on each vendor detail page.
 *
 * Each "cost" question pulls live numbers from ontario-pricing.ts —
 * if the pricing table updates, these answers update automatically
 * via the buildCategoryFaqs() helper at the bottom of the file.
 *
 * Q&A goals:
 *   1. Pricing — concrete dollar range + median, Niagara vs GTA.
 *   2. Booking lead time — practical, Ontario-specific.
 *   3. What to look for — category-distinct.
 *
 * NO generic content. Each answer carries either a number, a
 * place, a season, or a real product/feature.
 */
import { getPricing, type PricingCategory } from "./ontario-pricing";
import type { VendorCategory } from "@/types";

export type CategoryFaq = {
  question: string;
  answer:   string;
  /** Optional internal link the answer references (rendered as a
   *  hyperlink in the rendering layer). */
  link?: { text: string; href: string };
};

/* Helper: format a dollar value with commas, no decimals. */
function $$(n: number): string {
  return `$${n.toLocaleString("en-CA")}`;
}

/* Helper: render a "Niagara $X–$Y, GTA $A–$B" range line from
 * the live pricing table. Returns null if either region is missing. */
function pricingLine(category: PricingCategory): string | null {
  const n = getPricing(category, "niagara");
  const g = getPricing(category, "gta");
  if (!n || !g) return null;
  return `In Niagara, expect ${$$(n.min)}–${$$(n.max)}; in the GTA, ${$$(g.min)}–${$$(g.max)}. Most couples budget around ${$$(g.median)}.`;
}

/* Per-category FAQ templates. Where the question is about pricing,
 * the answer is closed by interpolating the live pricing string.
 * Other answers stay constant — Ontario-specific facts that don't
 * change with the pricing table. */
function buildCategoryFaqs(): Record<VendorCategory, CategoryFaq[]> {
  return {
    photographer: [
      {
        question: "How much does a wedding photographer cost in Ontario?",
        answer:
          "Ontario wedding photographers typically range from $1,200 to $7,500 depending on experience, hours of coverage, and whether you book a second shooter. " +
          (pricingLine("photographer") ?? "") +
          " A second shooter usually adds $600–$1,200 to the base package.",
        link: { text: "See the full photographer pricing guide", href: "/blog/wedding-photographer-cost-ontario" },
      },
      {
        question: "How far in advance should I book a wedding photographer?",
        answer:
          "Most Ontario couples book their photographer 12–18 months before the wedding date. Premier studios in Niagara, Toronto, and the GTA close out peak-season Saturdays (June + September) more than a year in advance. Mid-market photographers tend to have availability 6–10 months out.",
      },
      {
        question: "What should I look for when booking a wedding photographer?",
        answer:
          "Consistency of style across a full wedding (not just a portfolio highlight reel), recent Google reviews, and how the photographer directs you on the engagement session. Ask whether the lead photographer in the portfolio will be the one on your day — some larger studios assign a second-tier shooter from the same team.",
      },
    ],

    videographer: [
      {
        question: "How much does a wedding videographer cost in Ontario?",
        answer:
          "Ontario wedding videographers run $1,500 to $9,000 depending on the team size, camera count, and whether you want a same-day edit. " +
          (pricingLine("videographer") ?? "") +
          " Drone footage adds $300–$700; full raw footage delivery adds $500–$1,000.",
        link: { text: "See the videographer pricing guide", href: "/blog/wedding-videographer-cost-ontario" },
      },
      {
        question: "How long should a wedding video be?",
        answer:
          "Most Ontario videographers deliver two cuts: a 4–8 minute highlight reel set to licensed music, plus a 15–30 minute feature with the ceremony, speeches, and first dances. Both arrive 8–12 weeks after the wedding. Documentary-style films run longer (45–90 minutes) and cost more in post-production.",
      },
      {
        question: "Cinematic vs documentary style — which is right for us?",
        answer:
          "Cinematic edits add colour grading, music licensing, and re-staged shots (the rings, the dress hanging in the window); they cost $500–$1,500 more than documentary at the same studio because of post-production hours. Documentary captures speeches uncut and ceremony in real time — better for couples who want a record over a film.",
      },
    ],

    dj: [
      {
        question: "How much does a wedding DJ cost in Ontario?",
        answer:
          "Ontario wedding DJs run $1,200 to $3,000 for a standard 6-hour reception. " +
          (pricingLine("dj") ?? "") +
          " Add-ons that swing the total: uplighting ($400–$800), a photo booth ($800–$1,500), and ceremony PA ($150–$300).",
        link: { text: "See the wedding DJ pricing guide", href: "/blog/wedding-dj-cost-ontario" },
      },
      {
        question: "How far in advance should I book a wedding DJ?",
        answer:
          "Top-tier Ontario DJs (Toronto agencies + Niagara specialists) close out peak-season Saturdays 10–14 months ahead. The mid-market books closer to 6–9 months out. Off-season Friday and Sunday weddings can often book 3–4 months out — often with a 10–15% rate discount.",
      },
      {
        question: "What's the difference between a DJ and an MC?",
        answer:
          "About 70% of Ontario wedding DJs bundle MC duties (announcing the wedding party, walking through speeches and cake cutting) at no extra cost. A meaningful minority charge $300–$600 extra OR don't do it at all — confirm in writing. Dedicated wedding MCs (separate booking) run $400–$900 and are worth it for cultural ceremonies, multi-language announcements, or family tributes.",
      },
    ],

    florist: [
      {
        question: "How much do wedding flowers cost in Ontario?",
        answer:
          "Ontario wedding florists run $1,500 to $8,000 for a full reception package. " +
          (pricingLine("florist") ?? "") +
          " The bridal bouquet typically lands $150–$400; attendant bouquets $80–$160; centrepieces $75–$300 per table.",
        link: { text: "See the florist pricing guide", href: "/blog/wedding-florist-cost-ontario" },
      },
      {
        question: "When are wedding flowers cheapest in Ontario?",
        answer:
          "Niagara growers supply peonies + ranunculus in May–June and garden roses in July–September — locally-grown blooms are 20–30% cheaper than the equivalent imported variety and have noticeably better stem quality. November through April means imported via Miami or Bogotá, with a 30–50% premium and shorter vase life.",
      },
      {
        question: "What's the cheapest way to cut a wedding flower budget?",
        answer:
          "Three swaps drop the total ~30% without losing the look: ask for 'seasonal' rather than specific blooms (saves 30–40% on centrepieces), pick a corner-asymmetric arch instead of full-coverage (half the cost, same hero shot), and reduce attendant count by two (saves $250–$400 in bouquets + boutonnières).",
      },
    ],

    photo_booth: [
      {
        question: "How much does a wedding photo booth cost in Ontario?",
        answer:
          "Ontario wedding photo booths run $800 to $2,500 for a 3-4 hour rental. " +
          (pricingLine("photo_booth") ?? "") +
          " The price difference is mostly setup style: a standard enclosed booth is the budget end; open-air sailcloth or luxury cabinets sit at the top of the range.",
      },
      {
        question: "What kind of photo booth setup should I get?",
        answer:
          "Open-air booths fit larger groups in the frame and read more editorial in photos; enclosed booths are more intimate and give couples privacy for funny shots. Sailcloth booths are visually striking but need at least 8×8 ft of floor space — confirm your venue's layout before booking.",
      },
      {
        question: "How much space does a photo booth need at my venue?",
        answer:
          "Most Ontario photo booth setups need 6–10 ft of floor space plus a 6-foot prop table. Sailcloth and luxury cabinets need more (8×8 ft minimum). Confirm with your venue coordinator — some Niagara wineries and Toronto distilleries have tight reception layouts.",
      },
    ],

    catering: [
      {
        question: "How much does wedding catering cost in Ontario?",
        answer:
          "Ontario wedding catering runs $85 to $250 per guest, all-in. " +
          (pricingLine("catering") ?? "") +
          " Add 18–20% gratuity and 13% HST on top of the quoted per-person rate — a $125 quote typically lands closer to $155 per guest after taxes and tip.",
        link: { text: "See the wedding catering pricing guide", href: "/blog/wedding-catering-cost-ontario" },
      },
      {
        question: "Plated dinner vs buffet vs food stations — what's actually cheaper?",
        answer:
          "Buffets are typically $10–$20 per guest cheaper than plated, but require more food volume — net savings are smaller than the per-head number suggests. Food stations are often MORE expensive than plated because each station needs its own chef and equipment. Family-style sits between buffet and plated, with a generous read and works best under 120 guests.",
      },
      {
        question: "Does my venue let me bring my own caterer?",
        answer:
          "Most Ontario wineries and hotels require their in-house catering. Most barns, lofts, and dry-hall venues require you bring your own from a preferred-vendor list. Read the catering clause in the venue contract — exclusive in-house catering can add 30–40% to the food line versus a competitive external bid.",
      },
    ],

    cake: [
      {
        question: "How much does a wedding cake cost in Ontario?",
        answer:
          "Ontario wedding cakes run $400 to $3,000 depending on size, tiers, and decoration complexity. " +
          (pricingLine("cake") ?? "") +
          " A 3-tier buttercream cake for 100 guests typically lands $600–$900; sugar-flower decoration or fondant work bumps it 40–60% higher.",
      },
      {
        question: "When should I book a wedding cake designer?",
        answer:
          "Most Ontario cake designers book 4–6 months ahead for peak-season Saturdays. The boutique specialists (Bobbette & Belle, Sweet Bake Shop, Truffle Toronto) close 8–10 months out. Tastings happen 6–8 weeks before the wedding — bring inspiration photos and a final guest count to that session.",
      },
      {
        question: "Should I serve a real wedding cake or a dessert table?",
        answer:
          "A 'show cake' (one or two real tiers + styrofoam dummies underneath) plus a dessert table is increasingly popular in Ontario — gives the cake-cutting moment without paying to serve a full cake to every guest. Saves $200–$500 versus an all-real 3-tier for 100 guests.",
      },
    ],

    hair_makeup: [
      {
        question: "How much do wedding hair and makeup artists cost in Ontario?",
        answer:
          "Ontario wedding hair & makeup runs $250 to $1,200 per bride. " +
          (pricingLine("hair_makeup") ?? "") +
          " Bridesmaid hair runs $80–$150 each; bridesmaid makeup $80–$130. A trial 4–6 weeks before the wedding adds $100–$200.",
      },
      {
        question: "Should I do a hair and makeup trial?",
        answer:
          "Yes — booking the same artist for the trial and the wedding day is the single best way to avoid morning-of surprises. Bring photos in your actual lighting and wear a white or neutral top so you can read the makeup against the dress. Most Ontario artists schedule trials 4–8 weeks out.",
      },
      {
        question: "When should the hair and makeup team start on the wedding day?",
        answer:
          "For a 2 PM ceremony, the hair + makeup team typically arrives at 8 AM for a 6-person wedding party (bride + 3 bridesmaids + 2 mothers). Bride goes last in both rotations so makeup is freshest in photos. Block 90 minutes for the bride alone, 45 minutes per attendant.",
      },
    ],

    officiant: [
      {
        question: "How much does a wedding officiant cost in Ontario?",
        answer:
          "Ontario wedding officiants run $150 to $1,400 depending on customization, rehearsal attendance, and travel. " +
          (pricingLine("officiant") ?? "") +
          " Religious officiants typically cost more than civil ones because of the meeting cadence (3–5 prep meetings is common).",
      },
      {
        question: "How do I find a wedding officiant in Ontario?",
        answer:
          "All Ontario wedding officiants must be authorized by the Province through ServiceOntario. Religious officiants register through their denomination; civil officiants register individually. Most established officiants book 4–8 months ahead for peak-season Saturdays. Bring the marriage licence to your rehearsal — the officiant signs it at the ceremony.",
      },
      {
        question: "Can I write my own wedding ceremony in Ontario?",
        answer:
          "Yes — Ontario requires the officiant to read specific legal vows ('I do solemnly declare…') and pronounce the couple married, but every other part of the ceremony is yours to design. Most officiants will work with you on 2–3 drafts of a personalised script; budget 4–6 weeks for the back-and-forth.",
      },
    ],

    limo: [
      {
        question: "How much does wedding transportation cost in Ontario?",
        answer:
          "Ontario wedding limos and transportation run $600 to $3,000 depending on vehicle and hours. " +
          (pricingLine("limo") ?? "") +
          " Most operators require a 4–5 hour minimum; party buses sit at the top of the range; vintage cars (Bentley, Rolls) typically have a strict 3-hour window.",
        link: { text: "See the wedding transportation pricing guide", href: "/blog/wedding-limo-cost-ontario" },
      },
      {
        question: "Do we need a guest shuttle in Ontario?",
        answer:
          "Strongly recommended for Niagara wine country, Muskoka, and downtown Toronto venues without parking. A 50-passenger coach for a 6-hour evening loop typically runs $1,200–$2,000. Cheaper than the Uber-availability nightmare your guests will face at 1 AM in a remote venue.",
      },
      {
        question: "How long should we book the limo for?",
        answer:
          "Most couples book 4–5 hours: 30 min pickup, 15–30 min drive to ceremony, 30 min buffer, 45–90 min between ceremony and reception (often with a photo stop), 15–30 min final transfer. Driver gratuity (15–20% on the rental rate) is rarely included and is expected on top.",
      },
    ],

    lighting_decor: [
      {
        question: "How much does wedding lighting and decor cost in Ontario?",
        answer:
          "Ontario wedding lighting + decor runs $800 to $6,000 depending on scope. " +
          (pricingLine("lighting_decor") ?? "") +
          " Bistro string lights over a dance floor run $400–$1,200; uplighting along walls $20–$40 per fixture (15–25 fixtures for a typical room); a focal-point installation behind the head table $800–$2,500.",
      },
      {
        question: "Do we need lighting at our venue?",
        answer:
          "In barns, lofts, and tented receptions: yes — those venues are intentionally under-lit so you can set your own mood. In hotel ballrooms and most Niagara wineries: rarely needed beyond uplighting to add colour. The single best lighting dollar is bistro string lights overhead — they carry the entire mood of a barn or tent reception.",
      },
      {
        question: "When should we book a lighting designer?",
        answer:
          "Most Ontario lighting designers book 4–6 months ahead for peak-season Saturdays. The site walk (designer visits your venue) typically happens 8–12 weeks before the wedding. Most designers will bring inspiration photos to that session — bring yours too, plus your venue's floorplan if you have it.",
      },
    ],

    wedding_planner: [
      {
        question: "How much does a wedding planner cost in Ontario?",
        answer:
          "Ontario wedding planners run $1,500 to $15,800 depending on the package. " +
          (pricingLine("wedding_planner") ?? "") +
          " Three tiers are common: month-of coordination ($1,500–$3,500), partial planning ($3,000–$7,000), full planning (10–15% of total wedding budget, typically $8,000–$15,000+).",
      },
      {
        question: "Do I need a wedding planner if my venue has a coordinator?",
        answer:
          "Different roles. The venue coordinator runs the venue's operations (room flip, catering timing, vendor load-in). A wedding planner represents YOU — they negotiate vendor contracts, manage the timeline across all vendors, and handle issues on the day. Month-of coordination is enough for couples who've done most of the planning themselves but want someone running the day.",
      },
      {
        question: "When should we hire a wedding planner?",
        answer:
          "Full planning: 12–18 months before the wedding date, before you book the venue. Partial planning: 6–9 months out, after the venue is locked in. Month-of coordination: 6–10 weeks before the wedding — the planner needs that long to absorb your existing vendor list and build the timeline.",
      },
    ],
  };
}

export const CATEGORY_FAQS: Record<VendorCategory, CategoryFaq[]> = buildCategoryFaqs();
