# CLAUDE.md — Ontario Wedding Vendors Platform
## ontarioweddingvendors.com + Domain Network
## Tagline: "Find your perfect venue. Plan your perfect wedding."
## Last updated: May 2026

---

## Strategic Context

This is not just a venue directory. It is the central hub of a wedding media network
designed to dominate Ontario wedding search rankings, generate leads for Pic Booth
and OneQR, and monetize through featured vendor listings and lead generation.

**Core thesis (from Niagara Wedding Domination Strategy doc):**
No competitor in this market operates a photo booth business AND a regional wedding
directory network. That combination is the moat. Every directory property feeds
Pic Booth leads. Every Pic Booth event strengthens the directories.

**The platform has three interlocking layers:**
1. Venue + vendor directory (OntarioWeddingVendors.com — this project)
2. AI-powered wedding planner tool (couples plan their full wedding here)
3. Lead generation engine for Pic Booth, OneQR, and paying vendors

---

## Project Identity

- **Primary domain:** ontarioweddingvendors.com
- **Site name:** Ontario Wedding Vendors
- **Tagline:** Find your perfect venue. Plan your perfect wedding.
- **Repository:** github.com/frtaylorca-a11y/ontario-wedding-venues
- **Vercel scope:** pic-booth (same as Guest Gallery and OneQR)
- **Database:** Neon Postgres (new project: ontario-wedding-venues)
- **ORM:** Drizzle ORM
- **Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4

### Launch scope phasing
- **Phase 1 (launch):** Venues only — directory, individual venue pages,
  region/city pages, region cards, venue-type cards, AI planner mockup.
  Venues are the discovery entry point because they are the first decision
  every couple makes.
- **Phase 2 (post-launch):** Vendors — photographers, DJs, florists,
  photo booths (Pic Booth + Niagara Photo Booth), cake, hair/makeup,
  officiants. Vendor data already in schema; pages and outreach activate
  after venue traffic establishes.

---

## Domain Network Architecture

OntarioWeddingVendors.com is the data platform. All other owned domains
(niagaraweddingvenues.com, hamiltonweddingvenues.com, etc. — full list
below) 301-redirect into it or call its API. This is the hub.

### Tier 1 — Niagara (build first, already owned)
```
niagaraweddingvenues.com          → /regions/niagara
niagaraweddingdirectory.com       → /regions/niagara/vendors
niagaraonthelakeweddingvenues.com → /cities/niagara-on-the-lake
niagarafallsweddingvenues.com     → /cities/niagara-falls
stcatharinesweddingvenues.com     → /cities/st-catharines
niagaraweddingphotographers.com   → /regions/niagara/vendors/photographers
niagaraphotobooth.com             → standalone (budget photo booth brand)
```

### Tier 2 — Golden Horseshoe (already owned)
```
hamiltonweddingvenues.com         → /cities/hamilton
hamiltonweddingdirectory.com      → /cities/hamilton/vendors
burlingtonweddingvenues.com       → /cities/burlington
oakvilleweddingvenues.com         → /cities/oakville
```

### Tier 3 — GTA (owned, build after Niagara ranking)
```
torontoweddingvenues.com          → /cities/toronto (Year 2 only)
```

**All redirects are 301 — pass full SEO authority to OntarioWeddingVendors.com.**
**NiagaraWeddingVenues.com is the most important redirect — highest domain authority.**

### Sub-site pattern for lightweight city sites (Hostinger)
City-specific domains can also run as separate Next.js static exports
that call the OntarioWeddingVendors.com API:
```
GET /api/venues?region=niagara
GET /api/vendors?region=niagara&category=photographer
```
This lets NiagaraWeddingVenues.com have its own branding and content
while pulling live data from the central database. One database, unlimited sites.

---

## Design System — "The Niagara Edit"

### Colours
```css
--owv-rose:        #B96476;   /* dusty rose — primary CTA */
--owv-rose-light:  #D4899A;   /* hover states */
--owv-rose-pale:   #FDF5F7;   /* card backgrounds */
--owv-charcoal:    #2C2C2C;   /* headings, body text */
--owv-warm-grey:   #6B6B6B;   /* secondary text */
--owv-border:      #E8D5D9;   /* card borders, dividers */
--owv-white:       #FFFFFF;
--owv-cream:       #FAF7F2;   /* page background */
--owv-emerald:     #059669;   /* Premier badge */
--owv-blue:        #2563EB;   /* Active badge */
--owv-amber:       #D97706;   /* Listed badge */
```

### Typography
- **Display/headings:** Cormorant Garamond (Google Fonts)
- **Body/UI:** Inter (Google Fonts)

### Score badges
```
90+  → bg-emerald-100 text-emerald-800  "Premier"
70–89 → bg-blue-100 text-blue-800       "Active"
50–69 → bg-amber-100 text-amber-800     "Listed"
<50  → hidden from public display
```

### Component conventions
- Card: `rounded-2xl shadow-sm hover:shadow-md transition-shadow`
- Button primary: rose bg, white text, `rounded-full px-6 py-3`
- Button secondary: white bg, rose border + text, `rounded-full`
- Pill/badge: `rounded-full px-3 py-1 text-xs font-medium`

---

## Geographic Zone Logic

The zone determines which Pic Booth / OneQR products are featured.

