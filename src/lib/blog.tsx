/**
 * Blog content store + helpers.
 *
 * Posts are defined as TypeScript objects rather than MDX/markdown files
 * so the JSX can use rose accents (<em>), region-aware vendor counts,
 * and inline category links without a parser. Easy to migrate to MDX
 * later — the BlogPost shape maps 1:1.
 *
 * Listing + detail pages read from BLOG_POSTS by slug.
 */
import type { ReactNode } from "react";

export type BlogPost = {
  slug: string;
  title: string;
  /** Short editorial hook — surfaces on the index page and meta description */
  excerpt: string;
  /** Tag visible at top of post, e.g. "Niagara guide" */
  category: string;
  /** ISO date — drives sort order + publish-date schema */
  publishedAt: string;
  /** Estimated read time minutes */
  readMinutes: number;
  /** Hero image (relative to /public) */
  heroImage: string;
  /** SEO meta description (40–160 chars) */
  metaDescription: string;
  /** Inline JSX body — sections use the shared `<Section>` helper */
  body: ReactNode;
};

export const BLOG_POSTS: BlogPost[] = [
  /* ─── 1. Best wedding venues in Niagara (2026) ───────────────────── */
  {
    slug: "best-wedding-venues-niagara-2026",
    title: "Best Wedding Venues in Niagara (2026 Guide)",
    excerpt:
      "From vineyard estates in Niagara-on-the-Lake to riverside resorts in Niagara Falls, here are the venues couples are booking in 2026 — with capacity, catering style, and what to expect at each.",
    category: "Niagara guide",
    publishedAt: "2026-05-20",
    readMinutes: 8,
    heroImage: "/images/hero-niagara-vineyard.png",
    metaDescription:
      "The 2026 guide to the best wedding venues in Niagara. Vineyards in NOTL, estate resorts, barn weddings — capacity, catering, and pricing benchmarks for each.",
    body: (
      <>
        <p>
          Niagara is Ontario&rsquo;s most-booked wedding region outside the GTA,
          and for good reason: 30+ wineries with weddings programs, a dedicated
          historic district in Niagara-on-the-Lake, and Niagara Falls itself
          for the destination couples. We track 250+ venues across the region;
          this is the working short-list we&rsquo;d hand a couple booking for a
          2026 Saturday in peak season.
        </p>

        <h2>Vineyard estates in Niagara-on-the-Lake</h2>
        <p>
          The wine country between Niagara Falls and Lake Ontario has the
          highest concentration of premium venues in the province. Expect{" "}
          <strong>$10,000–$25,000</strong> for venue + plated dinner at peak
          dates. White Oaks Resort, Konzelmann Estate Winery, Stratus, and
          Trius all run formal weddings programs with in-house catering and
          on-site accommodation for the wedding party.
        </p>
        <p>
          What to look for: dedicated wedding coordinator on staff (most have
          one), indoor backup for outdoor ceremonies (Ontario weather rarely
          cooperates in May or September), and a clear bar package — some
          wineries restrict to their own labels which limits guest choice.
        </p>

        <h2>Barn &amp; rural wedding venues</h2>
        <p>
          Outside NOTL, the Lincoln &amp; West Niagara escarpment area has a
          dozen barn venues — Honsberger Estate, The Estate at Hidden Valley,
          and Little Barn Co. Weddings among the most-booked. These typically
          run <strong>$5,000–$12,000</strong> for venue rental, with external
          catering. Couples here are often building their own vendor team
          rather than picking from an in-house list.
        </p>

        <h2>Niagara Falls hotels and resorts</h2>
        <p>
          For destination-style weddings, the Sheraton on the Falls, Marriott
          Fallsview, and Niagara Falls Convention Centre offer 200–500 guest
          capacity with full event production. Pricing varies wildly with
          season — Falls View suites are at peak through summer and December
          (Festival of Lights weddings have a small but devoted following).
        </p>

        <h2>How to pick between them</h2>
        <p>
          The deciding factor for most couples is <em>catering style</em>:
          wineries and resorts include it; barns and rural venues require you
          to source a caterer separately, which adds 30–40% to your venue
          line. If you&rsquo;ve already booked a caterer you love, lean barn.
          If you want a single coordinator handling food + room + ceremony
          space, lean winery or resort.
        </p>
        <p>
          Browse the full list with capacity, rating, and Google review counts
          on our <a href="/regions/niagara">Niagara venues page</a>, or filter
          to Niagara-on-the-Lake specifically on{" "}
          <a href="/cities/niagara-on-the-lake">our NOTL guide</a>.
        </p>
      </>
    ),
  },

  /* ─── 2. Wedding photographer cost in Ontario ───────────────────── */
  {
    slug: "wedding-photographer-cost-ontario",
    title: "How Much Does a Wedding Photographer Cost in Ontario?",
    excerpt:
      "Ontario wedding photographers run $2,200–$6,500 for a full day in 2026. Here's what each tier actually includes — and the three line items that swing pricing most.",
    category: "Vendor pricing",
    publishedAt: "2026-05-18",
    readMinutes: 6,
    heroImage: "/images/vendor-photographer.png",
    metaDescription:
      "Ontario wedding photographer cost in 2026 — typical pricing tiers, what's included in each, and the three factors that swing your final number.",
    body: (
      <>
        <p>
          Across the 200+ active photographers in our directory, the working
          range for an Ontario wedding photographer in 2026 is{" "}
          <strong>$2,200 at the budget end up to $6,500 at the premium end</strong>{" "}
          for a single-shooter, 8-hour wedding day. Here&rsquo;s what each tier
          typically gets you and where the money actually goes.
        </p>

        <h2>Budget tier — $2,200–$3,200</h2>
        <p>
          Single shooter, 6–8 hours of coverage, ~400 edited photos, online
          gallery delivery, print-release. Often newer photographers building a
          portfolio or established shooters offering a no-frills package for
          weekday or off-peak weddings.
        </p>
        <p>
          What you typically don&rsquo;t get: engagement session included,
          second shooter, printed albums. The print-release means you can
          legally print your own photos, but you won&rsquo;t see physical
          delivery.
        </p>

        <h2>Mid tier — $3,500–$5,000</h2>
        <p>
          This is where most Ontario couples land. Coverage runs 8–10 hours,
          usually includes a complimentary engagement session, sometimes a
          second shooter for the prep and ceremony. Delivery is typically
          600–800 edited photos plus a print credit. Most photographers at
          this tier have 50+ Ontario weddings behind them.
        </p>

        <h2>Premium tier — $5,500–$6,500+</h2>
        <p>
          Full-day coverage with a second shooter, engagement session,
          rehearsal-dinner coverage, premium albums (Italian leather, fine-art
          prints), and often a same-day slideshow for the reception. Premium
          photographers are usually booked 12–18 months out; many cap their
          weddings per year and require a 50% deposit at booking.
        </p>

        <h2>The three line items that swing pricing</h2>
        <p>
          1. <strong>Second shooter</strong> adds <strong>$600–$1,200</strong>{" "}
          on average. Worth it for any wedding with simultaneous prep across
          two locations or a guest count above 150.
        </p>
        <p>
          2. <strong>Hours of coverage</strong> — adding a 9th and 10th hour
          typically runs $250–$400/hour. Most couples underestimate dance-floor
          time; if you want the last song captured, lock in 9 hours minimum.
        </p>
        <p>
          3. <strong>Album</strong> — a 30-page Italian leather album runs
          $400–$900 on top of the package. Many couples skip this at booking
          and add it post-wedding.
        </p>

        <p>
          Browse photographers in your region with distance and reviews on{" "}
          <a href="/vendors/photographer">our photographers directory</a>.
        </p>
      </>
    ),
  },

  /* ─── 3. Niagara-on-the-Lake wedding venues ─────────────────────── */
  {
    slug: "niagara-on-the-lake-wedding-venues",
    title: "Niagara-on-the-Lake Wedding Venues: A 2026 Guide",
    excerpt:
      "Niagara-on-the-Lake punches well above its weight for weddings — historic estates, Lake Ontario shoreline, and the highest concentration of wineries in Canada. Here's the working list.",
    category: "Niagara guide",
    publishedAt: "2026-05-15",
    readMinutes: 7,
    heroImage: "/images/hero-niagara-vineyard.png",
    metaDescription:
      "The 2026 guide to wedding venues in Niagara-on-the-Lake. Vineyards, historic estates, lake shoreline — capacity, catering, and what to ask each venue.",
    body: (
      <>
        <p>
          Niagara-on-the-Lake has roughly 40 wedding venues for a town of
          17,000 — the highest density in Ontario. The mix runs from
          century-old estate homes to working wineries to lakefront resorts.
          For couples choosing between &ldquo;Niagara&rdquo; and &ldquo;NOTL
          specifically&rdquo;, here&rsquo;s what to know about the latter.
        </p>

        <h2>Why NOTL specifically</h2>
        <p>
          Three things set NOTL apart from the broader Niagara region.{" "}
          <strong>Concentration</strong> — your venue, your hotel, your
          photographer, and dinner the night before are all within ten
          minutes&rsquo; drive. <strong>Walkability</strong> — Old Town is
          one of the few Ontario wedding destinations where guests can walk
          back to their hotel after dinner. <strong>Brand</strong> — the
          town reads as &ldquo;destination wedding without leaving Ontario&rdquo;
          on a save-the-date.
        </p>

        <h2>Winery venues</h2>
        <p>
          Stratus, Trius, Peller Estates, Konzelmann, and Reif all run formal
          weddings programs. Expect <strong>$12,000–$22,000</strong> all-in
          for 120 guests including venue, catering, and bar (in-house wines
          only at most). Stratus and Trius have the most modern facilities;
          Peller has the largest single-room capacity.
        </p>

        <h2>Historic estates</h2>
        <p>
          Pillar &amp; Post and Queen&rsquo;s Landing (Vintage Hotels) are the
          big two. Both are full hotels — you can block 30–60 rooms for guests
          and the wedding party. Pricing is <strong>$10,000–$18,000</strong>{" "}
          for 100 guests including a plated dinner. The Charles Hotel is the
          quieter alternative for smaller weddings (60–80 guests).
        </p>

        <h2>Lakeshore + outdoor</h2>
        <p>
          White Oaks Resort &amp; Spa anchors the south end with a manicured
          property and full coordination team. For couples wanting Lake
          Ontario as the backdrop, the lakeside terrace at Queen&rsquo;s Royal
          Park is bookable through the town for ceremonies only (no reception
          on the public site, but several nearby venues will host the dinner
          half).
        </p>

        <h2>What to ask each venue</h2>
        <p>
          Six questions worth asking on every NOTL tour:
        </p>
        <ol>
          <li>Indoor backup space for outdoor ceremony — included or extra?</li>
          <li>In-house catering or do we bring our own?</li>
          <li>Bar package — restricted to in-house wines, or open?</li>
          <li>Vendor list — preferred-only, recommended, or open?</li>
          <li>Block-bookable rooms for the wedding party + guests?</li>
          <li>What&rsquo;s the latest acceptable end time? (Many NOTL venues stop music at 11pm)</li>
        </ol>

        <p>
          Browse the full Niagara-on-the-Lake list with capacity, rating,
          coordinator details on{" "}
          <a href="/cities/niagara-on-the-lake">our NOTL venues page</a>.
        </p>
      </>
    ),
  },

  /* ─── 4. Niagara Falls wedding venues ─────────────────────────────── */
  {
    slug: "niagara-falls-wedding-venues",
    title: "Best Wedding Venues in Niagara Falls, Ontario (2026)",
    excerpt:
      "Falls-view ballrooms, riverside resorts, and convention-scale receptions — what to expect when you book a wedding in Niagara Falls itself.",
    category: "Niagara guide",
    publishedAt: "2026-05-19",
    readMinutes: 7,
    heroImage: "/images/venue-hotel.png",
    metaDescription:
      "Wedding venues in Niagara Falls, Ontario for 2026 — Fallsview hotels, convention centres, riverside resorts. Capacity, pricing, and what to ask each venue.",
    body: (
      <>
        <p>
          Niagara Falls is the right pick for two kinds of couples:
          destination weddings where the Falls itself is the centrepiece,
          and large weddings (200+ guests) that need full ballroom + hotel
          block scale. Here&rsquo;s the working short-list with pricing
          benchmarks for a 2026 Saturday in summer.
        </p>

        <h2>Fallsview hotels and ballrooms</h2>
        <p>
          The Marriott Fallsview, Sheraton on the Falls, and Hilton Fallsview
          all run formal weddings programs with floor-to-ceiling views of the
          Horseshoe Falls. Expect <strong>$140–$220 per guest</strong> all-in
          for plated dinners. Hotel block rooms for the wedding party are
          included on most packages; guest rooms typically negotiate a
          $20–$30 discount off the rack rate when you book the venue.
        </p>
        <p>
          The Falls-view room itself is a premium — same hotel, ballroom
          without the view, takes 15–25% off the per-guest rate. Worth asking
          about because most receptions don&rsquo;t use the view after dark
          anyway.
        </p>

        <h2>Convention-scale venues</h2>
        <p>
          For 250+ guests, the Niagara Falls Convention Centre and the
          Scotiabank Convention Centre handle weddings as part of their
          regular bookings. Pricing is <strong>$8,000–$18,000</strong> for
          venue rental alone, then catering through their preferred-vendor
          list (mandatory at both). Best fit when you need a single space
          for ceremony + cocktail + reception without room flips.
        </p>

        <h2>Riverside &amp; boutique alternatives</h2>
        <p>
          Just north of the tourist core, properties like the Old Stone Inn
          and the Doubletree Fallsview run smaller weddings (50–120 guests)
          with a quieter atmosphere — closer to NOTL pricing
          (<strong>$8,000–$15,000</strong> all-in for 100 guests). The
          Riverwalk along the lower river has several restaurant venues with
          patio ceremonies during summer.
        </p>

        <h2>Outdoor ceremony spots</h2>
        <p>
          Queen Victoria Park (along the Niagara Parkway opposite the Horseshoe
          Falls) is the iconic Falls-backdrop ceremony location. The Niagara
          Parks Commission issues commercial ceremony permits at <strong>$300–$500</strong>,
          with the photographer permit billed separately. Dufferin Islands and
          Oakes Garden Theatre are quieter alternatives in the same park
          system. A Maid of the Mist boarding photo at the foot of the Falls
          is a popular post-ceremony stop — boats run mid-May through October
          and accommodate full bridal parties without a charter fee.
        </p>

        <h2>What to ask in Niagara Falls specifically</h2>
        <ol>
          <li>
            Tourist-season surcharge? May through October peaks; some
            venues add 10–15% to the package on summer Saturdays.
          </li>
          <li>
            Falls-view guarantee in the contract — not all rooms in the
            same hotel face the Falls.
          </li>
          <li>
            Shuttle for guests staying off-site? Parking near the Falls
            is $20–$40/day; a coordinated shuttle is cheaper.
          </li>
          <li>
            Music end-time. Tourist-zone bylaws stop amplified outdoor
            music at 10pm in most of Niagara Falls.
          </li>
        </ol>

        <p>
          Browse the full Niagara Falls list, filtered to wedding-ready
          venues only, on{" "}
          <a href="/cities/niagara-falls">our Niagara Falls page</a>, or
          compare against quieter Niagara-on-the-Lake on{" "}
          <a href="/cities/niagara-on-the-lake">the NOTL page</a>.
        </p>
      </>
    ),
  },

  /* ─── 5. Muskoka wedding venues ───────────────────────────────────── */
  {
    slug: "muskoka-wedding-venues",
    title: "Best Muskoka Wedding Venues (2026 Guide)",
    excerpt:
      "Lakefront resorts, restored boathouses, and forest clearings — Muskoka weddings cost more than Niagara and book 18 months out. Here's why couples still pick it.",
    category: "Cottage country",
    publishedAt: "2026-05-17",
    readMinutes: 8,
    heroImage: "/images/venue-outdoor.png",
    metaDescription:
      "Muskoka and cottage-country wedding venues for 2026. Lakefront resorts, restored boathouses, forest clearings — pricing, accommodation, and what to ask each venue.",
    body: (
      <>
        <p>
          Muskoka venues run <strong>30–60% more</strong> than comparable
          Niagara properties, book 18 months ahead for peak July–August
          Saturdays, and require most couples to put guests up overnight
          because the drive home isn&rsquo;t practical. Here&rsquo;s how to
          pick the right Muskoka venue for your group size and budget.
        </p>

        <h2>Full-resort weddings</h2>
        <p>
          Windermere House on Lake Rosseau (the &ldquo;Grand Old Lady&rdquo;),
          Sherwood Inn on Lake Joseph, Deerhurst Resort, JW Marriott The
          Rosseau, and Taboo Muskoka all do destination-style weddings on
          a full-resort footprint — your guests stay, eat, swim, and party
          on the same property. Pricing runs <strong>$220–$340 per guest</strong>{" "}
          all-in for plated dinners plus a room block at $250–$450/night for
          the wedding party and family. For a 100-guest wedding plus two-night
          stays, budget <strong>$45,000–$70,000</strong>.
        </p>
        <p>
          Windermere and Sherwood Inn are both heritage properties with full
          dock access — couples typically do the ceremony at the lakefront,
          cocktails on the verandah, and reception inside the historic main
          dining room. Book 18–22 months out for any July–August Saturday.
        </p>

        <h2>Lakefront private estates</h2>
        <p>
          Several private estates rent for wedding weekends — South Shore
          Wedding Estate, Camp Hawk, and Bonnie Castle among the bigger
          names. Pricing is <strong>$15,000–$30,000</strong> for the venue
          rental over the weekend (no catering or staff), then build the
          rest from scratch. Best for couples who want full creative
          control and a dedicated wedding planner running logistics.
        </p>

        <h2>Boathouse + restored cottage venues</h2>
        <p>
          For 40–80 guests, the restored boathouses around Lake Joseph,
          Lake Rosseau, and Lake Muskoka are increasingly popular. Expect
          <strong>$8,000–$14,000</strong> for venue rental, with external
          catering. Guests typically stay at the nearby resorts — book
          their room blocks at the same time you confirm the boathouse.
        </p>

        <h2>What Muskoka adds (and costs extra)</h2>
        <ul>
          <li>
            <strong>Transportation</strong> — most Muskoka venues need a
            shuttle from the nearest town. Budget $1,200–$2,400 for two
            full-size buses on the wedding day.
          </li>
          <li>
            <strong>Weather contingency</strong> — June and September
            evenings are cool on the water. Heaters + sidewalls for tented
            receptions run $1,500–$3,000 extra.
          </li>
          <li>
            <strong>Vendor travel</strong> — Toronto-based photographers,
            florists, and DJs charge a travel premium north of Bracebridge.
            Plan +15–25% on each vendor line vs. Niagara pricing.
          </li>
        </ul>

        <p>
          The full Muskoka list with capacity, lakefront frontage, and
          on-site accommodation is on{" "}
          <a href="/regions/cottage-country">our Cottage Country page</a>.
        </p>
      </>
    ),
  },

  /* ─── 6. Hamilton & Burlington wedding venues ─────────────────────── */
  {
    slug: "hamilton-burlington-wedding-venues",
    title: "Wedding Venues in Hamilton &amp; Burlington, Ontario",
    excerpt:
      "Escarpment estates, conservation-area ceremony sites, and downtown Hamilton industrial loft spaces — Golden Horseshoe weddings cost 25–35% less than Toronto for comparable scale.",
    category: "Golden Horseshoe",
    publishedAt: "2026-05-16",
    readMinutes: 7,
    heroImage: "/images/venue-estate.png",
    metaDescription:
      "Wedding venues in Hamilton and Burlington for 2026 — escarpment estates, conservation areas, industrial lofts. Pricing 25–35% below comparable Toronto venues.",
    body: (
      <>
        <p>
          Hamilton + Burlington venues hit a price point most couples
          underestimate: <strong>25–35% below</strong> comparable Toronto
          venues for the same guest count and meal style. The region has
          three distinct venue clusters — escarpment, downtown core, and
          conservation areas — each with its own pricing dynamic.
        </p>

        <h2>Escarpment estates &amp; Pearle Hospitality venues</h2>
        <p>
          The Niagara Escarpment runs the length of upper Hamilton and into
          west Burlington. Pearle Hospitality alone operates four wedding
          properties in the region: <strong>Ancaster Mill</strong> (a
          restored 1792 grist mill on a waterfall site — the most-Instagrammed
          venue in southern Ontario), Cambridge Mill, Whistle Bear Golf Club,
          and Spencer&rsquo;s at the Waterfront in Burlington. Add Liuna
          Station and the Royal Botanical Gardens to that list and you have
          most of the premium tier at <strong>$140–$190 per guest</strong>{" "}
          all-in, in-house catering, reputations that hold up across 200+
          guests.
        </p>

        <h2>Waterfall ceremony sites</h2>
        <p>
          Hamilton is the &ldquo;waterfall capital of the world&rdquo; — over
          100 named waterfalls on the escarpment within city limits. Three
          are wedding-permit-friendly: Webster&rsquo;s Falls (in the Spencer
          Gorge Conservation Area, $500 ceremony permit, advance booking
          mandatory in summer), Tiffany Falls (Hamilton Conservation Authority,
          smaller groups only), and the cascade at Ancaster Mill itself
          (only available to couples booking the venue). All three look
          spectacular in photos and add minimal cost when paired with a
          reception venue 10–20 minutes away.
        </p>

        <h2>Downtown Hamilton industrial spaces</h2>
        <p>
          Hamilton&rsquo;s revitalised core has converted warehouses,
          breweries, and a couple of old church spaces hosting weddings in
          the 80–180 guest range. Pricing runs <strong>$5,000–$10,000</strong>{" "}
          for venue rental, external catering. The aesthetic — exposed brick,
          industrial windows, mixed seating — reads as &ldquo;Toronto without
          the Toronto price&rdquo; on Instagram.
        </p>

        <h2>Conservation area ceremonies</h2>
        <p>
          For couples doing a separate ceremony venue + reception, Hamilton
          Conservation Authority and Conservation Halton both rent ceremony
          sites at Dundas Valley, Christie Lake, and Webster&rsquo;s Falls.
          Pricing is <strong>$500–$1,500</strong> for the ceremony permit
          alone — cheapest formal-photo ceremony locations in Ontario. The
          reception happens at one of the above venues a 15-minute drive
          later.
        </p>

        <h2>Why Hamilton/Burlington pricing is lower</h2>
        <p>
          Three structural reasons. First, lower commercial rent — catering
          kitchens and ballroom overhead cost the venues less than equivalent
          Toronto operations. Second, fewer dedicated-wedding-only venues —
          most operate as restaurants, conference centres, or golf clubs the
          rest of the year, so weddings are incremental revenue rather than
          core. Third, less destination demand — most couples here are
          local, and locals are price-sensitive.
        </p>

        <p>
          Browse the full Hamilton-Burlington list with capacity, escarpment
          views, and conservation-area filters on{" "}
          <a href="/regions/golden-horseshoe">our Golden Horseshoe page</a>.
        </p>
      </>
    ),
  },

  /* ─── 7. Wedding DJ cost in Ontario ───────────────────────────────── */
  {
    slug: "wedding-dj-cost-ontario",
    title: "How Much Does a Wedding DJ Cost in Ontario? (2026)",
    excerpt:
      "A wedding DJ in Ontario runs $1,200–$3,000 in 2026 for the standard 6-hour reception. Here's what each tier actually delivers and where the money goes.",
    category: "Vendor pricing",
    publishedAt: "2026-05-14",
    readMinutes: 5,
    heroImage: "/images/vendor-dj.png",
    metaDescription:
      "Ontario wedding DJ pricing for 2026 — typical $1,200–$3,000 range for 6 hours, what each tier includes, lighting/MC/photo-booth add-ons that swing the total.",
    body: (
      <>
        <p>
          Across the 280+ DJs in our directory, the working range for an
          Ontario wedding DJ in 2026 is <strong>$1,200 at the budget end
          up to $3,000 at the premium end</strong> for a standard 6-hour
          reception (ceremony + cocktail + dinner + dancing). Here&rsquo;s
          what each tier gets you.
        </p>

        <h2>Budget tier — $1,200–$1,500</h2>
        <p>
          Single DJ, basic two-speaker setup, wired microphone for speeches,
          standard playlist consultation. Often newer DJs or established
          ones offering a no-frills package for off-peak (Sunday, Friday,
          weekday) weddings.
        </p>

        <h2>Mid tier — $1,600–$2,200</h2>
        <p>
          Most Ontario couples land here. Includes ceremony PA setup
          (separate from reception), four-speaker reception system,
          wireless mic for officiant + speeches, music consultation, and a
          do-not-play list. Many DJs at this tier also handle MC duties at
          no extra cost.
        </p>

        <h2>Premium tier — $2,400–$3,000+</h2>
        <p>
          Full-event coverage with dedicated MC, premium sound system,
          uplighting (8–12 fixtures), dance-floor effects (haze + moving
          heads), wireless mic kit for speeches, and post-wedding playlist
          delivery. Premium DJs in Niagara/GTA book 12–18 months out for
          summer Saturdays.
        </p>

        <h2>Add-ons that swing the price</h2>
        <ul>
          <li>
            <strong>Uplighting</strong> — $400–$800 for 8–12 fixtures
            around the room. Biggest visual upgrade for the dollar.
          </li>
          <li>
            <strong>Photo booth add-on</strong> — some DJs offer a basic
            booth for +$400–$700. Standalone booths run $800–$1,500.
          </li>
          <li>
            <strong>Ceremony coverage</strong> — separate PA system at the
            ceremony site, $150–$300 add-on.
          </li>
          <li>
            <strong>Live musician hybrid</strong> — DJ + saxophone or
            violin for cocktail hour, $400–$900 for the musician on top.
          </li>
        </ul>

        <h2>Pic Booth — Niagara &amp; GTA</h2>
        <p>
          Worth noting: if you&rsquo;re booking a photo booth alongside your
          DJ in Niagara or the GTA, our site partner <em>Pic Booth</em> runs
          standalone (open-air sailcloth + enclosed luxury cabinets) at
          $800–$1,800. They&rsquo;re a JUNO Awards photo booth provider —
          appears at the top of{" "}
          <a href="/vendors/photo-booth">the photo booth directory</a> with
          full disclosure.
        </p>

        <p>
          Browse DJs by region with reviews + price tiers on{" "}
          <a href="/vendors/dj">the DJ directory</a>.
        </p>
      </>
    ),
  },

  /* ─── 8. Wedding florist cost in Ontario ──────────────────────────── */
  {
    slug: "wedding-florist-cost-ontario",
    title: "Wedding Florist Costs in Ontario: What to Budget (2026)",
    excerpt:
      "Wedding florals run $1,500–$6,000 in Ontario for 2026. The three categories that drive 80% of the cost — and where to save without losing the look.",
    category: "Vendor pricing",
    publishedAt: "2026-05-13",
    readMinutes: 6,
    heroImage: "/images/vendor-florist.png",
    metaDescription:
      "Wedding florist pricing in Ontario for 2026 — typical $1,500–$6,000 range, where the budget actually goes, and three categories where you can save without losing the look.",
    body: (
      <>
        <p>
          Florals are one of the few wedding categories where you can spend
          almost any amount you want — couples in our planner data tend to
          land between <strong>$1,500 at the simple end and $6,000+ for
          full-floral receptions</strong>. Here&rsquo;s where the money goes
          and the three categories that drive 80% of the cost.
        </p>

        <h2>What you&rsquo;re actually buying</h2>
        <p>
          A florist invoice typically has four line items:
        </p>
        <ol>
          <li>
            <strong>Personal florals</strong> — bridal bouquet{" "}
            <strong>$150–$400</strong>, attendant bouquets $80–$160 each,
            boutonnières $25–$45, corsages $30–$55. A 5-person bridal
            party plus parents runs <strong>$700–$1,400</strong> total.
          </li>
          <li>
            <strong>Ceremony</strong> — arch and altar florals{" "}
            <strong>$500–$2,000</strong>. Corner-asymmetric is the cheap
            end; full-coverage arch + aisle markers is the top end.
          </li>
          <li>
            <strong>Reception centrepieces</strong> — typically{" "}
            <strong>$75–$300 per table</strong>, so 10 tables runs
            $750–$3,000. Low-and-lush is the cheap end; tall raised
            arrangements with hanging florals run 2–3× the price.
          </li>
          <li>
            <strong>Installation + breakdown</strong> — $400–$900 labour
            on top of the florals themselves. Most couples don&rsquo;t
            anticipate this line.
          </li>
        </ol>

        <h2>Three categories that swing the total</h2>
        <p>
          1. <strong>Centrepieces — choice of bloom</strong>. Garden roses,
          peonies, and lily-of-the-valley are 3–5× the price of mums,
          dahlias, and seasonal grocery-store equivalents. Asking your
          florist for &ldquo;seasonal&rdquo; instead of specific blooms
          typically saves 30–40%.
        </p>
        <p>
          2. <strong>Ceremony arch</strong>. A full-coverage arch is 2× the
          cost of a corner-asymmetric. Most couples don&rsquo;t shoot the
          full arch — photos focus on the corner — so the spend is
          underused.
        </p>
        <p>
          3. <strong>Number of attendants</strong>. Each attendant bouquet
          is $80–$160 and each boutonnière $25–$45. Four attendants instead
          of six saves $250–$400 with no aesthetic loss.
        </p>

        <h2>Local-grown vs. imported</h2>
        <p>
          Several Ontario florists work with Niagara growers (peonies +
          ranunculus in May–June, garden roses in August). Local-grown is
          typically <strong>20–30% cheaper</strong> than the equivalent
          imported variety AND has noticeably better stem quality. Worth
          asking on the consultation.
        </p>

        <p>
          Browse florists by region with reviews + portfolio links on{" "}
          <a href="/vendors/florist">the florist directory</a>.
        </p>
      </>
    ),
  },
];

export function getBlogPost(slug: string): BlogPost | null {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

export function listBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  );
}
