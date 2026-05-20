/**
 * Seed a "test-couple" wedding plan to preview the wedding website
 * end-to-end with every section turned on.
 *
 *   npx tsx scripts/seed-test-couple.ts
 *
 * Idempotent — overwrites the existing test-couple row if present.
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { venues, weddingPlans } from "../src/lib/schema";
import { newId } from "../src/lib/wedding-website";

async function main() {
  console.log("[seed] preparing test-couple plan…");

  /* Find a real Niagara venue to associate with the plan (best for the
   * Romantic theme + Things-to-Do regional defaults). */
  const [venue] = await db
    .select({ id: venues.id, name: venues.name, city: venues.city, region: venues.region })
    .from(venues)
    .where(sql`${venues.region} = 'niagara' AND ${venues.googleRating} >= 4.5`)
    .limit(1);

  console.log("[seed] venue:", venue?.name, "(", venue?.city, ")");

  const sessionId      = "test-couple-session-uuid";
  const slug           = "test-couple";
  const regionalDomain = "niagaraweddingvenues.com";

  const partner1 = "Charlotte";
  const partner2 = "Francis";

  const pageConfig = {
    hero:          true,
    eventDetails:  true,
    ourStory:      true,
    rsvp:          true,
    travel:        true,
    weddingParty:  true,
    photoGallery:  false,
    dressCode:     true,
    thingsToDo:    true,
    registry:      true,
    faq:           true,
    vendorCredits: true,
  };

  const weddingParty = [
    { id: newId(), name: "Sophie Tremblay",  role: "Maid of Honour", bio: "Charlotte's sister and lifelong partner-in-crime." },
    { id: newId(), name: "Marcus Chen",      role: "Best Man",        bio: "Francis's roommate from architecture school." },
    { id: newId(), name: "Olivia Davies",    role: "Bridesmaid",      bio: "" },
    { id: newId(), name: "Liam O'Connor",    role: "Groomsman",       bio: "" },
  ];

  const weddingRegistry = [
    { id: newId(), label: "Crate & Barrel", url: "https://www.crateandbarrel.com" },
    { id: newId(), label: "Honeyfund",      url: "https://www.honeyfund.com" },
    { id: newId(), label: "The Bay",        url: "https://www.thebay.com" },
  ];

  const thingsToDo = [
    { id: newId(), name: "Walk Queen Street, Niagara-on-the-Lake", description: "Picture-perfect heritage shopping street with cafés, ice cream, and historic buildings. 20-minute drive from most Niagara venues." },
    { id: newId(), name: "Wine-country tour",                       description: "Take an afternoon tasting tour through Jordan, Beamsville, or Niagara-on-the-Lake. Several operators offer hotel pickup.", url: "https://www.niagarawinetours.com" },
    { id: newId(), name: "Maid of the Mist",                        description: "Iconic boat ride at the foot of Horseshoe Falls. Runs May through October. Buy tickets online to skip the queue.", url: "https://www.maidofthemist.com" },
    { id: newId(), name: "Skylon Tower",                            description: "Best Falls view after dark. The revolving dining room books up — reserve a week ahead." },
  ];

  const multipleEvents = [
    { id: newId(), name: "Welcome dinner",   date: "2026-09-11", time: "6:30 PM", location: "The Pillar & Post, Niagara-on-the-Lake", audience: "everyone" as const,        description: "Casual dinner the night before for everyone in town early." },
    { id: newId(), name: "Rehearsal dinner", date: "2026-09-11", time: "8:00 PM", location: "The Pillar & Post (private room)",      audience: "wedding-party" as const,    description: "Wedding party + immediate family only." },
    { id: newId(), name: "Day-after brunch", date: "2026-09-13", time: "10:00 AM", location: "Vineland Estates Winery",              audience: "everyone" as const,        description: "Casual goodbye brunch on the patio — drop in any time." },
  ];

  const generatedCopy = {
    heroTagline: "A vineyard wedding in the heart of Niagara",
    ourStory: "We met during a Wednesday-night architecture studio in 2019, both quiet at the back of the room arguing the same point. Francis proposed at the end of a wine tour in Vineland on a rainy October afternoon, exactly five years later. We're so excited to celebrate with you in the place that brought us together.",
    travelCopy: "We have a hotel block at the Pillar & Post in Niagara-on-the-Lake under \"Charlotte & Francis Wedding\" — call by August 1 to get the rate. Free parking is on site. A shuttle will run from the hotel to the venue at 3:30 PM with a return shuttle at midnight. The nearest airport is Buffalo (45 min) — Toronto Pearson is about 90 minutes depending on traffic.",
    dressCopyHint: "Cocktail attire. The ceremony is on the lawn so block heels or flats are a good call — and bring a wrap for after sunset.",
    faqItems: [
      { id: newId(), question: "When should I RSVP by?",                   answer: "Please RSVP by August 1st so we can finalize the seating chart and meals with the venue." },
      { id: newId(), question: "Are kids welcome?",                        answer: "We love your little ones — but this will be an adults-only celebration. Reach out if you need childcare suggestions in the area." },
      { id: newId(), question: "Will there be vegetarian/gluten-free options?", answer: "Yes — the venue's catering team will offer vegetarian, gluten-free, and vegan options. Let us know in your RSVP." },
      { id: newId(), question: "Is there parking at the venue?",           answer: "Yes, free on-site parking. We're also running a shuttle from the Pillar & Post hotel — details on the Travel section above." },
      { id: newId(), question: "Can I bring a plus-one?",                  answer: "Your invitation will specify whether a plus-one is included. If you'd like to bring someone, please reach out directly." },
    ],
    generatedAt: new Date().toISOString(),
  };

  const dressCodeDescription = "Cocktail attire. The ceremony is on the lawn so block heels or flats are a good call — and bring a wrap for after sunset.";

  await db.execute(sql`
    INSERT INTO wedding_plans (
      session_id, wedding_site_slug, wedding_site_regional_domain,
      partner1_name, partner2_name, wedding_date, total_budget, guest_count,
      region, venue_id, style,
      wedding_theme, wedding_published, wedding_hashtag,
      wedding_page_config, wedding_party, wedding_registry,
      things_to_do, multiple_events, wedding_generated_copy,
      our_story, travel_copy,
      dress_code_style, dress_code_description,
      booked_vendors, wedding_site_show_vendors
    )
    VALUES (
      ${sessionId}, ${slug}, ${regionalDomain},
      ${partner1}, ${partner2}, '2026-09-12', 45000, 100,
      'niagara', ${venue?.id ?? null}, 'standard',
      'romantic', true, '#CharlotteAndFrancis2026',
      ${JSON.stringify(pageConfig)}::jsonb,
      ${JSON.stringify(weddingParty)}::jsonb,
      ${JSON.stringify(weddingRegistry)}::jsonb,
      ${JSON.stringify(thingsToDo)}::jsonb,
      ${JSON.stringify(multipleEvents)}::jsonb,
      ${JSON.stringify(generatedCopy)}::jsonb,
      ${generatedCopy.ourStory},
      ${generatedCopy.travelCopy},
      'Cocktail',
      ${dressCodeDescription},
      '{}'::jsonb,
      true
    )
    ON CONFLICT (session_id) DO UPDATE SET
      wedding_site_slug             = EXCLUDED.wedding_site_slug,
      wedding_site_regional_domain  = EXCLUDED.wedding_site_regional_domain,
      partner1_name                 = EXCLUDED.partner1_name,
      partner2_name                 = EXCLUDED.partner2_name,
      wedding_date                  = EXCLUDED.wedding_date,
      total_budget                  = EXCLUDED.total_budget,
      guest_count                   = EXCLUDED.guest_count,
      region                        = EXCLUDED.region,
      venue_id                      = EXCLUDED.venue_id,
      style                         = EXCLUDED.style,
      wedding_theme                 = EXCLUDED.wedding_theme,
      wedding_published             = EXCLUDED.wedding_published,
      wedding_hashtag               = EXCLUDED.wedding_hashtag,
      wedding_page_config           = EXCLUDED.wedding_page_config,
      wedding_party                 = EXCLUDED.wedding_party,
      wedding_registry              = EXCLUDED.wedding_registry,
      things_to_do                  = EXCLUDED.things_to_do,
      multiple_events               = EXCLUDED.multiple_events,
      wedding_generated_copy        = EXCLUDED.wedding_generated_copy,
      our_story                     = EXCLUDED.our_story,
      travel_copy                   = EXCLUDED.travel_copy,
      dress_code_style              = EXCLUDED.dress_code_style,
      dress_code_description        = EXCLUDED.dress_code_description,
      wedding_site_show_vendors     = EXCLUDED.wedding_site_show_vendors,
      updated_at                    = now()
  `);

  const [row] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.weddingSiteSlug, slug))
    .limit(1);

  console.log("[seed] test-couple plan ready (id:", row?.id, ")");
  console.log("[seed] preview at: http://localhost:3000/weddings/test-couple");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