```typescript
// src/lib/zones.ts

export type Zone = 'niagara-gta' | 'ontario'

const NIAGARA_GTA_REGIONS = ['niagara', 'gta', 'golden-horseshoe']

export function getZone(region: string): Zone {
  return NIAGARA_GTA_REGIONS.includes(region) ? 'niagara-gta' : 'ontario'
}

// Zone: niagara-gta
//   Photo booth category → Pic Booth FEATURED (pinned top)
//   Venue pages → Pic Booth contextual mention if venue is compatible
//   Budget planner → Pic Booth recommended for photo booth category
//   OneQR → shown as "digital guest experience" add-on

// Zone: ontario (outside Niagara/GTA)
//   Photo booth category → local vendors (no Pic Booth — they don't serve here)
//   OneQR → shown as venue technology on ALL venue pages province-wide
//   Budget planner → local photo booth vendors shown, OneQR promoted
```

### Pic Booth appearance rules (from strategy doc)
The editorial test: "Would this mention make sense if Pic Booth were a competitor's
business?" If yes — it's genuine editorial. If no — it's an ad in disguise.
Only publish mentions that pass this test.

| Page type | Placement |
|-----------|-----------|
| Venue page (Zone: niagara-gta, compatible) | Body copy only — venue-specific context |
| Category page (outdoor/winery) | Editorial advice paragraph |
| Blog post | Natural recommendation in vendor context |
| Vendor listing | Standard entry alongside real competitors |
| Budget planner | Recommended vendor for photo booth category |

### Two-brand photo booth strategy
- **Pic Booth** (picbooth.ca) — premium, JUNO Awards, editorial voice
- **Niagara Photo Booth** (niagaraphotobooth.com) — budget tier, separate brand
- Both listed as separate vendors in the directory — no visual distinction
- Pic Booth pinned as Featured. Niagara Photo Booth listed normally.
- niagaraphotobooth.com has NO mention of Pic Booth — full separation

### OneQR placement
- Every venue page across ALL Ontario: "Ask about OneQR digital guest experience"
- Venue coordinator outreach: OneQR as their platform, not just a rental
- Vendors section: OneQR as recommended event tech for venues
- UTM: `utm_source=owv&utm_medium=venue-page&utm_campaign=oneqr-upsell`

---

## Database Schema

### venues table
```typescript
export const venues = pgTable('venues', {
  id:                    serial('id').primaryKey(),
  placeId:               varchar('place_id', { length: 255 }).unique(),
  slug:                  varchar('slug', { length: 255 }).unique().notNull(),
  name:                  varchar('name', { length: 255 }).notNull(),
  address:               text('address'),
  city:                  varchar('city', { length: 100 }),
  region:                varchar('region', { length: 100 }),
  province:              varchar('province', { length: 10 }).default('ON'),
  postalCode:            varchar('postal_code', { length: 10 }),
  phone:                 varchar('phone', { length: 50 }),
  website:               varchar('website', { length: 500 }),
  email:                 varchar('email', { length: 255 }),
  category:              varchar('category', { length: 100 }),
  venueType:             varchar('venue_type', { length: 100 }),
  capacityMin:           integer('capacity_min'),
  capacityMax:           integer('capacity_max'),
  coordinatorName:       varchar('coordinator_name', { length: 255 }),
  coordinatorEmail:      varchar('coordinator_email', { length: 255 }),
  coordinatorPhone:      varchar('coordinator_phone', { length: 50 }),
  catering:              varchar('catering', { length: 100 }),
  accommodations:        varchar('accommodations', { length: 50 }),
  indoorOutdoor:         varchar('indoor_outdoor', { length: 50 }),
  hasWeddingsPage:       varchar('has_weddings_page', { length: 10 }),
  weddingsPageUrl:       varchar('weddings_page_url', { length: 500 }),
  hasPackages:           varchar('has_packages', { length: 10 }),
  packages:              text('packages'),
  hasPricing:            varchar('has_pricing', { length: 10 }),
  hasTestimonials:       varchar('has_testimonials', { length: 10 }),
  bookingPlatform:       varchar('booking_platform', { length: 100 }),
  instagramHandle:       varchar('instagram_handle', { length: 100 }),
  googleRating:          numeric('google_rating', { precision: 3, scale: 1 }),
  reviewCount:           integer('review_count'),
  googleClosed:          varchar('google_closed', { length: 10 }).default('no'),
  weddingReadinessScore: integer('wedding_readiness_score'),
  scoreReasoning:        text('score_reasoning'),
  description:           text('description'),
  picBoothCompatible:    boolean('pic_booth_compatible').default(false),
  lat:                   numeric('lat', { precision: 10, scale: 7 }),
  lng:                   numeric('lng', { precision: 10, scale: 7 }),
  tier:                  varchar('tier', { length: 20 }).default('free'),
  claimed:               boolean('claimed').default(false),
  verified:              boolean('verified').default(false),
  featured:              boolean('featured').default(false),
  websiteStatus:         varchar('website_status', { length: 50 }),
  lastGoogleSync:        timestamp('last_google_sync'),
  lastWebsiteCheck:      timestamp('last_website_check'),
  lastVerified:          timestamp('last_verified'),
  source:                varchar('source', { length: 100 }),
  createdAt:             timestamp('created_at').defaultNow(),
  updatedAt:             timestamp('updated_at').defaultNow(),
})
```

