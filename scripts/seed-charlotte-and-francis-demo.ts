/**
 * Seed the "Charlotte & Francis" showcase wedding-website demo plan.
 *
 * This is the demo Priority 3 of the project file calls out — a
 * polished, real-venue example used for marketing screenshots and
 * to show couples what OWV's website builder can produce. The names
 * match the placeholder used across ThemePicker + wizard so
 * ThemeLayoutPreview mini renders and the real site read as a
 * continuous "here's what your site will look like" story.
 *
 * Published state:
 *   - wedding_published:  true   (routed by the wedding-site middleware)
 *   - wizard_completed:   true   (editor stays available, not the wizard)
 *   - tier:               premium (unlocks the Terracotta layout gate)
 *
 * Venue: Ravine Vineyard Estate Winery (Niagara-on-the-Lake) — real
 * venue, score 85, real R2 hero photo from the earlier backfill.
 *
 * Idempotent: re-running upserts by session_id so the demo can be
 * iterated as the layouts + copy evolve.
 *
 * CLI: npx tsx scripts/seed-charlotte-and-francis-demo.ts
 */
import "./_env";
import { db } from "../src/lib/db";
import { weddingPlans, venues } from "../src/lib/schema";
import { and, eq, sql } from "drizzle-orm";

const SESSION_ID = "demo-charlotte-and-francis";
const VENUE_NAME = "Ravine Vineyard Estate Winery";

