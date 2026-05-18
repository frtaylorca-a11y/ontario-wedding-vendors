# CLAUDE.md — Ontario Wedding Venues
## Project: ontarioweddingvenues.com
## Last updated: May 2026

---

## Project Overview

Ontario Wedding Venues is a comprehensive wedding venue and vendor directory for Ontario, Canada. It serves as the data platform for a network of city-specific wedding directory sites (NiagaraWeddingVenues.com, HamiltonWeddingVenues.com etc.) which call its API.

**Primary domain:** ontarioweddingvenues.com
**Repository:** github.com/frtaylorca-a11y/ontario-wedding-venues
**Vercel scope:** pic-booth (same as Guest Gallery and OneQR)
**Database:** Neon Postgres (new project: ontario-wedding-venues)
**ORM:** Drizzle ORM

---

## Tech Stack

- **Framework:** Next.js 15 App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Neon Postgres (Serverless)
- **ORM:** Drizzle ORM
- **Storage:** Cloudflare R2 (venue photos, future)
- **AI:** Anthropic Claude API (budget planner)
- **Maps:** Google Maps Embed API (free, no key needed for embeds)
- **Hosting:** Vercel (pic-booth scope)
- **Package manager:** npm

---

## Design System — "The Niagara Edit"

### Colours
```css
--owv-rose:        #B96476;   /* dusty rose — primary */
--owv-rose-light:  #D4899A;   /* hover states */
--owv-rose-pale:   #FDF5F7;   /* backgrounds, cards */
--owv-charcoal:    #2C2C2C;   /* headings, body text */
--owv-warm-grey:   #6B6B6B;   /* secondary text */
--owv-border:      #E8D5D9;   /* card borders, dividers */
--owv-white:       #FFFFFF;
--owv-cream:       #FAF7F2;   /* page background */
```

### Typography
- **Display/headings:** Cormorant Garamond (Google Fonts) — elegant, editorial
- **Body/UI:** DM Sans (Google Fonts) — clean, readable
- **Heading scale:** 4xl/3xl/2xl/xl/lg
- **Body:** base/sm

### Component patterns
- Card border-radius: `rounded-2xl`
- Card shadow: `shadow-sm hover:shadow-md transition-shadow`
- Button primary: rose background, white text, `rounded-full px-6 py-3`
- Button secondary: white background, rose border + text, `rounded-full`
- Badge/pill: `rounded-full px-3 py-1 text-xs font-medium`
- Score badge colours:
  - 90+: `bg-emerald-100 text-emerald-800` — Premier
  - 70–89: `bg-blue-100 text-blue-800` — Active
  - 50–69: `bg-amber-100 text-amber-800` — Listed
  - <50: hidden from public display

### CSS variable pattern
All design tokens defined in `src/app/globals.css` under `:root`.
Use `var(--owv-rose)` etc. in Tailwind arbitrary values where needed.

---

## Database Schema