### vendors table
```typescript
export const vendors = pgTable('vendors', {
  id:               serial('id').primaryKey(),
  placeId:          varchar('place_id', { length: 255 }).unique(),
  slug:             varchar('slug', { length: 255 }).unique().notNull(),
  name:             varchar('name', { length: 255 }).notNull(),
  category:         varchar('category', { length: 100 }).notNull(),
  // Categories: photographer, videographer, dj, florist, photo_booth,
  // catering, cake, hair_makeup, officiant, limo
  city:             varchar('city', { length: 100 }),
  region:           varchar('region', { length: 100 }),
  province:         varchar('province', { length: 10 }).default('ON'),
  address:          text('address'),
  phone:            varchar('phone', { length: 50 }),
  website:          varchar('website', { length: 500 }),
  email:            varchar('email', { length: 255 }),
  instagramHandle:  varchar('instagram_handle', { length: 100 }),
  googleRating:     numeric('google_rating', { precision: 3, scale: 1 }),
  reviewCount:      integer('review_count'),
  googleClosed:     varchar('google_closed', { length: 10 }).default('no'),
  priceTier:        varchar('price_tier', { length: 20 }),
  priceFrom:        integer('price_from'),
  priceTo:          integer('price_to'),
  description:      text('description'),
  lat:              numeric('lat', { precision: 10, scale: 7 }),
  lng:              numeric('lng', { precision: 10, scale: 7 }),
  serveRadiusKm:    integer('serve_radius_km').default(100),
  tier:             varchar('tier', { length: 20 }).default('free'),
  claimed:          boolean('claimed').default(false),
  verified:         boolean('verified').default(false),
  featured:         boolean('featured').default(false),
  isPicBooth:       boolean('is_pic_booth').default(false),
  isNiagaraPhotoBooth: boolean('is_niagara_photo_booth').default(false),
  isOneQR:          boolean('is_oneqr').default(false),
  source:           varchar('source', { length: 100 }),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
})
```

### weddingPlans table (AI Wedding Planner)
```typescript
export const weddingPlans = pgTable('wedding_plans', {
  id:                 serial('id').primaryKey(),
  coupleId:           varchar('couple_id', { length: 255 }).unique(),
  brideName:          varchar('bride_name', { length: 100 }),
  groomName:          varchar('groom_name', { length: 100 }),
  weddingDate:        date('wedding_date'),
  totalBudget:        integer('total_budget'),
  venueId:            integer('venue_id').references(() => venues.id),
  guestCount:         integer('guest_count'),
  region:             varchar('region', { length: 100 }),
  style:              varchar('style', { length: 50 }), // intimate, standard, luxury
  budgetAllocations:  jsonb('budget_allocations'),   // Claude AI allocations
  bookedVendors:      jsonb('booked_vendors'),        // [{vendorId, category, amount}]
  tasks:              jsonb('tasks'),                 // [{title, dueDate, done, assignee}]
  guests:             jsonb('guests'),                // [{name, rsvp, dietary, table}]
  itinerary:          jsonb('itinerary'),             // [{time, event, notes}]
  packingList:        jsonb('packing_list'),
  musicList:          jsonb('music_list'),
  notes:              text('notes'),
  createdAt:          timestamp('created_at').defaultNow(),
  updatedAt:          timestamp('updated_at').defaultNow(),
})
```

---

## Project Structure

```
ontario-wedding-venues/
├── CLAUDE.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── .env.local              ← never commit
├── .env.example
├── .gitignore
│
├── src/
│   ├── app/
│   │   ├── globals.css         ← design tokens
│   │   ├── layout.tsx          ← root layout, fonts, nav
│   │   ├── page.tsx            ← homepage
│   │   ├── sitemap.ts          ← auto-generated from DB
│   │   ├── robots.ts
│   │   │
│   │   ├── venues/
│   │   │   ├── page.tsx        ← listing + filter
│   │   │   └── [slug]/page.tsx ← individual venue
│   │   │
│   │   ├── regions/
│   │   │   └── [region]/page.tsx
│   │   │
│   │   ├── cities/
│   │   │   └── [city]/page.tsx
│   │   │
│   │   ├── vendors/
│   │   │   ├── page.tsx
│   │   │   └── [category]/page.tsx
│   │   │
│   │   ├── plan/
│   │   │   └── page.tsx        ← AI wedding planner
│   │   │
│   │   ├── blog/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   │
│   │   └── api/
│   │       ├── venues/
│   │       │   ├── route.ts    ← GET /api/venues
│   │       │   └── [slug]/route.ts
│   │       ├── vendors/route.ts
│   │       └── plan/
│   │           ├── route.ts    ← POST /api/plan (Claude AI allocator)
│   │           └── [id]/route.ts
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── VenueCard.tsx
│   │   │   ├── VendorCard.tsx
│   │   │   ├── ScoreBadge.tsx
│   │   │   ├── RatingStars.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── MapEmbed.tsx
│   │   │   └── PicBoothCTA.tsx  ← contextual, zone-aware
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx       ← includes disclosure line
│   │   │   └── Nav.tsx
│   │   ├── seo/
│   │   │   └── SchemaInjector.tsx ← auto-generates JSON-LD
│   │   └── features/
│   │       ├── BudgetPlanner.tsx
│   │       ├── VenueGrid.tsx
│   │       ├── VendorGrid.tsx
│   │       └── WeddingPlanDashboard.tsx
│   │
│   ├── lib/
│   │   ├── db.ts               ← Neon + Drizzle client
│   │   ├── schema.ts           ← all table definitions
│   │   ├── queries.ts          ← reusable DB queries
│   │   ├── regions.ts          ← city → region mapping
│   │   ├── zones.ts            ← geographic zone logic
│   │   ├── budget.ts           ← Ontario pricing benchmarks
│   │   └── utils.ts            ← slug generation, formatting
│   │
│   └── types/index.ts
│
└── scripts/
    ├── import-venues.ts        ← imports directory_ready.csv
    ├── import-vendors.ts       ← imports vendor data
    └── generate-slugs.ts
```

