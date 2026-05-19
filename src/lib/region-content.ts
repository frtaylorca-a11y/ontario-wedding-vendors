export type RegionFaq = { question: string; answer: string };

export type RegionContent = {
  image: string;
  intro: string;
  faqs: RegionFaq[];
  /** Venue types worth highlighting as filtered listing links */
  highlightTypes: { label: string; type: string }[];
};

/* Image fallbacks for regions without a dedicated region-*.png yet */
const REGION_CONTENT: Record<string, RegionContent> = {
  niagara: {
    image: "/images/region-niagara.png",
    intro:
      "Niagara is Ontario's most concentrated wedding region — a 50-kilometre stretch from Niagara-on-the-Lake through St. Catharines to Niagara Falls that hosts more weddings per capita than anywhere else in the province. Vineyard estates anchor the wine route, where couples exchange vows under pergolas with the Niagara Escarpment as backdrop. Niagara-on-the-Lake adds historic inns and lakeside garden settings dating back to the 1800s. Niagara Falls offers ballroom hotels with falls views and chapels that can host intimate weekday ceremonies. Inland, working barns and golf estates in Lincoln, Pelham and Grimsby fill out the mid-range. Peak season runs June through October — book 14 to 18 months ahead for any Saturday in September.",
    faqs: [
      {
        question: "How much do wedding venues cost in Niagara?",
        answer:
          "Niagara wedding venues range from $3,000 for intimate weekday packages at smaller inns up to $15,000+ for premier vineyard estates on peak Saturdays. A typical mid-range Niagara winery wedding (100-150 guests, plated dinner, Saturday in September) lands between $7,000 and $10,000 for venue and catering combined. Niagara-on-the-Lake commands roughly 20% more than St. Catharines or Welland for comparable venues.",
      },
      {
        question: "What's the best month to get married in Niagara?",
        answer:
          "September and early October are the highest-demand months — grape harvest backdrops at wineries, mild temperatures, and reliable weather. June is the second peak. May and late October are excellent value alternatives with similar weather and 20-30% lower venue rates. Winter weddings (January-March) in Niagara are unusual but possible at hotels and barn venues with indoor backup spaces — expect significant discounts.",
      },
      {
        question: "How far in advance should I book a Niagara wedding venue?",
        answer:
          "For peak-season Saturdays (June-October), book 14 to 18 months ahead. Premier vineyard estates often book 18-24 months out for September and October dates. Off-peak Saturdays and any weekday can typically be booked 6-9 months ahead. Last-minute (under 3 months) bookings are realistic only for weekday ceremonies or winter dates.",
      },
      {
        question: "Are there small wedding venues in Niagara for under 50 guests?",
        answer:
          "Yes — Niagara has strong options for intimate weddings. Small inns in Niagara-on-the-Lake, private dining rooms at boutique wineries, and historic chapels in old-town NOTL all comfortably handle 20-50 guests. Many vineyard estates also offer scaled-down weekday packages for elopements and micro-weddings. Filter by capacity 50 or fewer to see the full set.",
      },
      {
        question: "Can you get married outdoors at a Niagara winery?",
        answer:
          "Most Niagara wineries offer outdoor ceremony sites — typically a vineyard-edge pergola, garden patio, or barrel-room patio with vineyard views. Reception is usually indoors in a barrel cellar, pavilion, or restored barn. Plan a tented rain backup for May through October; full indoor backup is essential November through April. Confirm setback distance from the vines (some sites move ceremonies to a paved area in wet weather).",
      },
    ],
    highlightTypes: [
      { label: "Wineries",     type: "winery" },
      { label: "Estates",      type: "estate" },
      { label: "Hotels",       type: "hotel" },
      { label: "Golf clubs",   type: "golf-club" },
      { label: "Barns",        type: "barn" },
    ],
  },

  gta: {
    image: "/images/region-toronto.png",
    intro:
      "The Greater Toronto Area covers Toronto core, Mississauga, Vaughan, Markham, and the suburban corridor stretching to Oshawa and Burlington. Urban couples find downtown ballrooms, restored heritage buildings in the Distillery and King West districts, and rooftop terraces with skyline views. Waterfront venues along Lake Ontario from Etobicoke to the Beach offer lakefront ceremonies year-round. Vaughan and Mississauga concentrate banquet halls built for South Asian and Italian-Canadian weddings of 300+ guests. North of the 401, country clubs and golf estates around Aurora, Caledon and King City give couples a rural setting within a 45-minute drive. Peak rates apply June through October with a strong winter ballroom season in January and February.",
    faqs: [
      {
        question: "How much do Toronto wedding venues cost?",
        answer:
          "Downtown Toronto venues range from $8,000 for daytime ceremony-only packages at small restaurants up to $30,000+ for premier hotel ballrooms on Saturday nights. A typical 150-guest Toronto wedding (venue + catering, mid-range hotel ballroom, Saturday in June) lands between $18,000 and $25,000. Vaughan and Mississauga banquet halls scale to large weddings (300+) at a lower per-head rate than downtown.",
      },
      {
        question: "Are there rooftop wedding venues in Toronto?",
        answer:
          "Yes — multiple downtown hotels and event spaces offer rooftop ceremony and reception sites with CN Tower and waterfront views. Most operate May through October only; some have year-round indoor lounges adjacent. Capacity caps are lower than ballroom equivalents (typically 80-150 guests). Always confirm tent/awning options and noise bylaws for evening receptions.",
      },
      {
        question: "What are the best waterfront wedding venues in Toronto?",
        answer:
          "Lake Ontario waterfront spans from the Toronto Islands and Harbourfront in the core, east to the Beach and Scarborough Bluffs, and west to Mississauga's Port Credit. Island venues require boat shuttles for guests. Restaurants and yacht clubs along Queens Quay and Lakeshore Boulevard offer year-round lakefront views with indoor backup. Mid-range pricing similar to downtown ballrooms.",
      },
      {
        question: "How many guests can a typical Toronto wedding venue hold?",
        answer:
          "Toronto venues skew larger than other Ontario regions. Downtown hotel ballrooms commonly seat 250-400 for plated dinners, with the largest banquet halls in Vaughan and Mississauga handling 600-800. Boutique downtown spaces start around 60-100 guests. Capacity is the most important first filter — eliminate any venue that can't comfortably seat your full guest list with a dance floor.",
      },
      {
        question: "How far in advance should I book a Toronto wedding venue?",
        answer:
          "Peak Saturdays (June-October) at popular downtown venues book 18-24 months out. Hotel ballrooms can sometimes accommodate 12-15 months ahead. Winter Saturdays (January-March) and any Friday/Sunday are typically available 6-9 months ahead. South Asian wedding season (May-June, late September-October) is even tighter — book 24 months ahead for premier halls.",
      },
    ],
    highlightTypes: [
      { label: "Hotels",       type: "hotel" },
      { label: "Banquet halls", type: "banquet-hall" },
      { label: "Estates",      type: "estate" },
      { label: "Golf clubs",   type: "golf-club" },
      { label: "Barns",        type: "barn" },
    ],
  },

  "golden-horseshoe": {
    image: "/images/region-hamilton.png",
    intro:
      "Hamilton, Burlington, Oakville and the broader Golden Horseshoe sit between Toronto and Niagara — close enough to draw guests from both, with significantly better venue value than the GTA. Hamilton's escarpment offers waterfall-adjacent ceremony sites at conservation areas and historic stone estates carved into the cliffside. Burlington and Oakville bring lakefront country clubs and restored 19th-century manor estates with sweeping grounds. Ancaster and Waterdown contribute working farms and converted barn venues. The whole region benefits from sub-90-minute drives to both Toronto and Niagara, making it a natural pick for couples with split-region guest lists. Peak rates apply June through October, with the escarpment foliage making mid-October bookings competitive.",
    faqs: [
      {
        question: "How much do Hamilton and Burlington wedding venues cost?",
        answer:
          "Golden Horseshoe venues run roughly 25-35% below comparable Toronto venues. A 150-guest wedding at a Burlington country club or Hamilton estate (venue + catering, Saturday in September) lands between $12,000 and $18,000. Conservation area ceremony sites are bookable individually from $500-$1,500 if you're hosting reception elsewhere. Premier escarpment estates in upper Hamilton can reach $20,000+ for full Saturday bookings.",
      },
      {
        question: "What are the best escarpment wedding venues near Hamilton?",
        answer:
          "The Niagara Escarpment runs directly through Hamilton — venues like the Royal Botanical Gardens, Albion Falls conservation area, and several private estates carved into the cliff face offer ceremony sites with dramatic geological backdrops. Most require separate reception venues. The escarpment views are best photographed mid-morning or in the hour before sunset.",
      },
      {
        question: "Are there historic estate wedding venues in Hamilton or Burlington?",
        answer:
          "Yes — Hamilton and Burlington have an unusually high concentration of restored 19th-century stone estates, mostly former industrialist or shipping-magnate properties. These typically combine a large manor house (indoor reception), formal gardens (outdoor ceremony), and on-site accommodation for the wedding party. Capacity ranges 80-200 guests.",
      },
      {
        question: "Can you get married outdoors in the Golden Horseshoe?",
        answer:
          "Outdoor ceremonies work May through October at most regional estates and country clubs. The escarpment microclimate means slightly later spring (mid-May vs early May) for reliable outdoor weather. Always confirm indoor backup capacity — escarpment storms can develop quickly. Conservation areas often require their own permits separate from venue rental.",
      },
      {
        question: "How does Hamilton compare to Niagara for weddings?",
        answer:
          "Hamilton offers comparable scenery (escarpment, lakefront, gardens) at meaningfully lower prices than Niagara-on-the-Lake. Niagara has more concentrated wine-country atmosphere; Hamilton has more historic-estate variety and shorter drives for GTA guests. Many Niagara couples book Hamilton venues when the budget gap matters more than the vineyard backdrop.",
      },
    ],
    highlightTypes: [
      { label: "Estates",     type: "estate" },
      { label: "Golf clubs",  type: "golf-club" },
      { label: "Barns",       type: "barn" },
      { label: "Hotels",      type: "hotel" },
      { label: "Conservation areas", type: "conservation" },
    ],
  },

  "cottage-country": {
    image: "/images/region-muskoka.png",
    intro:
      "Muskoka and the broader Cottage Country region — including Bracebridge, Huntsville, Gravenhurst, and the Lake of Bays/Lake Joseph chain — is Ontario's lakefront wedding heartland. Couples come for dockside ceremonies, restored cedar lodges with century-old timber-frame interiors, and the wide cottage rental network that turns a wedding into a four-day weekend. Resorts and conference lodges anchor the high end with 150-200 guest capacity, full catering, and on-site cabins for guests. Smaller lakeside venues handle intimate weddings of 30-80 guests with private cottage rentals nearby. Collingwood, Wasaga Beach and Barrie extend the region southwest for couples who want cottage-country feel within 90 minutes of the GTA. Season is short — June through mid-October only.",
    faqs: [
      {
        question: "When is the best time for a Muskoka wedding?",
        answer:
          "Late June through early September is peak — long days, reliable warm-water swimming for guests, and full resort staffing. Late September brings spectacular fall colour but rapidly cooling lake temperatures. Mid-October weddings are possible at lodges with strong indoor reception spaces but outdoor activity is limited. Most Muskoka venues close November through May.",
      },
      {
        question: "How much do Muskoka lakefront wedding venues cost?",
        answer:
          "Premier Muskoka resort weddings (100-150 guests, full weekend with accommodation) range $25,000-$45,000 including cabin rentals for the wedding party. Smaller lakefront venues handling 50-80 guests run $10,000-$18,000 for a Saturday booking. Cottage rental for guests is typically extra and books separately. Muskoka pricing skews higher than other Ontario regions because of the all-inclusive weekend format.",
      },
      {
        question: "Can guests stay overnight at Muskoka wedding venues?",
        answer:
          "Most Muskoka resort venues include on-site cabins or lodge rooms — typically 40-80 guests can stay on-property, with overflow handled by nearby cottage rentals. This is the main reason Muskoka weddings command higher prices: you're effectively booking a private resort for the weekend. Smaller venues without accommodation expect guests to book area rentals (Airbnb, cottage agencies) independently.",
      },
      {
        question: "What's the difference between Muskoka and broader Cottage Country?",
        answer:
          "Muskoka specifically refers to the District of Muskoka — Bracebridge, Huntsville, Gravenhurst, Port Carling and the Muskoka Lakes. Cottage Country also includes the Kawarthas (Peterborough, Lakefield), Haliburton, and Simcoe County (Barrie, Collingwood, Wasaga). Pricing and atmosphere differ — Muskoka skews more premium and the others typically run 20-30% less for comparable lakefront venues.",
      },
      {
        question: "Do Muskoka wedding venues operate in winter?",
        answer:
          "A small number of resort venues operate year-round with indoor-only winter weddings (ice-castle photo backdrops, cozy lodge receptions). Most close November through May. Winter Muskoka weddings work best at properties with attached accommodation since guest travel in winter weather is unreliable.",
      },
    ],
    highlightTypes: [
      { label: "Resorts",      type: "resort" },
      { label: "Inns",         type: "inn" },
      { label: "Barns",        type: "barn" },
      { label: "Estates",      type: "estate" },
      { label: "Conservation areas", type: "conservation" },
    ],
  },

  "waterloo-region": {
    image: "/images/venue-estate.png",
    intro:
      "Waterloo Region covers Kitchener, Waterloo, Cambridge, and the surrounding rural townships including Elora, Fergus and St. Jacobs. The region splits between two strong wedding traditions: urban venues in the tech-city core of Kitchener-Waterloo, and historic Mennonite-country settings around St. Jacobs and Elora's Grand River gorge. Restored 19th-century stone mills, working farms with century barns, and university-town hotels make up most of the mid-range. Couples often choose Waterloo for its central Southwestern Ontario location — close to London, Hamilton, and the GTA — combined with notably lower venue prices than the GTA. Peak rates apply June through October.",
    faqs: [
      {
        question: "What are the best wedding venues in Kitchener-Waterloo?",
        answer:
          "KW's strongest venues split between downtown urban (boutique hotels, restored industrial spaces in the innovation district) and rural-adjacent (farms and converted barns within 20 minutes of the cities). Cambridge adds restored stone mills along the Grand River. Most KW venues comfortably handle 100-180 guests; a few in Cambridge scale to 250+.",
      },
      {
        question: "Are there barn wedding venues near Waterloo?",
        answer:
          "Yes — the Mennonite agricultural region around St. Jacobs, Elmira and West Montrose has dozens of working farms and converted bank barns hosting weddings. Most operate May through October with limited winter availability. Capacity typically 80-150 guests. Bring rain backup planning even in mid-summer.",
      },
      {
        question: "How much do Waterloo Region wedding venues cost?",
        answer:
          "Waterloo Region runs roughly 30-40% below comparable Toronto pricing. A 150-guest wedding at a KW hotel or rural barn (venue + catering, Saturday in September) lands between $10,000 and $16,000. Premier restored-mill venues in Cambridge or Elora can reach $20,000 for full Saturday bookings.",
      },
      {
        question: "What's a good winter wedding venue in Waterloo?",
        answer:
          "Urban hotels in downtown Kitchener and uptown Waterloo run year-round with indoor reception spaces. Restored mill venues in Cambridge typically have heated reception halls that work November through March. Avoid barn venues for winter weddings unless they're fully insulated and heated — most aren't.",
      },
      {
        question: "What's the closest winery region to Waterloo?",
        answer:
          "Waterloo doesn't have its own wine region, but Niagara is 60-75 minutes south and Prince Edward County is roughly 3 hours east. Couples wanting a winery backdrop typically book day-trip-distance Niagara venues. For a closer rural-vineyard feel, several Waterloo Region farms have planted small vineyards and offer winery-style ceremony sites without the wine-region travel.",
      },
    ],
    highlightTypes: [
      { label: "Barns",      type: "barn" },
      { label: "Estates",    type: "estate" },
      { label: "Hotels",     type: "hotel" },
      { label: "Golf clubs", type: "golf-club" },
    ],
  },

  southwestern: {
    image: "/images/venue-winery.png",
    intro:
      "Southwestern Ontario stretches from London through Stratford, Woodstock and Chatham down to Windsor on the Detroit River. London anchors the region with urban hotels, river-adjacent estates and a growing cluster of farm and winery venues in the surrounding agricultural belt. Stratford brings restored 19th-century theatres and inns alongside the festival circuit — popular for sophisticated mid-summer weddings. Lake Erie shoreline towns including Port Stanley and Erie Shores add waterfront ceremony options. Windsor and Essex County host a small but growing wine region (Pelee Island, Colio, Lake Erie North Shore) producing a winery wedding circuit at meaningfully lower prices than Niagara. Peak season is June through September.",
    faqs: [
      {
        question: "What are the best wedding venues in London, Ontario?",
        answer:
          "London's strongest venues include riverside estates along the Thames, downtown hotels (especially those with rooftop or river views), and a half-dozen wineries and farms in the surrounding townships. Capacity typically 80-200 guests. London is a lower-cost alternative to the GTA for couples with extended family in Southwestern Ontario.",
      },
      {
        question: "How much do Southwestern Ontario wedding venues cost?",
        answer:
          "Southwestern Ontario runs 35-45% below GTA pricing. A 150-guest wedding (venue + catering, Saturday in June) typically lands between $9,000 and $14,000. The region offers some of the strongest value-per-dollar in Ontario for full-service venues.",
      },
      {
        question: "Are there winery wedding venues near Windsor or London?",
        answer:
          "Yes — Lake Erie North Shore (Kingsville, Harrow, Amherstburg) is Ontario's second wine region with several wineries hosting weddings. Pricing is meaningfully lower than Niagara for comparable vineyard atmosphere. Around London, smaller farm-wineries are emerging as wedding venues, often combining vineyard ceremony sites with restored barn receptions.",
      },
      {
        question: "Can you get married in Stratford during festival season?",
        answer:
          "Yes — Stratford hosts weddings year-round, with strong availability outside festival peak (avoid the first two weeks of August and Thanksgiving weekend if you want hotel availability for guests). Restored downtown theatres, historic inns, and waterfront ceremony sites along the Avon River all operate as wedding venues.",
      },
      {
        question: "What's the best time of year for a Southwestern Ontario wedding?",
        answer:
          "Late May through mid-September is reliable. Mid-October is excellent at winery venues with fall colour. Lake Erie shoreline venues stay warm into early October. Winter weddings work at hotels and indoor venues; outdoor venues largely close November through April.",
      },
    ],
    highlightTypes: [
      { label: "Wineries",   type: "winery" },
      { label: "Estates",    type: "estate" },
      { label: "Hotels",     type: "hotel" },
      { label: "Barns",      type: "barn" },
      { label: "Inns",       type: "inn" },
    ],
  },

  eastern: {
    image: "/images/venue-estate.png",
    intro:
      "Eastern Ontario covers Kingston, Ottawa, Belleville, Peterborough and the Thousand Islands corridor along the St. Lawrence. Kingston anchors the region with limestone heritage estates, waterfront hotels overlooking the islands, and Queen's University properties. The Thousand Islands offer dramatic riverfront ceremony sites and a small island-resort circuit. Ottawa contributes downtown hotels, Gatineau-adjacent country clubs, and the National Capital Region's heritage venues. Belleville and Prince Edward County (covered separately) add boutique inns and farm settings. Eastern Ontario benefits from rich historic-venue density (the region's 19th-century stone-building stock is denser than anywhere else in Ontario) and very strong value compared to the GTA. Peak rates June through September.",
    faqs: [
      {
        question: "Are there good wedding venues in Kingston, Ontario?",
        answer:
          "Yes — Kingston has unusually strong heritage venue density, with limestone estates dating to the 1800s, several waterfront properties looking out onto the Thousand Islands, and Queen's University facilities available for weddings. Capacity typically 80-200 guests at heritage estates; downtown hotels scale larger. Kingston is the strongest Eastern Ontario wedding destination after Ottawa.",
      },
      {
        question: "Can you get married on the Thousand Islands?",
        answer:
          "Several island and shoreline venues host weddings on the St. Lawrence River. Island venues require boat shuttles for guests — plan transportation logistics carefully. Shoreline venues in Gananoque, Brockville and Rockport offer riverfront ceremonies with island views and conventional road access. Season is short (May through early October).",
      },
      {
        question: "How much do Ottawa-area wedding venues cost?",
        answer:
          "Ottawa runs 15-25% below comparable Toronto pricing. A 150-guest wedding at an Ottawa hotel or country club (venue + catering, Saturday in June) typically lands between $14,000 and $20,000. Gatineau-side venues (across the Quebec border) can offer slight savings but require guest planning for the provincial crossing.",
      },
      {
        question: "What are historic wedding venues in Eastern Ontario?",
        answer:
          "Eastern Ontario has the province's highest concentration of pre-1900 stone heritage estates. Kingston, Brockville, Prescott and Cobourg all have multiple restored 19th-century properties operating as wedding venues. These typically combine indoor reception (often in a former great room) with formal-garden ceremony sites. Capacity 80-180 guests is typical.",
      },
      {
        question: "What's the best destination-wedding venue in Eastern Ontario?",
        answer:
          "Thousand Islands resort properties and Kingston waterfront hotels both work as destination weddings for couples with Toronto- or Montreal-based guests. Both cities are reachable by VIA Rail and have hotel inventory for out-of-town guests. Smaller boutique inns in the Loyalist countryside (Picton, Wellington — see Prince Edward County) round out the destination options.",
      },
    ],
    highlightTypes: [
      { label: "Estates",  type: "estate" },
      { label: "Hotels",   type: "hotel" },
      { label: "Inns",     type: "inn" },
      { label: "Resorts",  type: "resort" },
      { label: "Barns",    type: "barn" },
    ],
  },

  "prince-edward-county": {
    image: "/images/venue-winery.png",
    intro:
      "Prince Edward County — &ldquo;The County&rdquo; to locals — has emerged over the past 15 years as Ontario's most distinctive boutique wedding region. Centred on Picton, Bloomfield, Wellington and the surrounding Loyalist countryside, the County packs over 40 wineries, restored Victorian farmhouses, lakefront sand-dune properties on Sandbanks beach, and a rich restaurant scene into a 90-minute-drive island peninsula. Weddings here skew design-forward, food-focused, and intimate — most venues comfortably handle 60-120 guests rather than the 200+ scale of GTA banquet halls. The County is best reached from the GTA (2.5 hours), Kingston (75 minutes) or Ottawa (3 hours). Peak season runs May through October with prime dates booking 18+ months out.",
    faqs: [
      {
        question: "What are the best Prince Edward County wedding venues?",
        answer:
          "The County's strongest venues split between wineries (40+ in the region), restored Victorian farmhouses with attached event barns, and Sandbanks-adjacent lakefront properties. Most are owner-operated and offer high-personalization service. Capacity is typically smaller than other Ontario regions — 60-120 guests is the sweet spot.",
      },
      {
        question: "Are there winery wedding venues in Prince Edward County?",
        answer:
          "Yes — the County is Ontario's third wine region with over 40 wineries, many hosting weddings. PEC wineries differ from Niagara in scale (smaller, more boutique) and atmosphere (working-farm feel vs. estate-tasting-room). Pricing is generally comparable to mid-range Niagara wineries but with significantly more design and food-focus options.",
      },
      {
        question: "How much do Prince Edward County wedding venues cost?",
        answer:
          "PEC venues run comparable to Niagara — $6,000-$15,000 for venue + catering at 100-150 guests on a Saturday in September. Premier venues (lakefront properties, fully restored farmhouses) reach $20,000+ for peak Saturdays. Off-peak (May, October weekdays) brings 25-35% savings.",
      },
      {
        question: "Can guests stay overnight at Prince Edward County venues?",
        answer:
          "Most County venues offer on-site or adjacent accommodation — restored farmhouses with multiple guest rooms, winery-attached inns, and Airbnb cottage networks throughout Picton, Bloomfield and Wellington. Plan to book 12+ months ahead for peak summer; the County's accommodation inventory is small relative to demand.",
      },
      {
        question: "When is the best time of year for a Prince Edward County wedding?",
        answer:
          "September is the peak month — harvest atmosphere at wineries, reliable warm-but-not-hot weather, and dramatic farm-country light. June is the second peak. May and early October are excellent value alternatives. The County effectively closes for weddings November through April — most venues are seasonal.",
      },
    ],
    highlightTypes: [
      { label: "Wineries",  type: "winery" },
      { label: "Inns",      type: "inn" },
      { label: "Estates",   type: "estate" },
      { label: "Barns",     type: "barn" },
      { label: "Farms",     type: "farm" },
    ],
  },
};

export function getRegionContent(slug: string): RegionContent | undefined {
  return REGION_CONTENT[slug];
}
