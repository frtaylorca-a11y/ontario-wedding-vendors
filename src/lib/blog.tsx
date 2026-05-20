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
];

export function getBlogPost(slug: string): BlogPost | null {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

export function listBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  );
}