---

## Environment Variables

```bash
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_PLACES_API_KEY=AIza...
NEXT_PUBLIC_SITE_URL=https://ontarioweddingvendors.com
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...
```

---

## Region Mapping

```typescript
// src/lib/regions.ts
export const REGION_MAP: Record<string, string> = {
  // Niagara
  'niagara-on-the-lake': 'niagara', 'niagara-falls': 'niagara',
  'st-catharines': 'niagara', 'lincoln': 'niagara', 'grimsby': 'niagara',
  'welland': 'niagara', 'thorold': 'niagara', 'pelham': 'niagara',
  'fort-erie': 'niagara', 'port-colborne': 'niagara', 'wainfleet': 'niagara',
  'beamsville': 'niagara', 'jordan': 'niagara', 'vineland': 'niagara',
  'fonthill': 'niagara', 'queenston': 'niagara', 'st-davids': 'niagara',
  // Hamilton / Burlington
  'hamilton': 'golden-horseshoe', 'burlington': 'golden-horseshoe',
  'oakville': 'golden-horseshoe', 'milton': 'golden-horseshoe',
  'ancaster': 'golden-horseshoe', 'waterdown': 'golden-horseshoe',
  // GTA
  'toronto': 'gta', 'mississauga': 'gta', 'brampton': 'gta',
  'vaughan': 'gta', 'markham': 'gta', 'richmond-hill': 'gta',
  'newmarket': 'gta', 'aurora': 'gta', 'ajax': 'gta', 'whitby': 'gta',
  'oshawa': 'gta', 'pickering': 'gta', 'king-city': 'gta',
  'caledon': 'gta', 'halton-hills': 'gta',
  // Muskoka / Cottage Country
  'barrie': 'cottage-country', 'collingwood': 'cottage-country',
  'wasaga-beach': 'cottage-country', 'orillia': 'cottage-country',
  'gravenhurst': 'cottage-country', 'huntsville': 'cottage-country',
  'bracebridge': 'cottage-country', 'midland': 'cottage-country',
  // Waterloo Region
  'kitchener': 'waterloo-region', 'waterloo': 'waterloo-region',
  'cambridge': 'waterloo-region', 'guelph': 'waterloo-region',
  'fergus': 'waterloo-region', 'elora': 'waterloo-region',
  // Southwestern Ontario
  'london': 'southwestern', 'windsor': 'southwestern',
  'chatham': 'southwestern', 'stratford': 'southwestern',
  'woodstock': 'southwestern', 'brantford': 'southwestern',
  'sarnia': 'southwestern',
  // Eastern Ontario
  'ottawa': 'eastern', 'kingston': 'eastern', 'belleville': 'eastern',
  'cobourg': 'eastern', 'peterborough': 'eastern', 'brockville': 'eastern',
  // Prince Edward County
  'picton': 'prince-edward-county', 'bloomfield': 'prince-edward-county',
}

export const REGIONS = [
  { slug: 'niagara',              label: 'Niagara',               featured: true },
  { slug: 'gta',                  label: 'Greater Toronto Area',  featured: true },
  { slug: 'golden-horseshoe',     label: 'Hamilton & Burlington', featured: true },
  { slug: 'cottage-country',      label: 'Muskoka & Cottage Country', featured: true },
  { slug: 'waterloo-region',      label: 'Waterloo Region',       featured: false },
  { slug: 'southwestern',         label: 'Southwestern Ontario',  featured: false },
  { slug: 'eastern',              label: 'Eastern Ontario',       featured: false },
  { slug: 'prince-edward-county', label: 'Prince Edward County',  featured: false },
]
```

---

## API Routes

### GET /api/venues
Params: `region`, `city`, `type`, `indoor`, `catering`, `capacity`,
`score` (default: 50 min), `sort` (score/rating/reviews/capacity),
`limit` (default 20), `offset`

Returns: `{ venues: Venue[], total: number }`

Used by: venue listing page, sub-site city domains (NiagaraWeddingVenues.com etc.)

### GET /api/vendors
Params: `region`, `city`, `category`, `lat`, `lng`, `radiusKm`, `limit`, `offset`

Returns: `{ vendors: Vendor[] }` — sorted by proximity when lat/lng provided

### POST /api/plan
Body: `{ budget, guestCount, venueId, region, style }`

Calls Claude API to generate budget allocation across wedding categories.
Returns Ontario-realistic pricing with specific vendor recommendations.

---

## UX Decisions (from competitive analysis — apply to all pages)

### Icons — custom SVG only
NO emoji. NO icon font libraries. All venue type icons are custom SVG.
Stroke width: 1.5px. Stroke-linecap: round. Stroke-linejoin: round.
Fill: none. Size in pills: 15×15px. Size in category cards: 22×22px.

