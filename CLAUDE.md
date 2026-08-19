# Ontario Wedding Vendors — Master Project File
**Last updated:** August 19, 2026 (rev 5 — wizard verified shipped, Charlotte & Francis demo live + linked from homepage)
**Use this file:** Start any new conversation with "Read this project file" and paste contents.
**Replaces:** OWV_Project_File_May20_2026.md — this is the current source of truth.

---

## THE PRODUCT

**Ontario Wedding Vendors** — Canada's most complete Ontario wedding directory + AI planning tool + wedding website builder.

**Live at:** https://www.ontarioweddingvendors.com
**GitHub:** github.com/frtaylorca-a11y/ontario-wedding-vendors (private)
**Vercel:** pic-booth scope, auto-deploy on push to main
**Neon DB:** ontario-wedding-vendors (Neon Postgres)
**Operated by:** Rick Taylor / Pic Booth, St. Catharines ON

---

## TECH STACK

**Frontend:** Next.js 15 App Router + TypeScript + Tailwind v4
**Database:** Neon Postgres + Drizzle ORM
**Storage:** Cloudflare R2 (vendor photos, wedding website photos) — bucket: `ontarioweddingvendors`
**Email:** Brevo (transactional + marketing)
**AI:** Anthropic Claude API (claude-sonnet-4-6 + claude-haiku-4-5)
**Maps:** Google Places API — **PAUSED. Do not re-enable without budget alert. Was $500/mo.**
**Analytics:** GA4 + Meta Pixel + Microsoft Clarity — **env vars still needed in Vercel**
**Hosting:** Vercel (pic-booth scope)

**Local dev machine:** Mac mini M4, hostname picbooth-dev
**Scraper machine:** OMEN Windows PC
**Scraper folder:** C:\Users\rtayl\OneDrive\Desktop\ontario-venues-scraper\
**Next.js folder:** C:\Users\rtayl\OneDrive\Desktop\ontario-wedding-venues\

---

## MONETIZATION STRATEGY (decided August 19, 2026)

**Current phase: FREE & OPEN.** No paywall, no Stripe. Goal is traffic, usage, and feedback — not revenue. Everything is open to everyone. Early couples will be GRANDFATHERED FREE FOREVER as an acquisition incentive.