async function main() {
  const [venue] = await db.select({
    id:         venues.id,
    name:       venues.name,
    slug:       venues.slug,
    city:       venues.city,
    heroCustom: venues.heroImageCustom,
  })
  .from(venues)
  .where(and(
    eq(venues.name, VENUE_NAME),
    sql`hero_image_custom LIKE 'https://%r2.dev%'`,
  ))
  .limit(1);

  if (!venue) {
    console.error(`Venue "${VENUE_NAME}" not found with an R2 hero photo.`);
    console.error(`Run scripts/backfill-venue-website-heros.ts first, or pick another venue.`);
    process.exit(1);
  }

  const plan = {
    sessionId:                 SESSION_ID,
    partner1Name:              "Charlotte",
    partner2Name:              "Francis",
    weddingDate:               "2026-09-12",
    guestCount:                120,
    region:                    "niagara",
    venueId:                   venue.id,
    weddingSiteSlug:           "charlotte-and-francis",
    weddingSiteRegionalDomain: "niagaraweddingvenues.com",
    weddingSiteShowVendors:    true,
    weddingTheme:              "terracotta",
    weddingPublished:          true,
    tier:                      "premium",
    wizardCompleted:           true,
    weddingHeroImage:          venue.heroCustom,
    weddingHashtag:            "#CharlotteAndFrancis",

    weddingParty: [
      { id: "p1", name: "Eleanor Whitfield",  role: "Maid of Honour",
        bio: "Charlotte's sister — the one who's been holding her hair back since eighth grade." },
      { id: "p2", name: "Henry Ashford",       role: "Best Man",
        bio: "Francis's brother, ordained officiant if the officiant no-shows, keeper of the toast that will make everyone cry." },
      { id: "p3", name: "Beatrice Lyon",       role: "Bridesmaid",
        bio: "Charlotte's oldest friend from Toronto — first phone call for anything worth celebrating." },
      { id: "p4", name: "Thomas Callahan",     role: "Groomsman",
        bio: "Francis's university roommate, current bandmate, unofficial wedding-week DJ." },
      { id: "p5", name: "Priya Ramanathan",    role: "Bridesmaid",
        bio: "The one who plans the trips, remembers the birthdays, and gently insists on the vegetable side." },
      { id: "p6", name: "Julian Beckett",      role: "Groomsman",
        bio: "Francis's law-school friend and the person to sit next to if you like a well-timed story." },
    ],

    weddingRegistry: [
      { id: "r1", label: "Simons",         url: "https://www.simons.ca/" },
      { id: "r2", label: "Hudson's Bay",   url: "https://www.thebay.com/" },
      { id: "r3", label: "Honeyfund",      url: "https://www.honeyfund.com/" },
    ],

    thingsToDo: [
      { id: "t1", name: "Bench Wine Tour",
        description: "A half-day tasting through the Twenty Valley wineries — cool-climate reds and iconic Rieslings. Book the Niagara Wine Tours minibus so nobody has to drive.",
        url: "https://www.niagarawinetours.com/" },
      { id: "t2", name: "Falls at Sunset",
        description: "Table Rock as the lights come up over the Horseshoe. Twenty minutes from the venue. Bring a wrap — the mist is real.",
        url: null },
      { id: "t3", name: "Old Town Stroll",
        description: "Queen Street in Niagara-on-the-Lake — boutiques, chocolatiers, and a cluster of cafés worth a lazy Saturday morning. The Old Bookshop is the sleeper.",
        url: null },
      { id: "t4", name: "Peller Estates Icewine Flight",
        description: "A rite of Niagara passage. Book the guided tasting — the Vidal Icewine is what you'll be telling your friends about back home.",
        url: null },
      { id: "t5", name: "Shaw Festival",
        description: "If you're arriving Thursday, the Shaw Theatre stages some of the best repertory theatre in the country. Check the calendar for a Friday matinée.",
        url: "https://www.shawfest.com/" },
    ],

    multipleEvents: [
      { id: "e1", name: "Welcome Drinks",
        date: "Fri, Sep 11",  time: "7:00 PM",
        location: "The Old Winery Restaurant",
        description: "Casual cocktails for out-of-town guests — jackets optional. Come hungry; there'll be wood-fired pizza." },
      { id: "e2", name: "Farewell Brunch",
        date: "Sun, Sep 13", time: "10:00 AM",
        location: "Treadwell Cuisine",
        description: "Pastries, mimosas, and one last long table before the drive home. Come as you are." },
    ],

    ourStory: `Charlotte was reading in the Sheridan library on a Tuesday afternoon in 2019 when Francis sat down at the next table and asked, quite seriously, whether she'd recommend anything of Rachel Cusk's. She recommended three books. He took two out that same afternoon and read one on the train home.

They dated through her master's, his articling year, a global pause, and two very small apartments. There was a rescue mutt named Marlow, a garden that mostly grew tomatoes, and a very long series of Sunday walks along the lakefront.

Francis proposed on a rainy Saturday in October — a fire in the woodstove, coffee going cold, the ring tucked into a book on the shelf. Charlotte said yes before he finished the question, and they spent the rest of the day telling absolutely no one, keeping the secret for themselves until Monday morning.`,

    travelCopy: `Niagara-on-the-Lake sits about ninety minutes from Toronto Pearson and forty-five minutes from Buffalo International. Ravine Vineyard is a short taxi from the town centre — plan on fifteen minutes on wedding day.

We've held a block of rooms at Queen's Landing (four-star, on the river) and the Prince of Wales Hotel (Victorian, in town) under "Whitfield-Ashford Wedding" — call the hotel directly and mention the block for our rate. Book by August 15 to secure the discount.

If you'd like to make a weekend of it, Friday is the wine tour + welcome drinks; Sunday morning is a slow brunch. The theatre calendar is on the Things to Do list — Shaw Festival is running through October.`,

    dressCodeStyle:       "Garden Formal",
    dressCodeDescription: "Long dresses, dark suits, jewel or autumn tones welcome. The ceremony is outdoors in the vineyard — grass underfoot — so flats or block heels are wise. The reception moves indoors; pack a wrap for the evening walk back.",

    /* FAQs + hero tagline live inside weddingGeneratedCopy — that's what
     * the AI-generation flow writes to and what the layouts read from
     * (`generated.heroTagline`, `generated.faqItems`). Setting them
     * here mimics what a real couple would end up with after one pass
     * through the wizard's "Generate my website →" step. */
    weddingGeneratedCopy: {
      heroTagline: `We're getting married in the vineyard where we first talked about getting married. If you can be with us for the weekend — even better. Here's everything you need.`,
      generatedAt: new Date().toISOString(),
      faqItems: [
        { id: "f1", question: "Where are the ceremony and reception?",
          answer: "Both at Ravine Vineyard Estate Winery, on the property in Niagara-on-the-Lake. The ceremony is in the vineyard (outdoors, weather permitting), followed by cocktails on the terrace and reception in the stone barn." },
        { id: "f2", question: "Is there parking on site?",
          answer: "Yes — free parking at the venue. If you're staying in town and taking a taxi, allow fifteen minutes each way; Uber is available but sparse late at night." },
        { id: "f3", question: "Can I bring a plus-one?",
          answer: "We've addressed each invitation to the specific guests we're able to host. If your invitation is addressed to you and a guest, please RSVP for both — otherwise, we'd love to keep the day intimate." },
        { id: "f4", question: "What's the weather like in mid-September?",
          answer: "Beautiful — days in the low 20s (°C), cool evenings. We'll have blankets and heaters if the temperature drops. Bring a jacket." },
        { id: "f5", question: "Are children welcome?",
          answer: "The ceremony and dinner are adults-only so parents can properly relax. If you'd like a recommendation for a sitter in NOTL, message Charlotte's sister Eleanor — she has a shortlist." },
      ],
    },

    weddingPageConfig: {
      hero:          true,
      eventDetails:  true,
      rsvp:          true,
      ourStory:      true,
      travel:        true,
      weddingParty:  true,
      photoGallery:  false,  /* No gallery images seeded — real couple would upload */
      dressCode:     true,
      thingsToDo:    true,
      registry:      true,
      faq:           true,   /* Enabled — the demo has real FAQs */
      vendorCredits: true,
    },
  };

  const [existing] = await db.select({ id: weddingPlans.id })
    .from(weddingPlans).where(eq(weddingPlans.sessionId, SESSION_ID)).limit(1);

  if (existing) {
    await db.update(weddingPlans).set(plan).where(eq(weddingPlans.id, existing.id));
    console.log(`Updated wedding_plans id=${existing.id} (slug=charlotte-and-francis)`);
  } else {
    const [ins] = await db.insert(weddingPlans).values(plan).returning({ id: weddingPlans.id });
    console.log(`Inserted wedding_plans id=${ins.id} (slug=charlotte-and-francis)`);
  }
  console.log(`Venue:  ${venue.name} (id=${venue.id})`);
  console.log(`Hero:   ${venue.heroCustom}`);
  console.log(`Local:  http://localhost:3000/weddings/charlotte-and-francis`);
  console.log(`Prod:   https://ontarioweddingvendors.com/weddings/charlotte-and-francis`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