Approved icon paths:
- Winery: wine glass with stem (path: cup shape + stem + base line)
- Estate: manor house (path: peaked roof house with windows and door)
- Outdoor: mountain silhouette (path: triangle peaks + sun circle)
- Hotel: building with floors (path: rect with horizontal lines + windows)
- Barn: barn roofline (path: angled roof + vertical walls + door arch)
- Golf club: flag on green (path: vertical pole + flag + ellipse base)
- Conservation: leaf/nature (path: teardrop leaf + center stem)
- Intimate: heart (path: standard heart SVG path)

### Venue cards — required elements
Every VenueCard must include ALL of these:
1. Venue type + region as category label (rose, uppercase, 0.65rem)
2. Venue name (Cormorant Garamond, 1.1rem, charcoal)
3. City/location (muted, 0.72rem)
4. Detail chips: capacity · catering type · indoor/outdoor
   (bg-soft background, border, pill shape, 0.63rem)
5. Google rating stars + review count
6. "Verified [Month Year]" badge in green
7. Heart/save icon (top right of image area, or bottom of card)
8. Score badge: Premier (90+) / Active (70–89) / Listed (50–69)
9. "View venue →" CTA link

### Homepage funnel logic
Directory → Planner conversion happens at the heart/save icon.
When unauthenticated user clicks heart:
  → Modal: "Save this venue to your wedding plan"
  → Google sign-in or email sign-up
  → On success: redirect to /plan with venue pre-loaded
  → Planning dashboard opens with venue locked in

When authenticated user clicks heart:
  → Venue saved instantly
  → Toast: "Saved to your wedding plan →" (links to /plan)

### Budget slider (Section 6)
Built as a client component with useState.
Uses ONTARIO_BUDGET_SPLITS from src/lib/budget.ts.
No API call needed — pure frontend calculation.
Shows category breakdown as percentage pills, not a chart (MVP).
Updates in real time as slider moves.
CTA text updates dynamically: "See venues under $[venue_budget] →"

## SEO Architecture

### Page types and targets (from SEO Playbook + Strategy doc)

**Homepage** → "Ontario wedding venues", "wedding venues Ontario"

### Positioning statement (use throughout site and marketing)
"Find your perfect venue. Plan your perfect wedding."
The venue is the first decision every couple makes. Everything else —
budget, vendors, guest list, timeline — flows from that choice.
OntarioWeddingVendors.com is the only Ontario platform that connects
the venue search directly to a full AI-powered wedding planner.

### Hero copy (exact)
H1 line 1: "Find your perfect venue."
H1 line 2 (rose italic): "Plan your perfect wedding."
Subheading: "Ontario's most complete wedding venue directory — with an
AI planning tool that builds your entire wedding around the venue you choose."
Primary CTA: "Find my venue →"
Secondary CTA: "See how it works" (smooth scrolls to bridge section)

### Homepage section order (7 sections)

**Section 1 — Nav + Trust bar + Hero (keep, no changes)**
- Sticky nav: logo + links + "Sign in" + "Start planning" CTA
- Black trust bar: "1,280+ venues · 76 premier listings · Google-verified · Updated every 60 days"
- Hero: H1 + subheading + search bar + quick-filter type pills
- Search bar has region dropdown (defaults to Niagara)
- Type filter pills: Winery · Estate · Outdoor · Hotel · Barn · Golf Club · Conservation · Intimate
- All pills use custom SVG icons — NO emoji, NO icon fonts

**Section 2 — Featured venues grid (modified)**
- Top 6 venues by score + reviews, Niagara weighted
- Each VenueCard has:
  - Venue type badge (top left) + Score badge (top right)
  - Detail chips: capacity · catering · indoor/outdoor
  - Google rating + review count + "Powered by Google"
  - "Verified [Month Year]" badge in green
  - Heart/save icon — clicking triggers account creation modal
    with venue pre-loaded into planning dashboard
- Heart save is the primary conversion point from directory → planner

**Section 3 — "Find your venue. Plan your wedding." bridge (NEW)**
- Two-column layout:
  - Left: planning dashboard preview mockup (venue locked in,
    budget donut chart, vendor matches shown)
  - Right: copy block
    Eyebrow: "More than a directory"
    H2: "Your venue unlocks your entire wedding plan"
    Body: "Pick any venue on OntarioWeddingVendors.com and our AI
    planner instantly allocates your budget, matches vendors within
    driving distance, and builds your full wedding timeline — all
    in one place."
    Feature list (3 items with SVG icons):
      → AI budget allocation based on Ontario pricing
      → Vendors matched by proximity to your venue
      → Guest list, seating, timeline and day-of itinerary
    CTA: "Start with a venue →" (scrolls to Section 2)
