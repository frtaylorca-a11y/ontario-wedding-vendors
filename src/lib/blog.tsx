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
    publishedAt: "2026-05-12",
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

        <h2>What 100 guests actually costs in Niagara (2026)</h2>
        <p>
          The headline venue rate is rarely the bill that lands on your
          credit card. Here&rsquo;s the realistic all-in (venue + plated
          dinner + bar + gratuity + HST) for a 100-guest Saturday in peak
          season across the three Niagara venue categories:
        </p>
        <ul>
          <li>
            <strong>Vineyard estate (NOTL):</strong> $32,000–$48,000.
            Bundled catering, in-house wines, single coordinator.
          </li>
          <li>
            <strong>Barn / rural venue (West Niagara):</strong>{" "}
            $28,000–$42,000. Venue cheaper, but rentals + external
            caterer + tent backup eat the savings.
          </li>
          <li>
            <strong>Fallsview hotel:</strong> $30,000–$50,000. Premium
            for the view; hotel block included.
          </li>
        </ul>
        <p>
          Couples consistently underestimate the rentals line at barn
          venues (linens, glassware, chairs, dance floor, generator
          access — $4,000–$8,000 for 100 guests) and overestimate the
          savings of a dry-hall booking.
        </p>

        <h2>Booking timeline + deposits</h2>
        <p>
          Premier NOTL wineries (Ravine, Two Sisters, Peller) book{" "}
          <strong>14–18 months ahead</strong> for peak-season Saturdays —
          if you&rsquo;re booking for September 2027, the calls should
          happen by April 2026. Most Niagara venues take a 25–30%
          non-refundable deposit at contract, a second 25% at the 6-month
          mark, and the balance two weeks before the wedding. The
          contract is where the surprises happen — read the corkage
          policy, vendor-restriction list, and ceremony rain-call
          deadline before paying anything.
        </p>

        <h2>Seasonal pricing — where you actually save</h2>
        <p>
          Peak season is mid-June through mid-October Saturdays. Outside
          that window the same venues drop pricing 25–40%. Friday weddings
          in shoulder months (May, early June, late October) are the
          single biggest value play in Niagara — same room, same staff,
          15–25% lower per-guest rate, and your vendor team is more
          available and often happier to work with you on extras.
          January through March winter weddings drop another tier:
          intimate ceremony in a heated barn or hotel ballroom, dramatic
          photos with snow and frozen vineyards, and venue rates 35–50%
          below the same room in July. The catch is photography light —
          winter sunset is at 5 PM in Niagara, so the ceremony either
          happens earlier than couples expect or finishes after dark. The small handful of Niagara
          venues that run year-round (Pillar &amp; Post, Sheraton on the
          Falls, Honsberger&rsquo;s heated barn) consistently book January
          and February weddings six months out instead of eighteen.
        </p>

        <p>
          Browse the full list with capacity, rating, and Google review
          counts on our <a href="/regions/niagara">Niagara venues page</a>,
          or filter to Niagara-on-the-Lake specifically on{" "}
          <a href="/cities/niagara-on-the-lake">our NOTL guide</a>. For
          the deeper dive on winery-specific options across NOTL, see the{" "}
          <a href="/blog/niagara-on-the-lake-wineries-weddings">NOTL
          winery wedding guide</a>, and{" "}
          <a href="/venues?type=winery">all winery venues across Ontario</a>{" "}
          for couples open to driving slightly further.
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
    publishedAt: "2026-01-27",
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

        <h2>What to ask before paying the deposit</h2>
        <p>
          Five questions surface most of the real differences between
          quotes that look identical on paper:
        </p>
        <ol>
          <li>
            <strong>Who is actually shooting the wedding?</strong> Some
            larger studios (Ikonica, AGI Studio in the GTA) operate as a
            collective — the photographer in the portfolio may not be the
            one assigned to your day. Get the name in writing.
          </li>
          <li>
            <strong>What&rsquo;s the turnaround on photo delivery?</strong>{" "}
            Industry standard in Ontario is 6–10 weeks for the full
            gallery, with a sneak-peek set within 7 days. Anything past
            14 weeks should come with a contract penalty.
          </li>
          <li>
            <strong>How many weddings do you shoot in a season?</strong>{" "}
            High-volume studios (30+ weddings/year) deliver consistent
            quality but each wedding gets less attention; boutique
            photographers (12–18 weddings/year) tend to produce more
            personal galleries.
          </li>
          <li>
            <strong>What&rsquo;s your bad-weather plan?</strong> Ontario
            outdoor ceremonies get rained on regularly. Your photographer
            needs a Plan B for couple portraits — a covered patio, indoor
            window light, or a nearby gallery space.
          </li>
          <li>
            <strong>Backup gear + insurance?</strong> Every professional
            should have two camera bodies on hand and $2M liability
            coverage. Most venues require proof of insurance at load-in.
          </li>
        </ol>

        <h2>Engagement sessions + add-on shoots</h2>
        <p>
          Most mid-tier packages include a 60–90 minute engagement
          session, but the deliverable counts vary widely — typically
          25–60 edited images. Engagement sessions are also the easiest
          time to test how the photographer directs you, which matters
          more on the wedding day than any portfolio piece. If your
          package doesn&rsquo;t include one, expect <strong>$400–$900</strong>{" "}
          to add it. Rehearsal dinner coverage runs another $500–$1,200;
          most couples decide it&rsquo;s the first cut when the budget
          tightens.
        </p>

        <h2>When to book in Ontario</h2>
        <p>
          Peak-season photographers (June, September, October Saturdays
          in Niagara or the GTA) book{" "}
          <strong>12–18 months ahead</strong>. The top tier of Ontario
          wedding photographers — Tara McMullen, Mango Studios, Daring
          Wanderer, Carey Nash — typically close their Saturday bookings
          12+ months out. If your dream photographer has a 6-month
          availability gap on their calendar, you&rsquo;re looking at a
          recent cancellation or an off-season date. Mid-tier photographers
          are usually bookable 6–10 months out for summer Saturdays, and
          you can find genuinely talented newer photographers (under
          three seasons in business) at 3–5 months for any date — the
          portfolios are smaller but the work is often more thoughtful
          than the established names.
        </p>

        <p>
          Browse photographers in your region with distance and reviews on{" "}
          <a href="/vendors/photographer">the photographers directory</a>.
          Many couples pair a photographer with a videographer at the same
          studio for consistency — see the{" "}
          <a href="/blog/wedding-videographer-cost-ontario">videographer
          pricing guide</a> and{" "}
          <a href="/vendors/videographer">videographer directory</a> for
          the companion options.
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
    publishedAt: "2025-12-09",
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

        <h2>Boutique alternatives — 60-guest weddings</h2>
        <p>
          For weddings under 80 guests, NOTL has a tier most couples
          never tour. The Drawing Room at Riverbend Inn, the private
          dining room at Treadwell, and the carriage house at the
          Olde Angel Inn all run small-wedding programs at{" "}
          <strong>$8,000–$13,000</strong> all-in for 60 guests including
          plated dinner. These are easier to book on short notice
          (3–6 months out) and produce more intimate photography than
          the larger estates. The trade-off is no on-site
          accommodation block — guests stay across town and walk back to
          their hotel. For couples considering an elopement-style NOTL
          wedding (20–40 guests, ceremony plus a long dinner), Treadwell
          and Backhouse both run private buyout dinners under $6,000
          including a custom tasting menu — a fraction of the typical
          NOTL wedding bill, with photography just as compelling. The
          Niagara Parks Commission runs a small ceremony program at
          Riverside Park ($450 permit, 90-minute window) that pairs
          naturally with a restaurant dinner reception twenty minutes
          away — a flexible alternative for couples who don&rsquo;t want
          to commit to a single full-day venue.
        </p>

        <h2>Restaurant private-dining options</h2>
        <p>
          NOTL&rsquo;s restaurant scene (Treadwell, Tiara, Hob Nob, the
          Stagecoach for breakfast brunches) handles weddings as private
          buyouts. Restaurant weddings typically run 25–40% below the
          equivalent winery wedding for the same guest count, with
          chef-led tasting menus and zero room-flip logistics. Worth
          considering for couples whose priority is the food, not the
          backdrop. Sunday brunch buyouts after a Saturday ceremony are
          increasingly popular — half the cost of the wedding-day dinner
          and gives extended family one more meal together.
        </p>

        <h2>Booking window + deposits</h2>
        <p>
          NOTL wineries take a 25–30% non-refundable deposit at contract
          and book peak-season Saturdays 14–18 months ahead. The wedding
          coordinator at most NOTL venues runs 60–80 weddings a year,
          so meeting them in person matters — your coordinator is your
          single point of contact for vendor load-in, rain calls, and
          timeline adjustments. The hotels (Pillar &amp; Post,
          Queen&rsquo;s Landing) book closer to 18–24 months out because
          they need to hold both the venue and the room block on the
          same dates.
        </p>

        <p>
          Browse the full Niagara-on-the-Lake list with capacity, rating,
          coordinator details on{" "}
          <a href="/cities/niagara-on-the-lake">our NOTL venues page</a>.
          For the broader Niagara region — including barn venues and
          Fallsview options — see the{" "}
          <a href="/blog/best-wedding-venues-niagara-2026">2026 Niagara
          guide</a>. Couples specifically focused on winery weddings
          should also browse{" "}
          <a href="/venues?type=winery">winery venues across Ontario</a>{" "}
          and read the deeper{" "}
          <a href="/blog/niagara-on-the-lake-wineries-weddings">NOTL
          winery wedding guide</a>.
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
    publishedAt: "2026-04-21",
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

        <h2>Distance from Toronto + guest travel</h2>
        <p>
          Niagara Falls is 90 minutes from downtown Toronto on a clear
          afternoon, two-plus hours on a summer Saturday with QEW
          traffic backed up at Burlington. Most couples either run a
          coach shuttle for guests (Coach Canada quotes $1,800–$2,800
          for a 50-passenger return trip including evening pickup) or
          block hotel rooms at the wedding venue itself. The major
          Fallsview hotels comp 1–2 rooms for the wedding party on most
          full-evening packages — confirm in writing before paying the
          deposit.
        </p>

        <h2>Best months for a Falls wedding</h2>
        <p>
          June through early October is peak — the Falls runs at full
          flow, the gardens at Queen Victoria Park are in bloom, and
          outdoor photos work without weather backup. December is the
          surprising second peak: the Festival of Lights illuminates the
          Falls and the Niagara Parkway from mid-November through early
          February. Couples doing winter Fallsview weddings get a
          dramatically different photo set than the summer crowd, often
          at 25–35% lower venue rates. April and November are the
          shoulder months to avoid — the Falls is at its highest volume
          (snow melt + autumn rain) but the weather is unreliable for
          outdoor photos.
        </p>

        <h2>Photography permits + logistics</h2>
        <p>
          The Niagara Parks Commission requires a commercial photography
          permit ($150–$300) for any pro shoot inside the park system,
          including Queen Victoria Park, the Floral Showhouse, Table
          Rock, and Dufferin Islands. Your photographer should pull this
          permit themselves; couples don&rsquo;t typically interact with
          the application. Wedding-party photo stops typically take 60–90
          minutes — build that into the timeline between ceremony and
          reception. The Maid of the Mist (mid-May to October) and
          Hornblower boats offer wedding-party photo cruises by special
          arrangement; book through the boat operator directly, not
          through your venue.
        </p>

        <p>
          Browse the full Niagara Falls list, filtered to wedding-ready
          venues only, on{" "}
          <a href="/cities/niagara-falls">our Niagara Falls page</a>, or
          compare against quieter Niagara-on-the-Lake on{" "}
          <a href="/cities/niagara-on-the-lake">the NOTL page</a>. For
          the broader region overview see the{" "}
          <a href="/regions/niagara">Niagara region guide</a>.
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
    publishedAt: "2026-02-10",
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

        <h2>Booking window — earlier than anywhere else in Ontario</h2>
        <p>
          Muskoka books further ahead than any other Ontario region. The
          big four resorts (Windermere House, Sherwood Inn, Deerhurst,
          JW Marriott The Rosseau) typically close peak-season Saturdays{" "}
          <strong>18–22 months ahead</strong>. If you&rsquo;re booking
          July or August 2027, the calls should happen by April 2026 at
          the latest. The wedding-coordinator team at each resort runs
          tours through fall + winter for the following two summers
          simultaneously, and Saturdays in mid-July through mid-August
          are gone first.
        </p>

        <h2>The accommodation puzzle</h2>
        <p>
          The single biggest Muskoka planning decision is how guests
          stay over. Three patterns work in the region:
        </p>
        <ol>
          <li>
            <strong>Full resort buyout.</strong> Block 40–80 rooms at
            the venue itself for the wedding-party-plus-guests core.
            Friday welcome dinner + Saturday wedding + Sunday brunch
            included. Most expensive option — adds $15,000–$30,000 to
            the all-in.
          </li>
          <li>
            <strong>Venue + town hotel block.</strong> Wedding party at
            the venue, broader guest list at hotels in Bracebridge,
            Huntsville, or Port Carling. Shuttle bridges the gap.
            Cheapest option — saves $8,000–$15,000 vs. full buyout.
          </li>
          <li>
            <strong>Cottage rentals + Airbnb.</strong> Couples increasingly
            book a dozen cottages for their wedding party and family for a
            full week, with the wedding day in the middle. Works when
            most of the guest list is local or already cottagers.
          </li>
        </ol>

        <h2>Catering style at Muskoka resorts</h2>
        <p>
          The historic resorts run their own kitchens — Windermere, Sherwood
          Inn, Deerhurst all serve plated dinners through their permanent
          culinary teams. JW Marriott Rosseau partners with Pursuit
          Hospitality for full event production. None of the major Muskoka
          resorts allow outside caterers. If you&rsquo;ve already booked a
          GTA catering team you love, Muskoka private estates are your only
          option — see the dedicated{" "}
          <a href="/blog/muskoka-cottage-wedding-venues">Muskoka cottage
          wedding guide</a> for the private-rental options that let you
          bring your own team. The resort catering teams cap menu
          customisation at swapping protein options within the existing
          template; couples wanting a fully bespoke menu (Asian, Italian
          family-style, Indian wedding multi-course) either book a private
          estate or look at the resort&rsquo;s second-tier wedding package
          where the kitchen is more flexible on a smaller guest count.
          The Friday welcome dinner is worth using strategically — most
          resorts allow a more relaxed menu there (BBQ, food stations,
          wood-fired pizza on the deck), giving the broader weekend a
          different culinary arc than the formal Saturday plated dinner.
        </p>

        <p>
          The full Muskoka list with capacity, lakefront frontage, and
          on-site accommodation is on{" "}
          <a href="/regions/cottage-country">our Cottage Country page</a>{" "}
          or filter to{" "}
          <a href="/venues?region=muskoka">Muskoka venues only</a>.
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
    publishedAt: "2026-01-13",
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

        <h2>Hotel block options</h2>
        <p>
          Hamilton and Burlington have a thinner downtown hotel scene than
          Toronto, which catches couples off guard when guest lists run
          50+ out-of-town attendees. The reliable blocks: Sheraton Hamilton
          (downtown core, blocks of 30–50 rooms at $185–$245/night
          contracted rate); Homewood Suites Burlington (suite-style for
          family groups); Pearle Hotel &amp; Spa (Burlington waterfront,
          higher-end). For escarpment-area venues, the Best Western Plus
          Stoney Creek and the Holiday Inn Burlington-Hotel &amp;
          Conference Centre handle most overflow. Book the block at
          contract — most venues don&rsquo;t coordinate this for you, and
          summer Saturdays sell out across the region.
        </p>

        <h2>Booking timeline + comparing estates</h2>
        <p>
          Pearle Hospitality venues (Ancaster Mill, Cambridge Mill,
          Whistle Bear, Spencer&rsquo;s) close peak-season Saturdays{" "}
          <strong>12–16 months ahead</strong>. Ancaster Mill is the most
          competitive booking in the region — couples regularly tour, fall
          in love, and discover their target year is already locked. If
          Ancaster Mill is full, Cambridge Mill (sister property, similar
          aesthetic, slightly cheaper) is the closest substitute, then
          Liuna Station (downtown Hamilton beaux-arts train station,
          200-guest capacity) for couples wanting a different but equally
          dramatic backdrop. The Royal Botanical Gardens (Burlington) runs
          a dedicated weddings program out of the RBG Centre with three
          ceremony locations — a quieter option that books closer to
          6–10 months out.
        </p>

        <h2>Catering quality — the underrated strength</h2>
        <p>
          The Pearle Hospitality kitchens (running Spencer&rsquo;s, Anker,
          Cambridge Mill, Ancaster Mill, others) consistently produce the
          best wedding plates in the Golden Horseshoe — chef-driven menus
          with a heavier vegetable focus than the typical hotel ballroom
          template. Liuna Station&rsquo;s in-house team handles 300+ guest
          weddings and runs a more traditional banquet menu. For couples
          choosing a venue largely on the food, see the broader{" "}
          <a href="/blog/wedding-catering-cost-ontario">wedding catering
          pricing guide</a> — Hamilton-Burlington venues are routinely
          $15–$25 per guest below the equivalent Toronto plated dinner for
          comparable quality.
        </p>

        <p>
          Browse the full Hamilton-Burlington list with capacity, escarpment
          views, and conservation-area filters on{" "}
          <a href="/regions/golden-horseshoe">our Golden Horseshoe page</a>{" "}
          or filter to{" "}
          <a href="/venues?region=golden-horseshoe">Golden Horseshoe venues only</a>.
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
    publishedAt: "2025-11-11",
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
          DJ in Niagara or the GTA,{" "}
          <a
            href="https://picbooth.ca/wedding-photo-booth/"
            target="_blank"
            rel="noopener"
          >
            Pic Booth&rsquo;s wedding photo booth packages
          </a>{" "}
          run standalone (open-air sailcloth + enclosed luxury cabinets) at
          $800–$1,800. They&rsquo;re a JUNO Awards photo booth provider —
          also listed in{" "}
          <a href="/vendors/photo-booth">the photo booth directory</a> with
          full disclosure.
        </p>

        <h2>DJ vs MC — what you&rsquo;re actually hiring</h2>
        <p>
          Most Ontario couples assume their DJ also handles MC duties —
          announcing the wedding party entrance, walking through cake
          cutting, telling guests when speeches start. About 70% of the
          DJs in our directory bundle MC at no extra cost, but a meaningful
          minority either charge $300–$600 extra OR don&rsquo;t do it at
          all. The dedicated wedding MCs (separate booking) run $400–$900;
          they&rsquo;re worth it if your wedding has a complex run-of-show
          (cultural ceremonies, multi-language announcements, family
          tributes). Confirm in writing which one is included.
        </p>

        <h2>What to ask before paying the deposit</h2>
        <p>
          Six questions that surface most of the real quality variation:
        </p>
        <ol>
          <li>
            <strong>Will you be the DJ on the day, or someone else from
            your team?</strong> Larger Ontario DJ companies (DJX, Hush
            Hush Entertainment) operate as agencies; the DJ in the demo
            video may not be yours. Get the specific name in writing.
          </li>
          <li>
            <strong>Backup DJ + backup gear policy?</strong> If your DJ
            gets sick, what happens? Any reputable agency has a backup
            list. Solo operators should name a colleague.
          </li>
          <li>
            <strong>Music consultation process?</strong> Industry standard
            is one phone call + a shared playlist tool (Spotify or a
            dedicated portal) where you build the do-play and do-not-play
            lists 30 days before the wedding.
          </li>
          <li>
            <strong>Lighting setup time?</strong> Uplighting and DJ
            equipment need 90–120 minutes to load in. Some venues require
            this to happen during ceremony, others require it earlier in
            the day — coordinate with your venue contact.
          </li>
          <li>
            <strong>Late-night extension policy?</strong> If the party
            runs past the booked end-time, how is the overage billed?
            Typical Ontario rate is $150–$250 per additional hour.
          </li>
          <li>
            <strong>What does the dance-floor sound like at 11 PM?</strong>{" "}
            Ask for a video clip of the last hour from a recent wedding —
            it tells you whether the room actually filled, not just whether
            the playlist was good.
          </li>
        </ol>

        <h2>When to book in Ontario</h2>
        <p>
          Premium DJs (Toronto-based agencies, top-tier Niagara
          specialists like FunkyTown Productions) close peak-season
          Saturdays <strong>10–14 months ahead</strong>. The mid-market
          books closer to 6–9 months out. Off-season Friday and Sunday
          weddings can book at 3–4 months out, often with a 10–15% rate
          discount and more attention from the operator. Booking
          dramatically late — under 60 days from the wedding — usually
          means working with someone newer to the wedding industry. That
          can work for a low-key reception but isn&rsquo;t the place to
          save money if your wedding has a complex run-of-show.
        </p>

        <p>
          Browse DJs by region with reviews + price tiers on{" "}
          <a href="/vendors/dj">the DJ directory</a>. Many couples also
          book a photo booth alongside the DJ — see{" "}
          <a href="/vendors/photo-booth">the photo booth directory</a>{" "}
          for the standalone options, and{" "}
          <a href="/blog/wedding-limo-cost-ontario">wedding transportation
          pricing</a> if you&rsquo;re also coordinating the move between
          ceremony and reception.
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
    publishedAt: "2025-10-13",
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

        <h2>Seasonal availability — what blooms when in Ontario</h2>
        <p>
          The local-grown vs imported choice is partly a seasonal one.
          Ontario&rsquo;s growing season runs roughly May through October,
          and certain blooms are dramatically cheaper in specific months:
        </p>
        <ul>
          <li>
            <strong>Tulips</strong> — March through May (greenhouse) and
            outdoor field in late April/early May.
          </li>
          <li>
            <strong>Peonies</strong> — Niagara field peonies in late May
            through mid-June. The cheapest bloom-to-presence ratio in
            the Ontario calendar.
          </li>
          <li>
            <strong>Ranunculus + anemones</strong> — May through July.
          </li>
          <li>
            <strong>Garden roses</strong> — Niagara field-grown July
            through September; imported the rest of the year (2–3× the
            price).
          </li>
          <li>
            <strong>Dahlias</strong> — August through early October —
            peak Ontario availability and the bloom most florists push
            for fall weddings.
          </li>
          <li>
            <strong>Chrysanthemums + sunflowers</strong> — September
            through November.
          </li>
        </ul>
        <p>
          Off-season (November through April) means imported via Miami or
          Bogotá; expect a 30–50% premium and shorter vase life on the
          arrival day. Couples set on peonies for a November wedding
          should know they&rsquo;ll pay $14–$24 per stem versus $5–$8 in
          June.
        </p>

        <h2>Top-of-mind Ontario florists by region</h2>
        <p>
          Niagara: Lakeshore Flower Studio, Lush Florals, and Sweet
          Woodruff (Toronto-based but heavy in Niagara wedding work).
          Toronto + GTA: Coriander Girl, Periwinkle Flowers, Forget Me
          Not Flowers. Muskoka: Aglow Weddings and Designs by Decoflora
          (Bracebridge). Each books peak-season Saturdays 8–14 months
          out. The boutique florists (boutique = fewer than 30 weddings
          a year) tend to be more flexible on personalised design but
          take longer to quote.
        </p>

        <h2>When to book + payment structure</h2>
        <p>
          Most Ontario florists book Saturdays in peak season{" "}
          <strong>8–12 months ahead</strong>. The premium tier
          (Coriander Girl, Sweet Woodruff) closes 12+ months out.
          Typical payment structure: 25% non-refundable deposit at
          contract; 50% at the 90-day mark; balance two weeks before
          the wedding. Final stem counts lock in 14 days before the
          wedding — most florists will work with you on swaps within
          the same colour family up to that point.
        </p>

        <h2>DIY vs full-service — what couples regret</h2>
        <p>
          The DIY florist temptation (especially via Costco bulk
          orders or Toronto&rsquo;s wholesale flower district) saves
          $1,500–$3,000 on a full-floral wedding — but it consumes
          the entire day before the wedding, requires refrigeration
          space for 200+ stems, and produces results that read as
          DIY in photos. The middle ground that most couples eventually
          land on: hire a florist for personals and ceremony florals
          (the photo set-pieces), DIY the centrepieces with bud vases
          + greenery. Saves $1,000–$2,000 and the labour is
          manageable.
        </p>

        <p>
          Browse florists by region with reviews + portfolio links on{" "}
          <a href="/vendors/florist">the florist directory</a>. If your
          florist isn&rsquo;t handling lighting (and most don&rsquo;t),
          see the{" "}
          <a href="/vendors/lighting_decor">lighting + decor directory</a>{" "}
          — the combination of florals + ambient lighting is what carries
          most reception rooms in Ontario.
        </p>
      </>
    ),
  },

  /* ─── 9. Wedding videographer cost in Ontario ──────────────────── */
  {
    slug: "wedding-videographer-cost-ontario",
    title: "How Much Does a Wedding Videographer Cost in Ontario? (2026 Guide)",
    excerpt:
      "Ontario wedding videography runs $1,500–$9,000 in 2026. Here's what each tier actually delivers — and the three add-ons that quietly double the bill.",
    category: "Vendor pricing",
    publishedAt: "2026-03-31",
    readMinutes: 7,
    heroImage: "/images/vendor-videographer.png",
    metaDescription:
      "Wedding videographer cost in Ontario (2026): real price ranges $1,500–$9,000, what each tier includes, cinematic vs documentary styles, and drone footage costs.",
    body: (
      <>
        <p>
          Wedding video sits in an awkward spot on the Ontario budget. Couples
          who book it almost always say it was the most-rewatched investment of
          the whole wedding; couples who skipped it tend to regret it within
          eighteen months. The price range is wider than any other vendor
          category — we see Ontario quotes anywhere from{" "}
          <strong>$1,500 to $9,000</strong> for a full-day wedding film in 2026,
          and the gap between the floor and the ceiling is real (not just
          branding).
        </p>

        <h2>The four price tiers in Ontario</h2>
        <p>
          <strong>$1,500–$2,500 — Solo budget.</strong> One videographer, one
          camera, ~6 hours of coverage, a 3–5 minute highlight reel delivered
          4–8 weeks after the wedding. Often a side-hustle from a wedding
          photographer who also shoots video. Fine for couples who want a
          memento but aren&rsquo;t fussed about cinematic polish.
        </p>
        <p>
          <strong>$2,500–$4,500 — Mid-market.</strong> The most common Ontario
          booking. Two-person team, 8–10 hours of coverage, both a highlight
          reel (4–8 minutes) and a longer feature film (15–30 minutes) of the
          ceremony + speeches. Studios in this tier in the GTA include Vibrant
          Wedding Films, Sevin Productions, and Frame Forty Films.
        </p>
        <p>
          <strong>$4,500–$7,000 — Premium.</strong> Two operators plus a
          dedicated drone pilot, gimbal-stabilised cinematography, full audio
          rig (lavs on the officiant + groom, board feed from the DJ), and
          sneak-peek edit delivered within 72 hours. You&rsquo;re paying for
          colour-grading consistency, three-camera ceremony coverage, and a
          producer who runs the day independently.
        </p>
        <p>
          <strong>$7,000–$9,000+ — Luxury.</strong> Boutique studios with a
          waitlist — Bird&rsquo;s Eye Cinema, Studio Sixty Photo + Film, and a
          handful of Niagara wine-country specialists. Full-day to next-morning
          coverage, custom music licensing, raw footage delivery, sometimes a
          same-day edit shown at the reception.
        </p>

        <h2>Cinematic vs documentary — which style costs more?</h2>
        <p>
          Style isn&rsquo;t a price multiplier — it&rsquo;s a labour multiplier.
          A <em>cinematic</em> edit means colour grading, music licensing, and
          re-staged shots (the &ldquo;hands moment&rdquo;, the dress hanging in
          the window). A <em>documentary</em> edit captures what actually
          happened — speeches uncut, longer ceremony excerpts, less voiceover.
          Cinematic typically lands $500–$1,500 above documentary at the same
          studio because of the post-production hours, not because the gear is
          different.
        </p>

        <h2>Drone footage — almost always worth it</h2>
        <p>
          Drone coverage runs <strong>$300–$700</strong> as an add-on. Worth
          it for venues with a dramatic exterior — wineries, lakefront resorts,
          historic estates — and skippable for downtown Toronto rooftops where
          the city is the backdrop anyway. Note: Transport Canada requires the
          operator hold a Basic or Advanced RPAS certificate; ask your
          videographer to confirm theirs is current before booking.
        </p>

        <h2>The three add-ons that quietly double the bill</h2>
        <p>
          1. <strong>Raw footage delivery.</strong> Usually $500–$1,000 to
          receive all the unedited clips on a hard drive. Most couples
          don&rsquo;t need it — but if you ever want to re-edit in the future,
          this is the only way to get the source files.
        </p>
        <p>
          2. <strong>Extended coverage</strong> from morning prep through late
          reception. Every additional hour after the contracted block is
          $150–$300. Couples consistently underestimate how long they want the
          team on site.
        </p>
        <p>
          3. <strong>Second feature edit</strong> — a 30–60 minute
          documentary-style cut of the full ceremony and speeches. Adds
          $500–$1,200 and is the cut your parents will actually want.
        </p>

        <h2>When to book</h2>
        <p>
          Peak-season Ontario videographers (June, September, October Saturdays
          in Niagara or the GTA) book 10–14 months ahead. Off-season Friday or
          Sunday dates are routinely available 4–6 months out, sometimes with a
          10–15% discount. Studios in the top tier ($7,000+) typically only
          shoot 12–18 weddings per year and lock in their summer Saturdays
          before the previous year is over — if your heart is set on a
          specific name, reach out as soon as you have a date, even if you
          haven&rsquo;t booked the venue yet.
        </p>

        <h2>What to ask in the consultation</h2>
        <p>
          Four questions surface most of the price + quality variation:
        </p>
        <ul>
          <li>
            <strong>How many weddings did you shoot last year, and how
            many are you shooting this year?</strong> Active studios with
            steady volume produce more consistent work than someone trying
            to keep a side hustle alive between full-time jobs.
          </li>
          <li>
            <strong>What does your music licensing look like?</strong> If
            they&rsquo;re using uncleared tracks, your video can&rsquo;t go
            on YouTube without a takedown. Reputable Ontario studios use
            Musicbed, Soundstripe, or Artlist with a per-track sync license.
          </li>
          <li>
            <strong>Who&rsquo;s the editor?</strong> Some studios shoot
            in-house and outsource editing to Eastern Europe. The shot
            list and the cut are different skills — find out who&rsquo;s
            building the final piece.
          </li>
          <li>
            <strong>What&rsquo;s your delivery timeline?</strong> Industry
            standard is 8–12 weeks. Anything past 16 weeks should come with
            a contractual penalty.
          </li>
        </ul>

        <p>
          Browse Ontario videographers by region, with portfolios, packages,
          and Google review counts on the{" "}
          <a href="/vendors/videographer">videographer directory</a>. Many
          couples also pair their videographer with a photographer in advance —
          see the{" "}
          <a href="/blog/wedding-photographer-cost-ontario">photographer pricing guide</a>{" "}
          for the companion breakdown.
        </p>
      </>
    ),
  },

  /* ─── 10. Niagara-on-the-Lake winery weddings ──────────────────── */
  {
    slug: "niagara-on-the-lake-wineries-weddings",
    title: "Getting Married at a Niagara-on-the-Lake Winery: The Complete Guide (2026)",
    excerpt:
      "Ravine, Two Sisters, Peller, Inniskillin — and the things every couple wishes someone had told them before booking a NOTL winery wedding.",
    category: "Niagara guide",
    publishedAt: "2026-02-24",
    readMinutes: 9,
    heroImage: "/images/venue-winery.png",
    metaDescription:
      "Niagara-on-the-Lake winery wedding guide (2026): Ravine, Two Sisters, Peller, Inniskillin — capacity, what's included, guest count limits, and real pricing.",
    body: (
      <>
        <p>
          Niagara-on-the-Lake is the most-searched wedding destination in
          Ontario outside the GTA — and its wineries take more than half the
          bookings. Within a 15-minute drive of the town centre there are
          roughly thirty estate wineries running formal wedding programs, and
          another dozen that host on a more ad-hoc basis. For a 2026 Saturday
          in peak season (June–September), expect Niagara-on-the-Lake
          (&ldquo;NOTL&rdquo;) wineries to quote{" "}
          <strong>$15,000–$30,000+</strong> for venue + plated dinner for 100
          guests, with the variation coming almost entirely from how many
          inclusions the venue bundles into one rate.
        </p>

        <h2>The four most-booked NOTL wineries</h2>
        <p>
          <strong>Ravine Vineyard Estate Winery.</strong> Coopers&rsquo; Hall
          (capacity 130 seated) plus the Lillian Boe Pavilion for outdoor
          ceremonies. In-house catering through their farm-to-table restaurant
          program. Full Saturday rental + plated dinner runs $18,000–$26,000
          for a hundred guests. Strong choice for couples who want a single
          venue to handle ceremony, cocktail hour, and reception with no
          travel between.
        </p>
        <p>
          <strong>Two Sisters Vineyards.</strong> Kitchen 76 hosts the dinner;
          the Bordeaux-style estate provides the photography backdrop. Cap
          around 140 indoor. Two Sisters is often the priciest of the
          mainstream NOTL wineries — Saturdays in peak season clear $25,000 —
          but the room itself is the most architecturally impressive of any
          NOTL winery, with vaulted ceilings and floor-to-ceiling glass.
        </p>
        <p>
          <strong>Peller Estates.</strong> The Riedel Room (180 seated) is one
          of the largest winery wedding spaces in Niagara. Peller&rsquo;s 10
          Below ice lounge is a unique cocktail-hour option in cooler months.
          Pricing tracks Ravine — $18,000–$28,000 for a full Saturday with
          plated dinner.
        </p>
        <p>
          <strong>Inniskillin Wines.</strong> Smaller capacity (around 90),
          which suits couples planning intimate weddings. The Founders&rsquo;
          Hall has the most rustic feel of the major NOTL wineries — exposed
          beams, smaller scale, and a quieter setting along the Niagara
          Parkway. Lower entry pricing than the others ($14,000–$20,000),
          partly because of the smaller guest count.
        </p>

        <h2>The next tier worth touring</h2>
        <p>
          If the big four are booked out (and they often are 12+ months ahead
          for Saturdays), look at Konzelmann Estate Winery, Trius Winery,
          Jackson-Triggs Estate, Stratus Vineyards, and The Old Stone Inn.
          Konzelmann is the only major lakefront winery in the region.
          Jackson-Triggs has a covered outdoor amphitheatre that fits 200+
          guests and runs a less formal wedding program (couples bring their
          own caterer, with Jackson-Triggs handling wine + ceremony space).
        </p>

        <h2>What&rsquo;s typically included</h2>
        <p>
          Most NOTL wineries include the ceremony space, reception hall,
          plated dinner, wine service throughout the meal, table setup and
          linens, a dedicated wedding coordinator, and parking. Bar packages
          beyond wine are usually <em>additional</em> and run $40–$70 per
          person for full open bar. Some wineries restrict the bar to their
          own labels plus a limited beer + spirits list, which is worth
          confirming in writing — it affects what your guests can order.
        </p>

        <h2>Guest count limits — the unwritten rule</h2>
        <p>
          Indoor capacity caps at most NOTL wineries are 130–180. The
          published capacity is for a seated dinner with a dance floor;
          ceremony-only seating runs higher. If your guest list is creeping
          past 150, ask early about whether the venue requires an outdoor
          tented expansion (an extra $4,000–$8,000 for tent + flooring + heat
          in shoulder months).
        </p>

        <h2>Seasonal considerations</h2>
        <p>
          Peak NOTL wedding season is mid-May through mid-October. The
          vineyard itself is photogenic from late May (bud break) through
          early October (harvest). Late-October weddings risk vineyard
          dormancy by the wedding date but can capture stunning autumn
          colour. Winter weddings (December–March) are run by a smaller
          subset of NOTL wineries with full heating; the rates drop sharply
          (often 30–40% off peak), which couples on a tight budget
          consistently overlook.
        </p>

        <h2>Before you sign</h2>
        <p>
          Read the corkage and outside-vendor policy. Many wineries restrict
          which photographers, DJs, and florists can work on-site (preferred
          vendor lists). If you&rsquo;ve already booked a vendor outside that
          list, get an exception in writing before paying the deposit. Also
          confirm the rain plan — most NOTL wineries have an indoor ceremony
          backup but the move from outdoor to indoor needs to be triggered by
          a specific time (typically 2 hours before ceremony start), and that
          call is the venue coordinator&rsquo;s to make, not yours.
        </p>

        <h2>Getting guests to NOTL</h2>
        <p>
          Niagara-on-the-Lake is 90 minutes from downtown Toronto on a clear
          Saturday afternoon, two-plus hours in summer traffic. Most couples
          either book a hotel block in NOTL itself (Pillar &amp; Post,
          Prince of Wales, Queen&rsquo;s Landing — all walkable to the town
          centre) or run a coach shuttle from a hotel block in Niagara Falls
          for the evening. Either way, build the transportation into the
          budget early — guests trying to drive home from a winery after the
          reception is the most common day-of issue NOTL couples run into.
        </p>

        <p>
          Browse every wedding-ready NOTL winery with capacity, rating, and
          coordinator info on the{" "}
          <a href="/cities/niagara-on-the-lake">Niagara-on-the-Lake venues page</a>{" "}
          or filter the full provincial directory to{" "}
          <a href="/venues?type=winery">winery venues across Ontario</a>. For
          broader region context including pricing benchmarks, see the{" "}
          <a href="/regions/niagara">Niagara region guide</a>.
        </p>
      </>
    ),
  },

  /* ─── 11. Muskoka cottage country wedding venues ───────────────── */
  {
    slug: "muskoka-cottage-wedding-venues",
    title: "Best Muskoka Cottage Country Wedding Venues (2026)",
    excerpt:
      "Lakeside ceremonies, on-water portraits, weekend takeovers — here are the Muskoka resorts and lakefront venues couples are booking for 2026.",
    category: "Muskoka guide",
    publishedAt: "2026-03-10",
    readMinutes: 8,
    heroImage: "/images/region-muskoka.png",
    metaDescription:
      "Best Muskoka wedding venues 2026: Windermere House, Sherwood Inn, Living Water Resort, Bigwin Island, Touchstone — capacity, pricing, and guest travel notes.",
    body: (
      <>
        <p>
          Muskoka is Ontario&rsquo;s cottage country — three hours north of
          Toronto, anchored by the towns of Bracebridge, Gravenhurst, Port
          Carling, and Huntsville, and ringed by lakes that turn cinematic in
          the last hour of summer light. Wedding bookings here cluster in a
          tight 16-week window from late June to mid-October. Inside that
          window, the historic lake resorts are the most-booked venues in the
          region.
        </p>

        <h2>The five most-booked Muskoka venues</h2>
        <p>
          <strong>Windermere House.</strong> A four-storey Victorian
          lakeside hotel on Lake Rosseau, in operation as a resort since
          1864. The grand wraparound veranda is the venue&rsquo;s signature
          photo location. Capacity runs to about 200 for tented receptions on
          the lawn; the indoor ballroom seats 130. Saturday Muskoka rates land
          at <strong>$25,000–$45,000</strong> for venue + plated dinner for
          120 guests in peak season — partly because the resort books most
          weddings as full weekend takeovers, including Friday welcome dinner
          and Sunday brunch.
        </p>
        <p>
          <strong>Sherwood Inn.</strong> On Lake Joseph, smaller and more
          intimate than Windermere. Cap around 130 indoor. Strong choice for
          couples who want a country-inn feel without the scale of the bigger
          resorts. Pricing typically $18,000–$30,000 for a full weekend.
        </p>
        <p>
          <strong>Living Water Resort &amp; Spa.</strong> Collingwood-adjacent
          (technically Georgian Bay, not the Muskoka lakes — but couples
          shopping &ldquo;Muskoka&rdquo; often consider it). Newer build,
          modern aesthetic, and a marina view. Best for couples who want
          cottage country light without the long drive.
        </p>
        <p>
          <strong>Bigwin Island Golf Club.</strong> Boat-access island
          (private launch from Port Cunnington) on Lake of Bays. Capacity to
          180 in the clubhouse. The ferry to the island is part of the
          experience — but it also means guests need either a shuttle plan or
          on-island accommodation, both of which add cost.
        </p>
        <p>
          <strong>Touchstone on Lake Muskoka.</strong> Resort condos with a
          dedicated event lawn and lakefront ceremony site. More flexible
          on guest accommodation (suites + cottages on-site) than the
          historic hotels, which is why couples with 80+ guests travelling in
          tend to book here.
        </p>

        <h2>What to expect from a Muskoka wedding</h2>
        <p>
          Almost every Muskoka venue is run as a <em>weekend</em> event, not a
          single day. Friday welcome dinner + Saturday ceremony and reception
          + Sunday brunch is the default cadence, and the venue typically
          requires you book some minimum number of room-nights at the resort
          on Friday and Saturday. This is the single biggest cost difference
          versus a GTA or Niagara wedding: you&rsquo;re effectively buying out
          a small resort for 48 hours, and the room-night minimums can push
          the all-in cost past $50,000 even for a 100-guest wedding.
        </p>

        <h2>Guest travel — the planning that decides everything</h2>
        <p>
          Most guests will drive 2.5–3.5 hours from the GTA. The further west
          you go (Lake Joseph), the longer the drive and the harder the
          last-leg roads in shoulder season. Build the guest list with this in
          mind: anyone who doesn&rsquo;t want to drive will need a hotel
          room. If your venue has fewer than 60 rooms on-site, secure a
          hotel block in Bracebridge or Huntsville early — there are only a
          handful of full-service hotels in the region, and they sell out
          June–September.
        </p>

        <h2>Seasonal window</h2>
        <p>
          Muskoka weddings run late June (when the water finally warms) to
          mid-October. The shoulder weeks (late September and early October)
          deliver the best colour for photos but introduce real weather risk
          — every wedding plan needs an indoor backup by mid-September. May
          and early June weddings exist but are unusual; the resorts are
          still in shoulder operation and the lake hasn&rsquo;t thawed enough
          for the on-water photography that defines the region.
        </p>

        <h2>Cost reality check</h2>
        <p>
          Plan for <strong>$30,000–$70,000+</strong> all-in for a Muskoka
          weekend wedding for 100 guests, with the spread driven mostly by
          accommodation buyouts. The venue rental + dinner line is rarely the
          biggest part of the bill.
        </p>

        <h2>Bringing vendors up from the city</h2>
        <p>
          Many Toronto-based photographers, videographers, florists, and DJs
          will travel for a Muskoka wedding — but they almost always charge a
          travel premium ($300–$800) plus require accommodation either at the
          venue or in a nearby hotel. A handful of Muskoka-based vendors run
          full books year-round (Karina Vega Photography, Holly McCaig, Aglow
          Weddings); they&rsquo;ll quote lower than equivalent GTA studios but
          they book out 10–14 months ahead. Most couples end up with a hybrid
          team — local florist + DJ, GTA photographer + planner — which works
          well as long as the lead vendor (usually the planner) coordinates
          load-in and load-out timing.
        </p>

        <p>
          See every Muskoka venue we track — capacity, rating, and
          coordinator info — on the{" "}
          <a href="/venues?region=muskoka">Muskoka venues page</a>, or browse
          the broader{" "}
          <a href="/regions/cottage-country">cottage country region guide</a>{" "}
          for surrounding areas (Collingwood, Wasaga Beach, Orillia).
        </p>
      </>
    ),
  },

  /* ─── 12. Outdoor wedding venues Ontario ───────────────────────── */
  {
    slug: "outdoor-wedding-venues-ontario",
    title: "Best Outdoor Wedding Venues in Ontario (2026 Guide)",
    excerpt:
      "Conservation areas, farm properties, vineyards, golf clubs — where to host outside in Ontario, and the weather-contingency mistakes every couple wants to avoid.",
    category: "Venue guide",
    publishedAt: "2025-12-23",
    readMinutes: 8,
    heroImage: "/images/venue-outdoor.png",
    metaDescription:
      "Outdoor wedding venues in Ontario (2026): conservation areas, farms, wineries, golf clubs — what to expect, weather backup planning, and permits.",
    body: (
      <>
        <p>
          Ontario has a real outdoor wedding season — and it&rsquo;s short.
          Mid-May to early October is the realistic window, and within that
          window only late June through mid-September are reliably warm.
          Couples planning an outdoor ceremony should treat the weather plan
          as a load-bearing decision, not a footnote. With that said, the
          venues that lean into the outdoor experience consistently produce
          the most memorable weddings in the province.
        </p>

        <h2>Four categories worth considering</h2>
        <p>
          <strong>Conservation areas and provincial parks.</strong> The
          Niagara Parks Commission rents the Floral Showhouse, Queen Victoria
          Park, and Whirlpool Aero Car overlooks. Conservation Halton manages
          Crawford Lake, Mount Nemo, and Kelso. These properties run
          $1,500–$5,000 for ceremony permits — they&rsquo;re a venue
          backdrop, not a full reception space, so you&rsquo;re also booking a
          separate dinner location nearby.
        </p>
        <p>
          <strong>Farm and barn properties.</strong> Cambium Farms (Caledon),
          Earth to Table Farm (Flamborough/Hamilton), and Honsberger Estate
          (Niagara) host full outdoor ceremonies on grass or under
          tents, then move dinner into a heated barn or pavilion. The barn
          gives you the weather backup baked into the property. See the{" "}
          <a href="/venues?type=barn">barn venue directory</a> for the full
          list across Ontario.
        </p>
        <p>
          <strong>Wineries.</strong> Most Niagara wineries have a dedicated
          outdoor ceremony space — vineyards make for cinematic photos, and
          the indoor reception hall is your built-in Plan B if the weather
          turns. See{" "}
          <a href="/venues?type=winery">winery venues across Ontario</a>.
        </p>
        <p>
          <strong>Golf clubs.</strong> Often underrated — manicured greens,
          covered patios, reliable indoor dining rooms. Angus Glen
          (Markham), Granite Golf (King City), Whistle Bear (Cambridge), and
          Cherry Downs (Pickering) all run formal wedding programs. Golf
          clubs are the closest thing to a turnkey outdoor venue in Ontario
          — you get the lawn ceremony, the patio cocktail hour, and the
          indoor ballroom in one property.
        </p>

        <h2>The weather contingency — non-negotiable</h2>
        <p>
          Every Ontario outdoor wedding needs a Plan B confirmed in writing
          before the deposit is paid. Three patterns work:
        </p>
        <ol>
          <li>
            <strong>Tented backup.</strong> A 40-by-80 frame tent with
            sidewalls fits 120 seated. Rental + setup runs $3,500–$6,000;
            many venues require you book the tent at contract regardless of
            forecast.
          </li>
          <li>
            <strong>Indoor mirror space.</strong> The venue has an indoor
            room sized for the full ceremony — confirm the room is yours
            even if you don&rsquo;t use it. Some venues will only hold the
            indoor space if you pay an additional &ldquo;weather hold&rdquo;
            fee.
          </li>
          <li>
            <strong>Hybrid pavilion.</strong> Open-sided structures with a
            permanent roof — common at conservation areas and some farms.
            Cheapest backup and often the prettiest, but you&rsquo;re still
            exposed if it rains horizontally (which Ontario absolutely
            does).
          </li>
        </ol>

        <h2>Permit considerations</h2>
        <p>
          Public parks and conservation areas require a special-event
          permit. Lead time is typically 60–90 days; some require liability
          insurance ($2 million general liability is standard). If your
          ceremony venue isn&rsquo;t a private property with a wedding
          program, check the permit office before assuming a date is
          bookable. Municipal parks in Toronto (Trinity Bellwoods, High Park
          gazebo) book up 6+ months out.
        </p>

        <h2>Timing — golden hour matters</h2>
        <p>
          Sunset in Toronto is roughly 8:50 PM in late June and 6:50 PM in
          mid-October. The hour before sunset is your best photography light
          — plan ceremony start times so that you finish vows before that
          window and can use golden hour for couple portraits. A 4:00 PM
          ceremony in late June gives you a generous golden-hour pad; the
          same ceremony in early October leaves the photographer racing the
          sun.
        </p>

        <h2>Bug season — the warning nobody puts on a brochure</h2>
        <p>
          Late June and most of July are mosquito season near water in
          Ontario, including Muskoka, conservation areas, and lakeside
          wineries. Decent venues will deploy citronella + perimeter
          treatment the day-of, but ask directly. An outdoor September
          wedding has almost no bugs and the same daylight as a late-May
          wedding — and is consistently the best-photographed month.
        </p>

        <h2>Tent rentals — what each size costs</h2>
        <p>
          If you&rsquo;re running an outdoor reception on private land or at
          a venue without a built-in indoor backup, tent rentals are the
          single biggest line beyond catering:
        </p>
        <ul>
          <li><strong>20×40 frame tent</strong> (60 guests): $1,500–$2,500 plus delivery + setup.</li>
          <li><strong>40×60 frame tent</strong> (120 guests): $3,000–$4,500.</li>
          <li><strong>40×80 frame tent</strong> (160 guests): $4,500–$6,500.</li>
          <li><strong>Sailcloth / pole tents</strong> (the photogenic ones): typically 30–50% more than equivalent frame tents.</li>
        </ul>
        <p>
          Heat and sidewalls add roughly 25% to the rental in shoulder
          season. Major Ontario rental operators (Chair-man Mills, Higgins
          Event Rentals, Cherry Avenue Rentals) require a 30% deposit at
          contract and a final headcount 14 days before the wedding.
        </p>

        <p>
          Browse every outdoor-capable venue we track — wineries, farms,
          conservation areas, golf clubs, estates — on the{" "}
          <a href="/venues?type=outdoor">outdoor venues page</a>.
        </p>
      </>
    ),
  },

  /* ─── 13. Wedding catering costs in Ontario ────────────────────── */
  {
    slug: "wedding-catering-cost-ontario",
    title: "Wedding Catering Costs in Ontario: What to Budget (2026)",
    excerpt:
      "Catering is the biggest single line on most Ontario wedding budgets — here's a per-head breakdown, the four service styles, and the five fees couples forget to budget for.",
    category: "Vendor pricing",
    publishedAt: "2025-11-25",
    readMinutes: 8,
    heroImage: "/images/vendor-catering.png",
    metaDescription:
      "Wedding catering costs in Ontario (2026): per-person $85–$250, plated vs buffet vs stations, bar costs, vendor meals, gratuity and HST explained.",
    body: (
      <>
        <p>
          For most Ontario weddings, catering is the largest single line on
          the budget — usually 35–45% of the total. The per-person rate is
          the figure couples anchor on, but the real number that matters is
          what shows up on the final invoice after gratuity, HST, bar, and
          vendor meals. Once you add it all up, an Ontario plated dinner that
          quoted at $115 per person typically lands closer to <strong>$155
          per person all-in</strong>. Plan for that gap from the start and
          the surprises stop being surprises.
        </p>

        <h2>The three Ontario per-person tiers</h2>
        <p>
          <strong>$85–$125 — Budget.</strong> External caterers booked for a
          dry hall or barn rental, family-style or buffet service, one
          protein + one vegetarian option, simple appetizer rotation,
          coffee/tea + dessert service included. Examples: Daniel et Daniel
          mid-tier menus, Chef &amp; Co., 10tation Event Catering value
          menus.
        </p>
        <p>
          <strong>$125–$175 — Mid-market.</strong> The default for most
          Ontario weddings. Plated dinner with three protein choices,
          stationed cocktail-hour appetizers, late-night station (poutine,
          slider bar, taco station), wedding-cake cutting and service. In
          this tier in the GTA: Eatertainment, McEwan Group, Encore Catering;
          in Niagara: Niagara&rsquo;s Finest Catering, The Wine Country
          Catering Co.
        </p>
        <p>
          <strong>$175–$250+ — Premium.</strong> Five-course tasting-menu
          weddings or fully bespoke menus. Specialty proteins (lamb, duck,
          beef tenderloin), composed plates, mid-service intermezzi, the
          works. At this tier you&rsquo;re typically working with a
          restaurant-group caterer (Oliver &amp; Bonacini, Eatertainment
          premium, Daniel et Daniel signature) or an in-house team at a
          luxury hotel ballroom.
        </p>

        <h2>Service styles — what each one actually costs</h2>
        <p>
          <strong>Plated dinner.</strong> The default. Most expensive on a
          per-head basis (more service staff, more cooking precision), but
          most predictable — exactly what each guest ordered shows up at the
          right table.
        </p>
        <p>
          <strong>Family-style.</strong> Large platters dropped on each
          table. Typically $5–$15 per person cheaper than plated. Reads
          generous; works best for guest counts under 120 because of table
          logistics.
        </p>
        <p>
          <strong>Buffet.</strong> Cheapest per-person ($10–$20 below plated)
          but requires more food volume — overall savings are typically less
          than the per-head number suggests. Works for less formal weddings.
        </p>
        <p>
          <strong>Food stations.</strong> Often <em>more</em> expensive than
          plated because each station needs its own chef and equipment.
          Couples pick this for the experience, not the savings.
        </p>

        <h2>Bar costs</h2>
        <p>
          Three structures common in Ontario:
        </p>
        <ul>
          <li>
            <strong>Beer + wine only:</strong> $25–$40 per person for a 5–6
            hour reception.
          </li>
          <li>
            <strong>Standard open bar</strong> (beer, wine, well spirits):
            $40–$60 per person.
          </li>
          <li>
            <strong>Premium open bar</strong> (call brands + signature
            cocktails): $55–$80 per person.
          </li>
        </ul>
        <p>
          Many barn and dry-hall venues let you bring in your own alcohol via
          a Special Occasion Permit through AGCO ($35 application fee);
          you&rsquo;ll still need a licensed bartender ($40–$60/hour) but the
          bottle cost is yours to manage. Net savings on a 100-person wedding
          typically run $1,500–$3,000.
        </p>

        <h2>The five fees couples forget</h2>
        <ol>
          <li>
            <strong>Vendor meals.</strong> Photographer, videographer, DJ,
            planner all need to eat. Caterers charge $30–$45 per vendor meal
            — usually half-price of the guest meal. Budget for 4–6 vendor
            meals.
          </li>
          <li>
            <strong>Gratuity.</strong> 18–20% on the food + beverage subtotal
            is standard in Ontario. Some caterers include it; most
            don&rsquo;t. Always ask.
          </li>
          <li>
            <strong>HST.</strong> 13% on top of food, beverage, and
            sometimes service. On a $15,000 catering quote, that&rsquo;s
            nearly $2,000.
          </li>
          <li>
            <strong>Bartender + service staff fees.</strong> Often a separate
            line — $400–$1,500 depending on team size and event length.
          </li>
          <li>
            <strong>Cake cutting + dessert service.</strong> If your wedding
            cake is from an outside baker, the caterer may charge $2–$5 per
            person to plate and serve it.
          </li>
        </ol>

        <h2>Tastings and menu development</h2>
        <p>
          Most Ontario caterers include one tasting for two people at no
          additional cost once you&rsquo;ve paid the deposit. Additional
          tastings run $75–$150 per person. Custom menu development (off
          their standard list) may add a $200–$500 menu design fee — worth
          confirming in writing if you&rsquo;re asking for anything unusual.
        </p>

        <h2>Dietary restrictions — the contractual fine print</h2>
        <p>
          Almost every Ontario caterer accommodates the four major
          restrictions (vegetarian, gluten-free, dairy-free, nut-free) at no
          additional cost — but they need to know the exact count 14–21
          days before the wedding. Halal, kosher, and full-vegan menus are
          handled on a case-by-case basis: vegan is usually a like-for-like
          swap; halal and kosher may require an outside-sourced protein and
          a separate $400–$1,000 sourcing fee. Always ask the caterer to
          break out the &ldquo;regular meal&rdquo; price vs the &ldquo;special
          dietary meal&rdquo; price in writing — some venues quietly bill
          dietary swaps at 1.5× the standard rate.
        </p>

        <p>
          Browse Ontario caterers by region, with pricing tiers, sample menus
          and Google review counts on the{" "}
          <a href="/vendors/catering">catering directory</a>. If your venue
          requires you bring your own caterer, your{" "}
          <a href="/vendors/wedding_planner">wedding planner</a> can usually
          shortlist three vendors who&rsquo;ve worked at your specific venue
          before — that experience is worth the half-day of coordination it
          saves you.
        </p>
      </>
    ),
  },

  /* ─── 14. Toronto + GTA wedding venues ─────────────────────────── */
  {
    slug: "toronto-wedding-venues",
    title: "Best Wedding Venues in Toronto & the GTA (2026 Guide)",
    excerpt:
      "Distilleries, rooftops, hotel ballrooms, waterfront — every category of Toronto-area venue, with capacity, price ranges, and the parking notes nobody wants to talk about.",
    category: "Toronto guide",
    publishedAt: "2025-10-28",
    readMinutes: 9,
    heroImage: "/images/region-toronto.png",
    metaDescription:
      "Best Toronto and GTA wedding venues 2026: hotel ballrooms, distilleries, rooftops, waterfront, lofts — with price ranges, capacity, and parking notes.",
    body: (
      <>
        <p>
          Toronto and the broader GTA pull the highest wedding venue search
          volume in Ontario by a wide margin — partly because the population
          density supports it, partly because the venue diversity has no
          equivalent elsewhere in the province. Couples are typically
          choosing between five distinct &ldquo;flavours&rdquo; of GTA
          venue, each with its own price band and logistical tradeoffs.
        </p>

        <h2>Hotel ballrooms — the turnkey choice</h2>
        <p>
          The Four Seasons (Yorkville), Shangri-La, The Ritz-Carlton, the
          King Edward, the Fairmont Royal York, and One King West are the
          most-booked downtown hotel ballrooms. Capacity ranges from 120
          (Shangri-La&rsquo;s Lounge) to 800 (Royal York&rsquo;s Imperial
          Room). Saturday Toronto rates run{" "}
          <strong>$25,000–$60,000+</strong> for venue + plated dinner for
          120 guests — partly because the hotels include just about
          everything (linens, dance floor, full event staff, room block at
          the hotel for guests). Best fit for couples who want a single
          coordinator handling every line item from ceremony space through
          midnight tea service.
        </p>

        <h2>Distillery District — the most-booked Toronto neighbourhood</h2>
        <p>
          Archeo, Loft, The Fermenting Cellar, and Madison Manor all sit
          within the Distillery District. The exposed-brick + cobblestone
          aesthetic is genuinely Instagram-defining; the venues are run by
          two operators (Archeo Catering / Fermenting Cellar Group) that
          handle everything in-house. Pricing $18,000–$35,000 for 120-guest
          weekends. Watch the alcohol licensing — outside-vendor restrictions
          are tight.
        </p>

        <h2>Rooftops + skyline venues</h2>
        <p>
          Malaparte (TIFF Bell Lightbox), The Globe and Mail Centre,
          Storys Building, and 99 Sudbury offer downtown skyline backdrops.
          Capacities 120–250. Pricing $20,000–$45,000 for venue + plated
          dinner. Most rooftop venues have a hard rain backup (the indoor
          dining room shares the floor) but ceremony timing has to flex if
          the forecast is bad — confirm what the venue will do at 1 PM the
          day-of if it&rsquo;s raining at the booked ceremony time.
        </p>

        <h2>Waterfront — Lake Ontario as backdrop</h2>
        <p>
          Polson Pier, Royal Canadian Yacht Club, Harbour 60, The Boulevard
          Club, and Palais Royale all front the lake. Polson Pier is the
          highest-capacity (200+ tented) and most-flexible — couples
          regularly book it for a full-buyout summer weekend. The Yacht
          Club is members-only access, which becomes the gating factor.
          Pricing $20,000–$50,000.
        </p>

        <h2>Industrial + loft — the design-forward category</h2>
        <p>
          Wallace Studios (Junction Triangle), Berkeley Church (Berkeley +
          Queen), Storys Building (King + Bay), Liberty Grand (Exhibition
          Place). These run dry-hall — you bring your own caterer, often
          from a preferred-vendor list. Cheaper venue line ($6,000–$15,000)
          but the catering line goes up because you&rsquo;re paying retail.
          Total comes in at $25,000–$50,000 for the same 120 guests.
        </p>

        <h2>GTA suburbs — the value option</h2>
        <p>
          If downtown isn&rsquo;t critical to your guests, the GTA suburbs
          host the largest wedding venues in the province. Liberty Grand
          (Exhibition Place / Liberty Village), Casa Loma (Forest Hill), The
          Manor by Peter and Pauls (Kettleby), Estates of Sunnybrook,
          Paramount Eventspace (Vaughan) all carry 250+ capacity at GTA
          prices that are 15–25% below equivalent downtown options. Worth
          considering if half your guest list is driving in from outside
          the core anyway.
        </p>

        <h2>The parking conversation nobody wants to have</h2>
        <p>
          Downtown Toronto venues almost never have free guest parking.
          Three common patterns:
        </p>
        <ul>
          <li>
            Validate parking at the hotel underneath (Four Seasons, Royal
            York) — usually $25–$45 per guest, often you can prepay a flat
            rate.
          </li>
          <li>
            Pay for a shuttle from a hotel block — $1,500–$3,000 for a
            coach running on a 4-hour evening loop.
          </li>
          <li>
            Tell guests in the invitation to take Uber/transit — works if
            most of your guest list is downtown-based.
          </li>
        </ul>
        <p>
          Almost every parking complaint we see in venue reviews could have
          been prevented by addressing this on the invitation.
        </p>

        <h2>Permits for outdoor downtown</h2>
        <p>
          City parks (Trinity Bellwoods gazebo, High Park, Toronto Music
          Garden) require a Special Event Permit from Toronto Parks &amp;
          Recreation. Apply 90+ days out; $150–$500 plus liability
          insurance. Casa Loma terrace ceremonies don&rsquo;t need this — it
          ships with the venue contract.
        </p>

        <h2>Booking timeline for GTA Saturdays</h2>
        <p>
          The most-booked downtown Toronto venues (Four Seasons, Casa Loma,
          Liberty Grand, the Distillery District halls, Royal York Imperial
          Room) take 14–18 months of lead time for peak-season Saturdays.
          Distillery District weddings are especially competitive between
          May and October because the four operators control limited
          inventory across only a handful of buildings. If you&rsquo;re
          flexible on day — Friday and Sunday rates at most downtown venues
          run 15–30% below Saturday — you can land a venue 6–9 months out
          even in peak season, and your guests will mostly thank you for
          the chance to recover before Monday.
        </p>

        <p>
          Browse every wedding-ready venue across the GTA — capacity,
          coordinator, indoor/outdoor flags — on the{" "}
          <a href="/venues?region=gta">GTA venues page</a>, or filter to{" "}
          <a href="/cities/toronto">Toronto-only venues</a> if downtown is
          where the wedding has to land.
        </p>
      </>
    ),
  },

  /* ─── 15. Wedding limo + transportation cost in Ontario ────────── */
  {
    slug: "wedding-limo-cost-ontario",
    title: "Wedding Limo & Transportation Costs in Ontario (2026)",
    excerpt:
      "Stretch limo, party bus, vintage Bentley, guest shuttle — Ontario wedding transportation costs from $600 to $3,000, and how to size the booking.",
    category: "Vendor pricing",
    publishedAt: "2025-09-29",
    readMinutes: 6,
    heroImage: "/images/vendor-limo.png",
    metaDescription:
      "Ontario wedding limo costs (2026): stretch limo $600–$1,500, party bus $1,500–$3,000, vintage cars $1,200–$3,000, guest shuttle pricing and how many hours to book.",
    body: (
      <>
        <p>
          About half of Ontario weddings book some form of dedicated
          transportation; the other half rely on guests driving themselves
          or taking Uber. Couples who skip it almost never regret it —
          couples who book it almost always say the photos in the back of
          the car ended up being some of their favourites. Here&rsquo;s
          what the Ontario market actually charges in 2026, and how to size
          the booking so you don&rsquo;t pay for hours you won&rsquo;t use.
        </p>

        <h2>What you&rsquo;re actually paying for</h2>
        <p>
          Almost every Ontario limo company charges a <em>minimum booking
          window</em> — typically 4 or 5 hours — even if you only need 90
          minutes of driving. The reason: their driver is committed for the
          afternoon, so they have to charge for the day. Plan the booking
          window around your usage timeline, not the actual minutes the
          wheels are turning.
        </p>

        <h2>Vehicle options + price ranges</h2>
        <p>
          <strong>Stretch limousine (8–10 passengers).</strong> The classic
          Lincoln stretch or Chrysler 300 stretch. Holds the wedding party
          plus parents comfortably. Pricing: <strong>$600–$1,500</strong>{" "}
          for a 4–5 hour booking. Most-booked option for couples who want
          one vehicle for the bridal party.
        </p>
        <p>
          <strong>Stretch SUV / Escalade limo (12–16 passengers).</strong>{" "}
          Roomier, more presence in photos, higher floor (which matters in
          a long dress). Pricing: <strong>$900–$2,000</strong> for the
          same 4–5 hour window. Good fit if your wedding party is 8+.
        </p>
        <p>
          <strong>Party bus (20–30 passengers).</strong> Onboard sound
          system, sometimes a dance pole (Ontario teenagers in the
          mid-2010s have a lot to answer for here), space to stand. Pricing:{" "}
          <strong>$1,500–$3,000</strong> for a 5-hour minimum. Worth the
          spend when you want the wedding party to ride together AND have
          drinks legally during the trip.
        </p>
        <p>
          <strong>Vintage and luxury cars.</strong> A 1930s Bentley, a 1960s
          Rolls-Royce Silver Cloud, a Classic Mustang. Pricing:{" "}
          <strong>$1,200–$3,000</strong>, often with a strict 3-hour
          window (vintage car operators don&rsquo;t want their machines on
          the road all day). Best as a ceremony-to-reception transfer plus
          couple portraits — not for moving the whole party around.
        </p>

        <h2>Guest shuttles — the underrated booking</h2>
        <p>
          If your venue is in Niagara wine country, Muskoka, or a Toronto
          area without easy parking, a guest shuttle is often the
          difference between a smooth night and an Uber-availability
          nightmare at 1:00 AM. Typical pricing for a 50-passenger coach:
        </p>
        <ul>
          <li><strong>$1,200–$2,000</strong> for a 6-hour evening loop (pickup at hotel → venue → return at midnight + 1 AM).</li>
          <li><strong>$2,500–$4,000</strong> for full-day coverage including ceremony arrival at a separate location.</li>
        </ul>
        <p>
          Coach Canada, Pacific Western, and Stock Transportation all run
          wedding shuttles across Ontario. Smaller transportation operators
          will sub-contract — confirm the actual fleet operator before
          paying the deposit.
        </p>

        <h2>How many hours to book</h2>
        <p>
          A typical wedding-day limo timeline:
        </p>
        <ol>
          <li>30 min — pickup at the prep location (hotel or family home).</li>
          <li>15–30 min — drive to ceremony venue.</li>
          <li>30 min — buffer (photos with the car, last-minute timing).</li>
          <li>45–90 min — between ceremony and reception, sometimes including a photo stop.</li>
          <li>15–30 min — final transfer to reception.</li>
        </ol>
        <p>
          Total: 2.5–4 hours of actual usage, which fits inside almost
          every 4–5 hour minimum. If your ceremony and reception are at the
          same venue you can often reduce this — but you still pay the
          minimum.
        </p>

        <h2>What&rsquo;s usually included</h2>
        <p>
          Champagne or sparkling-water service in the limo, a &ldquo;just
          married&rdquo; sign or floral decoration, a uniformed driver,
          fuel, and standard insurance. <strong>Driver gratuity (15–20%
          on the rental rate)</strong> is almost never included and is
          expected on top — typically $80–$300. HST adds 13%.
        </p>

        <h2>When to book</h2>
        <p>
          Peak-season Saturdays (June through September, plus all of October
          in Niagara) book 4–6 months ahead at the major Ontario operators.
          Off-season Friday and Sunday weddings can typically book 2–3
          months out, often with a 10–15% rate discount.
        </p>

        <h2>What to ask before paying the deposit</h2>
        <p>
          Five questions surface most of the issues couples report after the
          wedding:
        </p>
        <ul>
          <li>
            <strong>Confirm the exact vehicle, not just the class.</strong>{" "}
            &ldquo;Stretch limo&rdquo; isn&rsquo;t one car — a 2011 Lincoln
            and a 2024 Cadillac Escalade are both technically stretch
            limos. Ask for the model year in writing.
          </li>
          <li>
            <strong>Backup vehicle policy.</strong> If your contracted
            limo breaks down (it happens), what shows up instead? A
            comparable vehicle? A van? Get the answer before deposit.
          </li>
          <li>
            <strong>Driver dress code.</strong> Default at the Ontario
            mid-tier operators is black suit + tie. Specify if you want
            something different.
          </li>
          <li>
            <strong>Overtime rate.</strong> If the day runs over, what
            does each additional 30 minutes cost? Should be in the
            contract, typically $75–$150 per half hour.
          </li>
          <li>
            <strong>Cancellation + weather policy.</strong> Most operators
            keep 50% of the rental rate on cancellations inside 30 days.
          </li>
        </ul>

        <p>
          Browse Ontario limo + transportation providers by region,
          with fleet listings, pricing tiers, and Google review counts on
          the <a href="/vendors/limo">limo directory</a>.
        </p>
      </>
    ),
  },

  /* ─── 16. Barn wedding venues Ontario ──────────────────────────── */
  {
    slug: "barn-wedding-venues-ontario",
    title: "Best Barn Wedding Venues in Ontario (2026 Guide)",
    excerpt:
      "Heated barns, restored timber, working farms — the Ontario barn venues couples are booking in 2026, what&rsquo;s typically included, and the decorating decisions that carry the room.",
    category: "Venue guide",
    publishedAt: "2025-09-15",
    readMinutes: 8,
    heroImage: "/images/venue-barn.png",
    metaDescription:
      "Best barn wedding venues in Ontario (2026): top properties, what to look for, seasonal considerations, what's typically included, and lighting decisions that matter.",
    body: (
      <>
        <p>
          Ontario does barn weddings well. The province has decades of
          farming heritage, a mature restoration market that has converted
          dozens of old timber barns into proper event spaces, and just
          enough sprawl outside the GTA to give every couple a working
          countryside option within 60 minutes of the city. Barn weddings
          aren&rsquo;t the cheapest category — once you add catering and
          rentals, total cost typically matches a winery wedding — but they
          deliver an aesthetic that nothing else in the venue catalogue can
          match.
        </p>

        <h2>Eight Ontario barn venues worth touring</h2>
        <p>
          <strong>Honsberger Estate (Jordan / Niagara).</strong> Restored
          1840s barn, capacity 200. Outdoor ceremony in the vineyard,
          reception inside the barn. The most polished barn venue in the
          province; rates reflect it. Saturdays run $9,000–$14,000 for
          venue rental alone.
        </p>
        <p>
          <strong>Little Barn Co. Weddings (St. Catharines).</strong> Newer
          purpose-built barn-style venue in West Niagara. Capacity 130 +
          outdoor ceremony lawn. Around $6,000–$10,000 for venue rental.
        </p>
        <p>
          <strong>The Estate at Hidden Valley (Beamsville).</strong>
          Working orchard property with a renovated barn. Capacity 180.
          Strong choice for couples who want the rural feel without the
          city/winery price tag.
        </p>
        <p>
          <strong>Earth To Table Farm (Flamborough / Hamilton).</strong>
          Restored century barn surrounded by a working organic farm.
          Capacity 150. The catering comes through Pearle Hospitality
          (Spencer&rsquo;s, Anker, others), which is what you want when
          the menu becomes the whole story.
        </p>
        <p>
          <strong>Cambium Farms (Caledon).</strong> 100-acre farm
          property an hour northwest of Toronto. The barn fits 200 indoor
          + tented outdoor option. Couples regularly host the full
          weekend on-site.
        </p>
        <p>
          <strong>Strathmere (Ottawa area).</strong> Country inn with a
          dedicated barn building. Eastern Ontario&rsquo;s most-booked
          barn venue. Capacity 250.
        </p>
        <p>
          <strong>Hessenland Country Inn (Goderich-area).</strong>
          Lake-Huron-side barn property. Quieter market, lower
          pricing, real lakefront ceremony backdrop.
        </p>
        <p>
          <strong>South Pond Farms (Pontypool, near Peterborough).</strong>
          Farmhouse + restored barn + cooking-school kitchen on a 100-acre
          property. Capacity 180. Catering is done in-house; the on-site
          team writes a custom seasonal menu around the kitchen garden.
        </p>

        <h2>What to look for in a barn venue</h2>
        <p>
          Five questions decide whether a barn is bookable or just
          photogenic:
        </p>
        <ol>
          <li>
            <strong>Is it heated?</strong> Ontario shoulder season (April,
            October, November) needs real heat, not space heaters. Couples
            consistently misjudge how cold a barn gets at 9 PM in October.
          </li>
          <li>
            <strong>Restroom count.</strong> A 150-guest wedding needs at
            least 4 toilets in working order. Some older barns supplement
            with luxury trailer washrooms ($1,500–$3,000 for the day).
          </li>
          <li>
            <strong>Power capacity.</strong> Sound system + lighting +
            catering equipment + warming ovens add up. Ask whether the
            venue&rsquo;s electrical can handle a full reception load, or
            whether you&rsquo;ll need a generator.
          </li>
          <li>
            <strong>Catering kitchen access.</strong> A proper prep kitchen
            is the difference between a hot meal and a lukewarm one. If
            the venue is &ldquo;catering-prep-only&rdquo;, your caterer
            will quote higher to compensate.
          </li>
          <li>
            <strong>Parking + the last mile of road.</strong> Rural barn
            properties often sit at the end of a gravel road. In rain or
            October mud this turns into a guest-experience problem. Some
            venues run a parking shuttle from a paved lot.
          </li>
        </ol>

        <h2>Seasonal window</h2>
        <p>
          Unheated barns operate May through October. Heated barns
          (Honsberger, Cambium, South Pond, Strathmere) extend into
          November and re-open in March, sometimes year-round. Winter barn
          weddings are dramatically cheaper (often 30–40% off peak) and
          increasingly popular — the photos look incredible when there&rsquo;s
          snow outside the windows.
        </p>

        <h2>What&rsquo;s typically included</h2>
        <p>
          Most Ontario barn venues include the space, basic farm tables and
          benches, a ceremony area, and parking. Almost nothing else. You
          typically bring: caterer, bar service, rentals (linens, chairs,
          glassware), lighting design, sound system, and dance floor.
          Budget an extra $4,000–$8,000 for rentals beyond what the venue
          provides on a 100-guest barn wedding.
        </p>

        <h2>Decorating — lighting carries the room</h2>
        <p>
          Three lighting investments do more than any floral installation
          in a barn:
        </p>
        <ul>
          <li>
            <strong>Bistro string lights overhead</strong> — $400–$1,200
            depending on barn size, the single best-spent lighting dollar.
          </li>
          <li>
            <strong>Uplighting along the walls</strong> — $20–$40 per
            fixture; 15–25 fixtures for a typical barn. Sets the mood
            once the sun drops.
          </li>
          <li>
            <strong>A focal-point installation</strong> behind the head
            table — fabric drape, dried botanical wall, or pampas grass
            grouping. Adds $800–$2,500 and shows up in every wide shot.
          </li>
        </ul>

        <p>
          Browse Ontario barn venues by region — capacity, indoor/outdoor
          flags, coordinator info — on the{" "}
          <a href="/venues?type=barn">barn venues page</a>. Lighting
          designers across the province are listed on the{" "}
          <a href="/vendors/lighting_decor">lighting + decor directory</a>;
          almost all of them work with barn venues regularly and bring
          rigging hardware appropriate for timber-frame ceilings. For
          broader regional context, see the{" "}
          <a href="/blog/best-wedding-venues-niagara-2026">2026 Niagara
          venue guide</a>, which includes the highest concentration of
          barn options in the province.
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

/* Three category groups used by the blog index filter chips and by
 * related-post fall-back ranking. The post objects keep their
 * specific category strings ("Niagara guide", "Vendor pricing", etc.)
 * for display — this is the bucket abstraction over them. */
export type CategoryGroup = "venues" | "cost" | "regional";

export const CATEGORY_GROUP_LABELS: Record<CategoryGroup, string> = {
  venues:   "Venues",
  cost:     "Cost Guides",
  regional: "Regional Guides",
};

export function getCategoryGroup(category: string): CategoryGroup {
  const c = category.toLowerCase();
  if (c.includes("vendor pricing") || c.includes("cost"))  return "cost";
  if (c.includes("venue guide"))                           return "venues";
  /* Everything else is a regional guide (Niagara, Muskoka, Toronto,
   * Cottage country, Golden Horseshoe, etc.) */
  return "regional";
}

/* Picks up to N posts related to the given slug. Ranking:
 *   1. exact-category match, most-recent first
 *   2. same category-group match, most-recent first
 *   3. most-recent posts overall
 * Always returns up to `limit`, never includes the current post. */
export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const current = getBlogPost(slug);
  if (!current) return [];

  const all = listBlogPosts().filter((p) => p.slug !== slug);
  const sameCategory = all.filter((p) => p.category === current.category);
  const currentGroup = getCategoryGroup(current.category);
  const sameGroup    = all.filter(
    (p) => p.category !== current.category && getCategoryGroup(p.category) === currentGroup,
  );
  const ordered: BlogPost[] = [];
  const seen = new Set<string>();
  for (const p of [...sameCategory, ...sameGroup, ...all]) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    ordered.push(p);
    if (ordered.length >= limit) break;
  }
  return ordered;
}