### venues table
```typescript
export const venues = pgTable('venues', {
  id:                   serial('id').primaryKey(),
  placeId:              varchar('place_id', { length: 255 }).unique(),
  slug:                 varchar('slug', { length: 255 }).unique().notNull(),
  name:                 varchar('name', { length: 255 }).notNull(),
  address:              text('address'),
  city:                 varchar('city', { length: 100 }),
  region:               varchar('region', { length: 100 }),  // niagara, gta, ottawa etc.
  province:             varchar('province', { length: 10 }).default('ON'),
  postalCode:           varchar('postal_code', { length: 10 }),
  phone:                varchar('phone', { length: 50 }),
  website:              varchar('website', { length: 500 }),
  email:                varchar('email', { length: 255 }),
  category:             varchar('category', { length: 100 }),
  venueType:            varchar('venue_type', { length: 100 }),
  capacityMin:          integer('capacity_min'),
  capacityMax:          integer('capacity_max'),
  coordinatorName:      varchar('coordinator_name', { length: 255 }),
  coordinatorEmail:     varchar('coordinator_email', { length: 255 }),
  coordinatorPhone:     varchar('coordinator_phone', { length: 50 }),
  catering:             varchar('catering', { length: 100 }),
  accommodations:       varchar('accommodations', { length: 50 }),
  indoorOutdoor:        varchar('indoor_outdoor', { length: 50 }),
  hasWeddingsPage:      varchar('has_weddings_page', { length: 10 }),
  weddingsPageUrl:      varchar('weddings_page_url', { length: 500 }),
  hasPackages:          varchar('has_packages', { length: 10 }),
  packages:             text('packages'),
  hasPricing:           varchar('has_pricing', { length: 10 }),
  hasTestimonials:      varchar('has_testimonials', { length: 10 }),
  bookingPlatform:      varchar('booking_platform', { length: 100 }),
  instagramHandle:      varchar('instagram_handle', { length: 100 }),
  googleRating:         numeric('google_rating', { precision: 3, scale: 1 }),
  reviewCount:          integer('review_count'),
  googleClosed:         varchar('google_closed', { length: 10 }).default('no'),
  weddingReadinessScore: integer('wedding_readiness_score'),
  scoreReasoning:       text('score_reasoning'),
  description:          text('description'),
  lat:                  numeric('lat', { precision: 10, scale: 7 }),
  lng:                  numeric('lng', { precision: 10, scale: 7 }),
  tier:                 varchar('tier', { length: 20 }).default('free'), // free, featured, premier
  claimed:              boolean('claimed').default(false),
  verified:             boolean('verified').default(false),
  featured:             boolean('featured').default(false),
  websiteStatus:        varchar('website_status', { length: 50 }),
  lastGoogleSync:       timestamp('last_google_sync'),
  lastWebsiteCheck:     timestamp('last_website_check'),
  lastVerified:         timestamp('last_verified'),
  source:               varchar('source', { length: 100 }),
  createdAt:            timestamp('created_at').defaultNow(),
  updatedAt:            timestamp('updated_at').defaultNow(),
})
```