- Background: --bg-warm (#F8F4F1) to visually separate from white sections
- This section is NOT indexed for SEO — it introduces the product

**Section 4 — Browse by region (keep, no changes)**
- 4 featured region cards: Niagara · GTA · Muskoka · Hamilton
- SEO-critical — do not add planner messaging here
- Clean card grid, links to /regions/[slug]

**Section 5 — Browse by venue type (keep, no changes)**
- 8 category cards with SVG icons (approved icon set)
- Winery featured/highlighted in rose
- Links to /venues/[type]
- SEO-critical — pure directory content

**Section 6 — Interactive budget slider (NEW — replaces generic CTA)**
- Live budget allocation widget (no sign-up required)
- Couple drags total budget slider ($10k → $100k)
- Donut chart updates in real time showing category allocations
- Uses ONTARIO_BUDGET_SPLITS from src/lib/budget.ts
- Shows: "Your venue budget: $X,XXX — see venues in this range →"
- CTA links to /venues?maxPrice=[calculated]
- Cashvertising: reciprocity — give value before asking anything
- Background: --rose-pale (#FDF5F7)

**Section 7 — Lead magnet + Footer**
- Email capture: "Free: Ontario Wedding Checklist 2026 — 100+ tasks,
  timeline, and vendor guide"
- Brevo opt-in form (same list as Pic Booth nurture sequence)
- Every subscriber enters Pic Booth Checklist Download nurture sequence
- Footer below with disclosure line

**Region pages** `/regions/[region]` → "[region] wedding venues Ontario"
- 200-word locally-specific intro
- Venue grid with filter
- "Why couples choose [region]" section
- Featured vendors in region

**City pages** `/cities/[city]` → "wedding venues in [city] Ontario"
- City-specific content — WeddingWire is weakest here
- Your structured data (capacity, catering, coordinator) beats their thin pages

**Venue type category pages** `/venues/winery`, `/venues/barn` etc.
→ "winery wedding venues Ontario", "barn wedding venues Ontario"
- 800–1,000 word editorial above venue grid (from SEO templates doc)
- Tips for choosing this venue type
- Ontario pricing expectations

**Individual venue pages** `/venues/[slug]`
→ "[venue name] wedding venue [city]"
- All structured data: capacity, catering, coordinator, score, last verified
- PicBoothCTA component if `picBoothCompatible: true` and zone = niagara-gta
- JSON-LD: LocalBusiness + EventVenue schema
- "Powered by Google" attribution on ratings
- Nearby vendors (filtered by proximity via lat/lng)
- OneQR mention on all venue pages regardless of zone

**Blog** `/blog/[slug]` — topical authority + long-tail capture

### Launch blog posts (Month 1–2, from strategy doc)
All 10 posts target Niagara first — then expand to Ontario:

1. How Much Do Wedding Venues Cost in Niagara? (2026 Guide)
2. Best Months to Get Married in Niagara
3. Winery Weddings in Niagara: What You Need to Know
4. Outdoor Wedding Venues in Niagara: 8 Things to Check
5. Small Wedding Venues in Niagara (Under 50 Guests)
6. Niagara-on-the-Lake vs Niagara Falls: Which Is Better for Weddings?
7. Hidden Gem Wedding Venues in Niagara
8. How Far in Advance to Book a Niagara Wedding Venue?
9. Niagara Wedding Venue Checklist: 15 Questions to Ask
10. Best Niagara Wedding Vendors to Book Alongside Your Venue
    ← Feature 10 vendors. Email all on publish day. Primary backlink strategy.

### Schema Injector component
Auto-generates JSON-LD from page data — never write schema manually.

| Page type     | Schema type                    |
|---------------|-------------------------------|
| Homepage      | ItemList                       |
| Venue page    | LocalBusiness + EventVenue     |
| Category page | CollectionPage                 |
| Region page   | CollectionPage                 |
| Blog post     | Article                        |
| Vendor listing| LocalBusiness                  |

### GSC setup
All .com domains: set geographic target → Canada in GSC Legacy Tools →
International Targeting. Neutralizes .ca advantage without buying new domains.

---

## Internal Linking Rules (from strategy doc — non-negotiable)

- Maximum 1 cross-domain link per page
- Contextual only — body copy, never sidebars or footer link farms
- Geographic logic required — only link nearby cities
- Rotate directions — avoid reciprocal patterns on same page types
- Natural anchor text only — never exact-match keyword anchors
- No link lists between network properties

**Correct cross-link example:**
"If your guest list includes family from Hamilton, you may also want to
browse Hamilton wedding venues for a comparison." — geographic context,
helpful framing, single link, natural anchor.

---

## AI Wedding Planner

### What it replicates from the Excel Wedding Planner (uploaded)
The planner has 20 tabs. Build in phases:

**Phase 1 — Launch (MVP)**
- Dashboard: countdown, budget overview, venue + vendor status
- Budget planner: categories vs actual, transaction tracker
- Venue selector: filtered from database by budget allocation
- Vendor selector: matched by category, proximity, price tier
- Task timeline: due dates, responsible person, priority

**Phase 2 — Stickiness**
- Guest list + RSVP portal (unique URL per couple)
- Seating plan (visual drag-and-drop)
- Day-of itinerary hour by hour
- Email reminders for upcoming tasks

**Phase 3 — Delight (premium justification)**
- Music playlist
- Mood board / theme builder
- Gifts + thank you tracker
- Packing lists (bride + groom)
- Honeymoon budget
- Printable menu generator

### Ontario pricing benchmarks (src/lib/budget.ts)
Used by Claude API budget allocator:

```typescript
export const ONTARIO_BUDGET_SPLITS = {
  venue_catering: { pct: 0.38, label: 'Venue & Catering' },
  photography:    { pct: 0.11, label: 'Photography & Video' },
  florals:        { pct: 0.09, label: 'Flowers & Décor' },
  music:          { pct: 0.06, label: 'DJ or Band' },
  photo_booth:    { pct: 0.025, label: 'Photo Booth' },
  cake:           { pct: 0.025, label: 'Wedding Cake' },
  hair_makeup:    { pct: 0.025, label: 'Hair & Makeup' },
  officiant:      { pct: 0.015, label: 'Officiant' },
  transportation: { pct: 0.02,  label: 'Transportation' },
  attire:         { pct: 0.05,  label: 'Attire (not tracked)' },
  misc:           { pct: 0.075, label: 'Miscellaneous / Buffer' },
}

export const NIAGARA_PRICE_RANGES = {
  venue:        { budget: 3000,  mid: 7000,  premium: 15000 },
  photography:  { budget: 2000,  mid: 3500,  premium: 6000  },
  dj:           { budget: 1200,  mid: 1800,  premium: 3000  },
  florals:      { budget: 1500,  mid: 3000,  premium: 6000  },
  photo_booth:  { budget: 800,   mid: 1200,  premium: 1800  },
  cake:         { budget: 400,   mid: 800,   premium: 1500  },
  hair_makeup:  { budget: 600,   mid: 1000,  premium: 1800  },
  officiant:    { budget: 300,   mid: 500,   premium: 800   },
}
```

### Claude API budget allocator prompt pattern
```
POST /api/plan
→ Sends to claude-sonnet-4-5:
   - Couple budget, guest count, venue cost locked in
   - Remaining budget to allocate
   - Region (for Ontario-specific pricing)
   - Style preference (intimate/standard/luxury)
→ Claude returns JSON:
   - Recommended allocation per category
   - Reasoning for each allocation
   - Specific vendor recommendations from database
   - Flags if any category is underfunded for guest count
```

---

## Monetization (from strategy doc)

### Tiers
| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | Basic listing, verified badge, Google data |
| Featured | $75–150/mo | Top of category, contact form, analytics, inquiry leads |
| Premier | $200+/mo | Featured + blog mention + budget planner recommendation |

### Vendor funnel (3 stages)
**Stage 1 — Discovery:** Vendor appears in database automatically.
Some will find and claim their listing.

**Stage 2 — Featured listing:** Outreach email:
"You're listed on OntarioWeddingVendors.com — [X] profile views last month.
Upgrade to Featured for $99/month to appear at the top of searches in your area."

**Stage 3 — OneQR upsell:**
"Your couples are planning weddings on our platform. OneQR lets you offer
a live photo gallery, digital seating chart, and day itinerary from a single
QR code. It differentiates your venue and gives couples a reason to book you."

### UTM tracking
```
Pic Booth referrals:
  utm_source=owv&utm_medium=vendor-listing&utm_campaign=niagara-planner
  utm_content=photo-booth-{venueSlug}

OneQR referrals:
  utm_source=owv&utm_medium=venue-page&utm_campaign=oneqr-upsell
  utm_content={venueSlug}

Featured venue leads:
  utm_source=owv&utm_medium=featured&utm_campaign=venue-lead
```

### Revenue targets (from strategy doc)
- Month 3: first 3–5 featured venues at $75–150/mo (manual invoicing)
- Month 4+: Stripe/PayPal self-serve, expand to photographers
- Year 1 target: 50 featured venues + 100 featured vendors = ~$12,500/mo

---

## Backlink Strategy (from strategy doc)

**Tier 1 — Easy wins (start immediately):**
Email every venue listed: "You're featured on OntarioWeddingVendors.com.
Would you like to add your listing to your Preferred Vendors page?"

**Tier 2 — Partnership plays:**
- Wedding photographers: free featured spotlight page → link from their Resources
- Wedding planners: same — they influence every vendor booking
- Venue coordinators: relationship = dozens of warm referrals

**Tier 3 — Content-driven:**
- Blog post #10 (10 vendors featured) → email all on publish day
- Pitch "Best Winery Wedding Venues Niagara" to wine tourism publications
- Local Niagara lifestyle sites: pitch complete local wedding guide

**Outreach script (from SEO Playbook doc):**
Subject: Feature your venue on OntarioWeddingVendors.com
"Hi [Name], we've featured your venue in our guide. Would love to send
traffic your way — feel free to link back or share!"

---

## Footer Disclosure (required on all pages)

"Some vendors listed on this site have a relationship with the site operator."
— Standard practice, protects legally, increases trust. Does not hurt conversions.

---

## Slug Generation

```typescript
export function generateSlug(name: string, city: string): string {
  const n = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  const c = city.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-')
  return `${n}-${c}`
}
// "White Oaks Resort & Spa" + "Niagara-on-the-Lake"
// → "white-oaks-resort-spa-niagara-on-the-lake"
```

---

## Import Scripts

### scripts/import-venues.ts
Reads: `C:\Users\rtayl\OneDrive\Desktop\ontario-venues-omen\data\validated\directory_ready.csv`
- Generates slugs
- Maps city → region via REGION_MAP
- Sets picBoothCompatible based on zone + venue type
- Upserts to Neon on place_id conflict
- Reports: inserted, updated, skipped

Run: `npx tsx scripts/import-venues.ts`

### scripts/import-vendors.ts
Reads vendor CSVs from the ontario-venues-omen data folder.
Sets isPicBooth, isNiagaraPhotoBooth, isOneQR flags.
Pic Booth record: `tier: 'premier', featured: true, isPicBooth: true, serveRadiusKm: 200`

---

## Build Commands

```bash
npm run dev           # local development
npm run build         # production build
npm run db:generate   # generate Drizzle migrations
npm run db:migrate    # run migrations on Neon
npm run db:seed       # run import scripts
npm run db:studio     # Drizzle Studio
```

---

## Deployment

- GitHub: `frtaylorca-a11y/ontario-wedding-venues`
- Vercel: `ontario-wedding-venues` under `pic-booth` scope
- Auto-deploy on push to main
- env vars set in Vercel dashboard

Domain routing:
- `ontarioweddingvendors.com` → Vercel (primary)
- `niagaraweddingvenues.com` → 301 → ontarioweddingvendors.com/regions/niagara
- `hamiltonweddingvenues.com` → 301 → ontarioweddingvendors.com/cities/hamilton
- All other owned domains → 301 to appropriate regional/city page

---

## 90-Day Execution Plan (from strategy doc)

### Month 1 — Build the machine
- Week 1: Scaffold project, Neon setup, import 639 venue records
- Week 1: Set GSC geotargeting to Canada for all domains
- Week 2: Homepage, 4 region pages, SchemaInjector
- Week 3: Venue listing + individual venue pages, 2 blog posts
- Week 4: Category pages (winery, outdoor, affordable, luxury, small), sitemap

### Month 2 — Fill the tank
- Week 5: City pages (NOTL, Niagara Falls, St. Catharines, Hamilton, Toronto)
- Week 5: Begin venue outreach for backlinks (10 emails/week)
- Week 6: 3 more blog posts, blog post #10 published → email all vendors
- Week 7: Vendor pages live (photographer, DJ, florist, photo booth per region)
- Week 8: GSC review — identify early ranking pages, optimise

### Month 3 — Expand and monetize
- Budget planner Phase 1 live (Claude API budget allocator)
- First 3–5 featured listing revenue ($75–150/mo, manual invoicing)
- Vendor outreach: "47 profile views last month — upgrade to Featured"
- OneQR venue outreach begins: "ask about digital guest experience"

---

## Notes

- Scores below 50 NOT shown publicly — admin only
- "Powered by Google" attribution required wherever ratings displayed
- Google Maps embed (iframe): no API key needed, unlimited
- Coordinator emails shown via contact form — not raw mailto (spam prevention)
- picBoothCompatible auto-set true for: zone=niagara-gta AND
  venue type in [winery, estate, hotel, resort, barn, golf club]
  AND capacityMax >= 50 AND weddingReadinessScore >= 70
- All venue data sourced from Google Places API under standard ToS

---

## Wedding Website DNS Setup (manual — Rick)

Couple wedding websites live at `[slug].{regional-domain}` and are served
by OWV via a Next.js middleware rewrite to `/weddings/[slug]`. To stand up
a new regional domain:

**1. Hostinger — wildcard CNAME on each domain:**
```
Type: CNAME    Host: *    Value: cname.vercel-dns.com
```
Domains to configure:
- `*.niagaraweddingvenues.com`
- `*.niagaraonthelakeweddingvenues.com`
- `*.burlingtonweddingvenues.com`
- `*.torontoweddingdirectory.com`

**2. Vercel → ontario-wedding-vendors project → Settings → Domains:**
Add each wildcard domain (`*.niagaraweddingvenues.com`, etc.). Vercel
auto-provisions SSL certificates for the wildcard.

**3. Verify:**
```bash
curl -H "Host: test-couple.niagaraweddingvenues.com" https://ontarioweddingvendors.com/
# → renders the /weddings/test-couple page if the slug exists, else 404.
```

The regional-domain map is defined in `src/lib/wedding-site.ts` →
`REGIONAL_DOMAINS`. Adding a new domain requires updating that constant
plus the DNS + Vercel config above.

---

## Wedding Website Template — Vendor Credits Section

Couple wedding sites at `[slug].{regional-domain}` (rewritten internally
to `/weddings/[slug]`) render an editorial "Our Venue & Vendors" credits
section below the Save the Date hero.

**Rendered when:** `wedding_site_show_vendors` is true (default) AND
the plan has either a venue or at least one booked vendor.

**Data source:**
- Venue (top of section): `wedding_plans.venue_id → venues` join on the
  server. Shows name, city, and two buttons:
  *View profile →* (links to `${SITE_URL}/venues/{slug}`) and
  *Visit website ↗* when `venues.website` is set.
- Vendors (grid below): `wedding_plans.booked_vendors` jsonb, hydrated
  with each vendor's slug + website via an `IN (...)` lookup on the
  vendors table. Each card shows the category SVG icon + name + the
  same two buttons.

**Cross-domain links:** the wedding site lives on a regional subdomain
(`niagaraweddingvenues.com` etc.) while the directory lives on the OWV
apex, so the View profile / Visit website links use absolute
`SITE_URL`-prefixed `<a target="_blank">` anchors, not Next `<Link>`.

**Schema:** when the plan has a date + names + venue, a JSON-LD Event
object is injected with `location`, `startDate`, and a `performer` array
listing every booked vendor. Useful for shared-link previews even
though the page itself is `robots: noindex`.

**Toggle:** controlled by `wedding_plans.wedding_site_show_vendors`
(boolean default true). Future `/plan/website` editor will surface
this; for now the default applies and couples opt out by hand.

**Footer:** small "Planned with Ontario Wedding Vendors" line linking
back to the apex.