**The model decided (to introduce LATER, once there's traction — do NOT build yet):**
- **Couple-paid planning suite.** $89 CAD, ONE-TIME, lifetime-of-engagement.
- **Reasoning:** OWV doesn't have the traffic to sell vendors on lead-gen yet. The end consumer holds the value in hand — monetize them first. Vendor revenue (existing $29/$79/$149 tiers) is DEFERRED, not abandoned.
- **Wall type:** FREE-TO-TRY preview. Let couples feel the value, then pay to keep their work.
- **FREE tier (forever):** full vendor + venue directory; budget calculator fully usable but NOT saveable; Stag & Doe checklist.
- **PAID tier ($89):** wedding website builder, AI generation, bulk quote / contact vendors, saved vendors, guest list, itinerary, music, full checklist, OneQR activation, saving a plan.
- **Stripe:** required before paid launch. First few sales can be manual (payment link + flip tier='premium' by hand). Do not build until demand is validated.
- **Validation sequence:** open free → drive real Ontario couples → watch behaviour → place paywall where couples actually felt value.
- **Industry context:** The Knot/WeddingWire/Zola are all free-to-couple, vendor-monetized. Paid-couple players (Kaiplan $79 one-time, Folia $89/yr) are niche but real. OWV is choosing couple-paid because it lacks vendor-side traffic. This is a sequencing decision, not a permanent model choice.
- **OneQR continuity is a differentiator:** OWV covers planning → website → day-of via OneQR. Use this full-lifecycle story to justify the price.

---

## DATABASE STATE (August 19, 2026)

| Table | Count | Notes |
|---|---|---|
| venues | 639 | 536 have R2 hero photos (84% coverage) |
| vendors | 11,487 total | 4,018 visible, 7,469 hidden (dupes, no website, non-Ontario, social-only) |
| vendor_pricing_data | ~300 | Thin but hardcoded ranges cover budget calculator |
| wedding_plans | 7 | ALL are Rick's test data — true user count = 0 |
| vendor_claims | 0 | Claim listing launched, no claims yet |

**Visible vendor photo coverage:**
- 2,562 of 4,018 visible vendors have R2 hero photos (64%)
- 1,456 visible vendors on styled placeholders (dead sites, SPAs — won't improve via scraping)
- All photos served from Cloudflare R2 — zero Google API dependency

**Vendor breakdown by category (visible):**
limo 1163, lighting_decor 929, hair_makeup 485, photographer 420, cake 374, florist 368, catering 347, videographer 264, wedding_planner 217, officiant 173, photo_booth 167, dj 126

**Vendor regions:** gta 4154, niagara 456, hamilton 241, muskoka 166, southwestern 16

---

## BRAND

**Colours:**
- Rose: #B96476
- Rose Light: #F7EEF1
- Gold: #C9A96E
- Navy: #1F2937
- Charcoal: #2C2C2A
- Cream/Warm White: #FAF8F5 (page background)
- Card: #ffffff

**Fonts:** Cormorant Garamond (display) + Inter (body)
Page background warm cream (#FAF8F5); cards white (#fff); footer dark charcoal #2C2C2A.

---

## ONTARIO PRICING (validated May 2026 — in src/lib/ontario-pricing.ts)

```
photographer:    niagara {1200, 1875, 7500}   gta {1500, 3200, 7000}
videographer:    niagara {1500, 3500, 4900}   gta {1800, 2500, 9000}
dj:              niagara {1200, 1750, 3500}   gta {1200, 1599, 3800}
florist:         niagara {2000, 3500, 8000}   gta {1500, 3000, 8000}
officiant:       niagara { 150,  350, 1400}   gta { 200,  399, 1200}
hair_makeup:     niagara { 250,  450,  750}   gta { 300,  500, 1200}
catering (pp):   niagara {  85,  125,  200}   gta {  95,  140,  250}
wedding_planner: niagara {1500, 3000, 8000}   gta {2500, 6000,15800}
cake:            niagara { 400,  750, 2500}   gta { 500,  900, 3000}
limo:            niagara { 600, 1200, 3000}   gta { 800, 1500, 3995}
photo_booth:     niagara { 895, 1295, 2495}   gta { 800, 1200, 2500} ← Pic Booth hardcoded
lighting_decor:  niagara { 800, 1500, 4000}   gta {1000, 2000, 6000}
```
(format: {min, median, max})

---

## DOMAINS OWNED

All registered, DNS at Hostinger:
- ontarioweddingvendors.com (main site)
- niagaraweddingvenues.com ← wedding website subdomains
- niagaraonthelakeweddingvenues.com ← wedding website subdomains
- niagarafallsweddingvenues.com
- stcatharinesweddingvenues.com
- burlingtonweddingvenues.com ← wedding website subdomains
- torontoweddingdirectory.com ← wedding website subdomains
- hamiltonweddingdirectory.com
- oakvilleweddingvenues.com
- mississaugaweddingvenues.com
- niagaraweddingdirectory.com
- niagaraweddingphotographers.com
- niagaraphotobooth.com (separate budget brand)

**Wedding website subdomain routing:** couples get [names].[regionaldomain].com
Middleware rewrites to /weddings/[slug]. DNS: wildcard CNAME *.domain → cname.vercel-dns.com
STATUS: Code built, DNS NOT yet configured in Hostinger.

---

## WHAT'S BUILT (Features Shipped — current as of Aug 19, 2026)

### Directory
- Venue + vendor listing pages with filters
- Venue + vendor detail pages (enriched data, R2 photos, ratings)
- Proximity/distance filter (haversine)
- Pinned vendor system (Pic Booth pinned in photo_booth)
- normalizeRegionDisplay() across all pages
- Dynamic trust bar (live DB counts)
- Bulletproof HeroImage component — graceful R2 photo fallback, never shows broken image icon
- Styled per-category placeholder for vendors with no photo

### Planning Tool (/plan)
- 20-category budget calculator with validated Ontario pricing (fully usable free, save requires paid later)
- Progressive budget UI (8 active + 12 collapsible)
- Venue-aware pricing, bundle detection
- Quote request system (single vendor — date+venue required, Lead Quality Score 0–5)
- Saved vendors (heart/bookmark → wedding_plans)
- Living checklist (38 tasks), Stag & Doe planner
- Inclusive partner1Name/partner2Name fields
- /plan/music, /plan/guests, /plan/itinerary, /plan/website
- **Bulk quote system — SHIPPED (/plan/quotes):** couples select saved vendors by category, AI generates personalised 3-part email from plan data + rawStory, sends one email per vendor via Brevo, reply-to = couple's email, logs to quote_requests, "Contacted ✓" badges. Guardrails: date+venue required, batch cap ~15, 30-day re-send confirm, skips vendors with no email. rawStory seed swap in place so email tone matches wedding website voice.

### Wedding Websites (/weddings/[slug])
- Auto-provisioning: slug minted on venue/name save
- **14 themes total — ALL SHIPPED:**
  - Original 8: Romantic, Classic, Rustic, Modern, Garden, Coastal, Boho, Luxe
  - New 6 (Aug 19): Editorial, Minimal Blush, Terracotta, Retro Charm, Bold Garden, Frosted Glass
  - Terracotta + Frosted Glass are premium-gated (server-side enforcement)
- Colour palette picker — 23 palettes in 6 groups, first 8 free, rest premium-locked
- Typography selector — 5 styles with live font previews, promptHint pipes to AI generator
- Premium gate — 3 free AI generations, upgrade modal, lock badges
- Sticky publish button on /plan/website
- AI copy generation (/api/wedding-website/generate, safeParseJson)
- Password protection, wedding hashtag, section toggle editor (12 sections)
- Vendor credits section, OneQR QR embed
- **Wedding website wizard — SHIPPED** — screenshot-based 3-step flow (Style / Story / Publish), verified end-to-end. Cards fall through to theme-coloured gradients until 6 reference JPGs land in /public/images/wedding-styles/. Free tier gets 3 AI generations, then upgrade modal. `wizardCompleted` flag branches wizard vs full editor in `page.tsx:114`.
- **Theme-picker layout previews — SHIPPED** — six layout-specific mini mockups (frosted glass panel, editorial split, minimal sidebar, retro double-frame, bold-garden split-bands, terracotta pill hero) render in both grid cards and the full right-column preview. `src/components/plan/ThemeLayoutPreview.tsx`.
- **Charlotte & Francis showcase demo — LIVE** at `/weddings/charlotte-and-francis` — real venue (Ravine Vineyard Estate Winery), real R2 hero photo, Terracotta layout, fully-written content across all 12 sections (party, registry, things-to-do, FAQ, dress code, extra events, travel copy). Idempotent seed script at `scripts/seed-charlotte-and-francis-demo.ts`. Linked from homepage BridgeToPlanner section under the primary CTA: "Curious what the finished site looks like? See Charlotte & Francis in Niagara →".

### Vendor Features
- Claim listing (/claim-listing) — LIVE
- Vendor dashboard skeleton (/vendors/dashboard)
- Logo upload, "Is this your business?" sidebar card, vendor_claims table

### Images / R2
- All vendor/venue images served from Cloudflare R2 — zero Google API dependency
- 2,562 visible vendors with R2 hero photos (64%)
- 536 venues with R2 hero photos (84%)
- Scripts: backfill-website-heros.ts (--only-missing flag), backfill-venue-website-heros.ts, hoist-gallery-photo-to-hero.ts
- R2 URL protocol normalization in place (bf4f48d) — all URLs properly https://

### Content / Infra
- 8 blog posts (SEO), /about, /terms
- robots.txt (AI crawlers blocked), rate limiting (30/min/IP), honeypot /api/hp
- Analytics scaffolding ready — needs env vars (see Manual Tasks)
- Cookie consent, UTM capture, OneQR integration

---

## PENDING / NEXT FOR CLAUDE CODE (priority order)

### Priority 1 — Wire hero image picker
Once Midjourney images are uploaded to /public/images/wedding-heroes/ (1.jpg through 20.jpg), wire them into wizard Step 3's "Pick a default" mode. Today the grid renders 20 deterministic gradient tiles as placeholders — the code auto-picks up real JPGs once they land.

### Priority 2 — Additional showcase demo plans (optional)
Charlotte & Francis covers Terracotta + Niagara winery. Consider one more showcase per premium layout for marketing variety — e.g. "Amelia & Julian" already exists on Frosted Glass (`/weddings/test-frosted`, `wedding_plans.id=81`) but with a hotel venue; could seed one per layout for the theme-picker's "See this layout live" link if we add one.

### Then — Stripe + paywall
Only after real user demand is validated. See monetization strategy above.

### Recently completed (moved out of Pending)
- ✅ Wedding Website Wizard — verified shipped end-to-end (see WHAT'S BUILT). Only remaining item is Rick supplying the 6 reference JPGs.
- ✅ Charlotte & Francis demo — live at `/weddings/charlotte-and-francis`, linked from homepage.

---

## MANUAL TASKS PENDING (Rick)

**Urgent — blocks analytics:**
- GA4: analytics.google.com → create property → get G-XXXXXXXXXX → add NEXT_PUBLIC_GA4_ID to Vercel
- Microsoft Clarity: clarity.microsoft.com → get project ID → add NEXT_PUBLIC_CLARITY_ID to Vercel
- Meta Pixel: business.facebook.com → Events Manager → add NEXT_PUBLIC_META_PIXEL_ID to Vercel

**Urgent — blocks wedding website subdomains:**
- Hostinger DNS: wildcard CNAMEs for *.niagaraweddingvenues.com, *.niagaraonthelakeweddingvenues.com, *.burlingtonweddingvenues.com, *.torontoweddingdirectory.com → cname.vercel-dns.com
- Vercel: add each *.domain as wildcard domain on the project

**Growth:**
- Google Search Console: add www.ontarioweddingvendors.com, submit /sitemap.xml
- Midjourney: generate 20 hero images, name hero-01.jpg through hero-20.jpg, copy to public/images/wedding-heroes/
- Reference screenshots: save 6 design screenshots to public/images/wedding-styles/ (editorial.jpg, minimal-blush.jpg, terracotta.jpg, retro-charm.jpg, bold-garden.jpg, frosted-glass.jpg)
- First users: Pic Booth network, local Ontario wedding Facebook groups, r/WeddingsCanada

**Env vars still needed in Vercel:**
- NEXT_PUBLIC_GA4_ID
- NEXT_PUBLIC_CLARITY_ID
- NEXT_PUBLIC_META_PIXEL_ID
- BREVO_API_KEY
- ONEQR_API_URL + ONEQR_API_KEY

---

## DATA PIPELINE (OMEN Scripts)

**Location:** C:\Users\rtayl\OneDrive\Desktop\ontario-venues-scraper\

**Key scripts:** vendor_search.py (Google Places — PAUSED), enrich_venues.py, mine_reviews.py, scrape_vendor_pricing.py (safe_parse_json fix in place), ww_scraper3.py (Playwright + Claude Vision), fix_regions.py (run after EVERY import), db_full_audit.py

**WeddingWire sector IDs:**
```
photographers 8/2, videographers 33/2, djs 202/2, florists 15/2,
hair_makeup 38/3 (← grupo=3), catering 5/2, wedding_planners 28/2,
cake 48/2, limo 11/2, photo_booth 207/2, lighting_decor 45/2, officiants 205/2
```
WW scraper: `python ww_scraper3.py --category all --start-page 1 --end-page 50`
Browser window MUST be visible (not minimized) for screenshots.

**Import pipeline (always run in this order):**
```
npx tsx scripts/import-vendors.ts
python fix_regions.py
npx tsx scripts/enrich-ww-vendors.ts
npx tsx scripts/backfill-website-heros.ts --only-missing
npx tsx scripts/backfill-venue-website-heros.ts
```

**Google Places API: PAUSED.** Was $500/mo. Do not re-enable without a $50/mo budget alert set first. Photo backfill is now done via website scraping (R2), not Google. The only reason to re-enable would be a targeted enrichment pass for vendors missing website URLs.

**Underserved regions worth scraping when ready:**
```
python vendor_search.py --category all --region eastern --skip-claude
python vendor_search.py --category all --region waterloo --skip-claude
python vendor_search.py --category all --region pec --skip-claude
```
PEC (Prince Edward County) is a major Ontario wedding destination — nearly zero coverage currently.

---

## BACKLOG (after site has real users)

**Phase 2:** Cloudflare bot protection; Venue outreach email system (admin + Brevo bulk + token response form); Vendor claim email sequence; Stripe ($89 CAD one-time couple suite); Vendor dashboard with real auth; Seating plan builder /plan/seating; 20+ blog posts; Vendor analytics dashboard.

**Phase 3:** Wedding websites full launch; custom domains for premium sites; RSVP in OneQR feeding back to OWV guest list; Reddit scraping (r/WeddingsCanada); AI wedding advisor in /plan; Ontario directory network sites; preferred-vendor mining.

---

## MONETIZATION MODEL

See MONETIZATION STRATEGY block above — it is current and authoritative.

**Current state:** fully free and open. No paywall, no Stripe.
**Future couple tier:** $89 CAD one-time — planning suite (website builder, AI, bulk quote, guest list, itinerary, full checklist, OneQR).
**Future vendor tiers (deferred):** Free (listed) · Basic $29/mo · Pro $79/mo · Featured $149/mo.

---

## ARCHITECTURE DECISIONS

- OWV ↔ OneQR: separate products, HTTP API only
- Wedding websites use owned regional domains as subdomains
- RSVP lives in OneQR (same URL: pre-wedding RSVP → day-of experience)
- Vendor bios enriched from real vendor websites (not AI placeholders)
- WeddingWire vendors get Google Places enrichment before import
- Inclusive language throughout (partner1/partner2, not bride/groom)
- Pic Booth pinned in photo_booth category, all regions
- fix_regions.py must run after every vendor import
- All images served from Cloudflare R2 — no Google API at runtime
- safeParseJson used on all Claude API response parsing throughout codebase

---

## KEY INTEGRATIONS

- Brevo: BREVO_API_KEY (needed in Vercel)
- Google Places: GOOGLE_PLACES_API_KEY (.env) — PAUSED
- Anthropic: ANTHROPIC_API_KEY (.env)
- Cloudflare R2: bucket ontarioweddingvendors, credentials in Vercel + .env.local
- OneQR API: ONEQR_API_URL + ONEQR_API_KEY (not yet set up)

---

## RELATED PROJECTS

- **Pic Booth (picbooth.ca):** Premium photo booth rental, St. Catharines
- **Niagara Photo Booth (niagaraphotobooth.com):** Budget tier, separate brand
- **Guest Gallery (guest.picbooth.ca):** Live photo gallery, Next.js
- **OneQR Events (oneqr.events):** Day-of QR experience, separate codebase

---

## KEY COMMITS THIS SESSION (August 19, 2026)

**Images / R2 pipeline:**
- `0b1a48d` — Skip dead Google URLs at render time (bulletproof HeroImage component)
- `33a2ab8` — HTTP→base64 fix for scraper
- `2d91c2d` — `--only-missing` flag on backfill-website-heros.ts
- `6837ac3` — HeroImage client component with cascade + onError → placeholder div
- `8dddb02` — .env.local loader for tsx scripts (side-effect module)
- `eca6d77` — backfill-venue-website-heros.ts
- `bf4f48d` — R2 URL protocol normalization (https:// prepended automatically at 4 config sites)
- `b13377b` — hoist-gallery-photo-to-hero.ts (audit trail for the SQL hoist that populated 2,719 rows)

**Wedding-site layouts (6 shipped):**
- `f959cc6` — Frosted Glass (dark navy + gold + `blur(12px)` panels)
- `8520d61` — Editorial (bold magazine spread, split hero, Cormorant 700)
- `0731ecd` — Minimal Romantic (sidebar-driven, blush hairlines, italic Cormorant)
- `952881c` — Retro Charm (heirloom letterpress, gold double-frames, Playfair italic)
- `503eaba` — Bold Garden (chromatic split-band pink + sage)
- `da8f4fb` — Theme-picker layout previews (mini mockup per layout in the grid + full preview panel)

**Demo + docs:**
- `4c86318` — Charlotte & Francis showcase seed (Ravine Vineyard, Terracotta, all 12 sections)
- `fcc817b` — Homepage BridgeToPlanner link → Charlotte & Francis demo
- `9f194ee` — PROJECT.md rev 4 (Aug 19 baseline)
- `88630d5` — CLAUDE.md mirrored to match PROJECT.md

**Earlier in session (pre-Aug 19 review):**
- `0e0459b` — Bulk quote system (/plan/quotes, QuotesPlanner, generate-email API, send-bulk API)

**DB writes this session:**
- 2,719 rows hoisted to R2 hero URLs from existing gallery photos
- 323 vendor + 57 venue photos scraped fresh and uploaded to R2 (~$3.87 in Claude cost)
- 323 rows patched with `https://` prefix after the URL-normalization bug was caught
- 6 test wedding plans seeded for the layout demos (`test-frosted` id=81, `test-editorial` id=82, `test-minimal` id=83, `test-retro` id=84, `test-bold-garden` id=85, `charlotte-and-francis` id=86)

---

*Update this file at the end of each major build session.*
*To resume: paste into a new Claude conversation.*
*Filename convention: OWV_Project_File_[Date].md — always use the most recent date.*