### vendors table
```typescript
export const vendors = pgTable('vendors', {
  id:                   serial('id').primaryKey(),
  placeId:              varchar('place_id', { length: 255 }).unique(),
  slug:                 varchar('slug', { length: 255 }).unique().notNull(),
  name:                 varchar('name', { length: 255 }).notNull(),
  category:             varchar('category', { length: 100 }).notNull(),
  // photographer, videographer, dj, florist, photo_booth,
  // catering, cake, hair_makeup, officiant, limo
  city:                 varchar('city', { length: 100 }),
  region:               varchar('region', { length: 100 }),
  province:             varchar('province', { length: 10 }).default('ON'),
  address:              text('address'),
  phone:                varchar('phone', { length: 50 }),
  website:              varchar('website', { length: 500 }),
  email:                varchar('email', { length: 255 }),
  instagramHandle:      varchar('instagram_handle', { length: 100 }),
  googleRating:         numeric('google_rating', { precision: 3, scale: 1 }),
  reviewCount:          integer('review_count'),
  googleClosed:         varchar('google_closed', { length: 10 }).default('no'),
  priceTier:            varchar('price_tier', { length: 20 }), // budget, mid, premium
  priceFrom:            integer('price_from'),
  priceTo:              integer('price_to'),
  description:          text('description'),
  lat:                  numeric('lat', { precision: 10, scale: 7 }),
  lng:                  numeric('lng', { length: 10, scale: 7 }),
  serveRadiusKm:        integer('serve_radius_km').default(100),
  tier:                 varchar('tier', { length: 20 }).default('free'),
  claimed:              boolean('claimed').default(false),
  verified:             boolean('verified').default(false),
  featured:             boolean('featured').default(false),
  isPicBooth:           boolean('is_pic_booth').default(false),
  placeId:              varchar('google_place_id', { length: 255 }),
  source:               varchar('source', { length: 100 }),
  createdAt:            timestamp('created_at').defaultNow(),
  updatedAt:            timestamp('updated_at').defaultNow(),
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
│   │   ├── globals.css         ← design tokens + base styles
│   │   ├── layout.tsx          ← root layout, fonts
│   │   ├── page.tsx            ← homepage
│   │   ├── sitemap.ts          ← auto-generated sitemap
│   │   ├── robots.ts
│   │   │
│   │   ├── venues/
│   │   │   ├── page.tsx        ← venue listing with filter/sort
│   │   │   └── [slug]/
│   │   │       └── page.tsx    ← individual venue page
│   │   │
│   │   ├── regions/
│   │   │   └── [region]/
│   │   │       └── page.tsx    ← region page (niagara, gta, ottawa)
│   │   │
│   │   ├── plan/
│   │   │   └── page.tsx        ← budget planner
│   │   │
│   │   ├── vendors/
│   │   │   ├── page.tsx
│   │   │   └── [category]/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── venues/
│   │       │   ├── route.ts    ← GET /api/venues?region=niagara&type=winery
│   │       │   └── [slug]/
│   │       │       └── route.ts
│   │       └── vendors/
│   │           └── route.ts    ← GET /api/vendors?region=niagara&category=dj
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── VenueCard.tsx
│   │   │   ├── VendorCard.tsx
│   │   │   ├── ScoreBadge.tsx
│   │   │   ├── RatingStars.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── MapEmbed.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Nav.tsx
│   │   └── features/
│   │       ├── BudgetPlanner.tsx
│   │       ├── VenueGrid.tsx
│   │       └── VendorGrid.tsx
│   │
│   ├── lib/
│   │   ├── db.ts               ← Neon + Drizzle client
│   │   ├── schema.ts           ← all table definitions
│   │   ├── queries.ts          ← reusable DB queries
│   │   ├── regions.ts          ← city → region mapping
│   │   └── utils.ts            ← slug generation, formatting
│   │
│   └── types/
│       └── index.ts            ← shared TypeScript types
│
└── scripts/
    ├── import-venues.ts        ← imports directory_ready.csv to Neon
    ├── import-vendors.ts       ← imports vendor Excel to Neon
    └── generate-slugs.ts       ← generates URL slugs from venue names
```

---

## Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://...          # Neon connection string
ANTHROPIC_API_KEY=sk-ant-...           # Claude API for budget planner
GOOGLE_PLACES_API_KEY=AIza...          # Places API for map validation
NEXT_PUBLIC_SITE_URL=https://ontarioweddingvenues.com
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...    # Public key for map embeds (restricted)
```

---

## Region Mapping

Cities map to regions for filtering and sub-site API calls:

```typescript
// src/lib/regions.ts
export const REGION_MAP: Record<string, string> = {
  // Niagara
  'niagara-on-the-lake': 'niagara',
  'niagara-falls':       'niagara',
  'st-catharines':       'niagara',
  'lincoln':             'niagara',
  'grimsby':             'niagara',
  'welland':             'niagara',
  'thorold':             'niagara',
  'pelham':              'niagara',
  'fort-erie':           'niagara',
  'port-colborne':       'niagara',
  'wainfleet':           'niagara',
  'beamsville':          'niagara',
  'jordan':              'niagara',
  'vineland':            'niagara',
  'fonthill':            'niagara',
  // Hamilton / Burlington
  'hamilton':            'golden-horseshoe',
  'burlington':          'golden-horseshoe',
  'oakville':            'golden-horseshoe',
  'milton':              'golden-horseshoe',
  'ancaster':            'golden-horseshoe',
  'waterdown':           'golden-horseshoe',
  // GTA
  'toronto':             'gta',
  'mississauga':         'gta',
  'brampton':            'gta',
  'vaughan':             'gta',
  'markham':             'gta',
  'richmond-hill':       'gta',
  'newmarket':           'gta',
  'aurora':              'gta',
  'ajax':                'gta',
  'whitby':              'gta',
  'oshawa':              'gta',
  'pickering':           'gta',
  'king-city':           'gta',
  'caledon':             'gta',
  'halton-hills':        'gta',
  // Cottage Country / Muskoka
  'barrie':              'cottage-country',
  'collingwood':         'cottage-country',
  'wasaga-beach':        'cottage-country',
  'orillia':             'cottage-country',
  'gravenhurst':         'cottage-country',
  'huntsville':          'cottage-country',
  'bracebridge':         'cottage-country',
  'midland':             'cottage-country',
  // Waterloo Region
  'kitchener':           'waterloo-region',
  'waterloo':            'waterloo-region',
  'cambridge':           'waterloo-region',
  'guelph':              'waterloo-region',
  'fergus':              'waterloo-region',
  'elora':               'waterloo-region',
  // Southwestern Ontario
  'london':              'southwestern',
  'windsor':             'southwestern',
  'chatham':             'southwestern',
  'stratford':           'southwestern',
  'woodstock':           'southwestern',
  'brantford':           'southwestern',
  'sarnia':              'southwestern',
  // Eastern Ontario / Ottawa
  'ottawa':              'eastern',
  'kingston':            'eastern',
  'belleville':          'eastern',
  'cobourg':             'eastern',
  'peterborough':        'eastern',
  'picton':              'eastern',
  'bloomfield':          'eastern',
  // Prince Edward County
  'picton':              'prince-edward-county',
  'bloomfield':          'prince-edward-county',
}

export const REGIONS = [
  { slug: 'niagara',            label: 'Niagara',              featured: true },
  { slug: 'gta',                label: 'Greater Toronto Area', featured: true },
  { slug: 'golden-horseshoe',   label: 'Hamilton & Burlington',featured: true },
  { slug: 'cottage-country',    label: 'Muskoka & Cottage Country', featured: true },
  { slug: 'waterloo-region',    label: 'Waterloo Region',      featured: false },
  { slug: 'southwestern',       label: 'Southwestern Ontario', featured: false },
  { slug: 'eastern',            label: 'Eastern Ontario',      featured: false },
  { slug: 'prince-edward-county', label: 'Prince Edward County', featured: false },
]
```

---

## API Routes

### GET /api/venues
Query params:
- `region` — filter by region slug
- `city` — filter by city slug
- `type` — winery, hotel, barn, estate, golf-club, conservation, restaurant, banquet-hall, resort
- `indoor` — indoor, outdoor, both
- `catering` — in-house, open, both
- `capacity` — min guest count
- `score` — minimum wedding readiness score (default: 50)
- `sort` — rating, reviews, capacity, score (default: score)
- `limit` — default 20
- `offset` — for pagination

Returns: `{ venues: Venue[], total: number, page: number }`

### GET /api/venues/[slug]
Returns: full venue object

### GET /api/vendors
Query params: `region`, `city`, `category`, `limit`, `offset`
Returns: `{ vendors: Vendor[], total: number }`

---

## Key Pages

### Homepage (/)
- Hero: "Find Your Perfect Ontario Wedding Venue"
- Search bar (city or venue name)
- Featured regions (4 cards: Niagara, GTA, Muskoka, Hamilton)
- Featured venues (top 6 by score + reviews)
- Browse by venue type (winery, hotel, barn, estate, golf, conservation)
- Budget planner CTA
- Stats: "1,200+ venues · 76 premier listings · All Google-verified"

### Venue Listing (/venues)
- Filter sidebar: region, type, capacity, indoor/outdoor, catering
- Sort: rating, reviews, score
- Venue cards with: name, city, type badge, capacity, rating, score badge
- Pagination

### Individual Venue (/venues/[slug])
- Hero (Google Street View or placeholder)
- Name, type, city, region
- Score badge with reasoning
- Details grid: capacity, catering, indoor/outdoor, accommodations
- Coordinator contact (if found)
- Google rating + review count + "Powered by Google" logo
- Description (Claude-generated)
- Google Maps embed
- Nearby vendors section (photographers, DJs, photo booths within 30km)
- "Last verified" date
- CTA: "Visit Website" + "Get a Quote from Pic Booth" (for photo booth)

### Region Page (/regions/[region])
- Region hero with description
- Top venues in region
- Venue type breakdown
- Featured vendors in region

### Budget Planner (/plan)
- Step 1: Total budget + guest count + style (intimate/standard/luxury)
- Step 2: Pick venue (filtered to budget-appropriate options)
- Step 3: AI allocates remaining budget across categories
- Step 4: Browse vendors by category within budget

---

## Slug Generation

```typescript
// src/lib/utils.ts
export function generateSlug(name: string, city: string): string {
  const nameSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

  const citySlug = city
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')

  return `${nameSlug}-${citySlug}`
}
// "White Oaks Resort & Spa" + "Niagara-on-the-Lake"
// → "white-oaks-resort-spa-niagara-on-the-lake"
```

---

## Import Script

The `scripts/import-venues.ts` script reads `directory_ready.csv`
from the `ontario-venues-omen` data folder and seeds the Neon database.

CSV location (on OMEN):
`C:\Users\rtayl\OneDrive\Desktop\ontario-venues-omen\data\validated\directory_ready.csv`

The script:
1. Reads the CSV
2. Generates slugs for each venue
3. Maps city → region using REGION_MAP
4. Upserts to Neon (on conflict: place_id → update)
5. Reports: inserted, updated, skipped

Run with: `npx tsx scripts/import-venues.ts`

---

## Pic Booth Integration

Pic Booth appears as the featured photo booth vendor on:
- Every venue page "Nearby Vendors" section
- The /vendors/photo-booths page (pinned at top)
- The budget planner photo booth recommendation

Pic Booth record in vendors table:
- `is_pic_booth: true`
- `tier: 'premier'`
- `featured: true`
- `verified: true`
- `claimed: true`
- Serves all Ontario (serve_radius_km: 500)

---

## Build Commands

```bash
npm run dev          # local development
npm run build        # production build
npm run db:generate  # generate Drizzle migrations
npm run db:migrate   # run migrations on Neon
npm run db:seed      # run import scripts
npm run db:studio    # Drizzle Studio (local DB browser)
```

---

## Deployment

- GitHub repo: `frtaylorca-a11y/ontario-wedding-venues`
- Vercel project: `ontario-wedding-venues` under `pic-booth` scope
- Auto-deploy on push to `main`
- Preview deploys on PRs
- Environment variables set in Vercel dashboard

Domain setup:
- `ontarioweddingvenues.com` → Vercel (primary)
- `niagaraweddingvenues.com` → Vercel (same project, alternate domain)
  - Uses `X-Forwarded-Host` header to filter venues to Niagara region
  - OR: separate lightweight Next.js site that calls /api/venues?region=niagara

---

## SEO

- Every venue page has: title, description, canonical, OG tags
- JSON-LD schema: `LocalBusiness` on venue pages, `ItemList` on listing pages
- Sitemap auto-generated from DB at build time
- Region pages target: "wedding venues [region] Ontario"
- Venue pages target: "[venue name] wedding venue [city]"
- robots.ts: allow all, disallow /api

---

## Notes

- Scores below 50 are NOT shown publicly — they appear in admin only
- "Powered by Google" attribution required wherever Google ratings displayed
- Google Maps embed (iframe) requires no API key and has no usage limits
- All venue data sourced from Google Places API under standard ToS
- Coordinator emails found via website enrichment are displayed but not stored in mailto links to reduce spam harvesting — use a contact form instead
- NiagaraWeddingVenues.com redirect: 301 from root → ontarioweddingvenues.com/regions/niagara (SEO-safe)
