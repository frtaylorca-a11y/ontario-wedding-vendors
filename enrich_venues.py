# encoding: utf-8
"""
enrich_venues.py -- Venue Website Enrichment
Fetches each venue's website, extracts detailed info and preferred vendors.

Usage:
  python enrich_venues.py --limit 50
  python enrich_venues.py --all
  python enrich_venues.py --venue-slug white-oaks-resort-niagara
"""

import os, sys, json, time, argparse, re
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY  = os.getenv("ANTHROPIC_API_KEY")
GOOGLE_API_KEY     = os.getenv("GOOGLE_PLACES_API_KEY")
DATABASE_URL       = os.getenv("DATABASE_URL")

DATA_DIR   = Path("data")
VENUES_DIR = DATA_DIR / "venues"
VENDOR_DIR = DATA_DIR / "vendors"
LOG_FILE   = DATA_DIR / "enrichment-log.json"

PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9",
}

VENDOR_CATEGORIES = [
    "photographer", "videographer", "dj", "florist", "officiant",
    "hair_makeup", "catering", "wedding_planner", "cake", "limo",
    "photo_booth", "lighting_decor"
]

PREFERRED_VENDOR_KEYWORDS = [
    "preferred vendor", "preferred partners", "recommended vendor",
    "trusted vendor", "vendor list", "our vendors", "partner vendor",
    "vendor partners", "recommended partners", "friends and family",
    "vendor friends", "preferred supplier"
]


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def load_log():
    if LOG_FILE.exists():
        with open(LOG_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"enriched": [], "failed": [], "vendors_discovered": []}

def save_log(log):
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2, ensure_ascii=False)

def load_venues():
    """Load all venues from data/venues/ JSON files."""
    venues = []
    if VENUES_DIR.exists():
        for f in VENUES_DIR.glob("*.json"):
            with open(f, encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, list):
                    venues.extend(data)
                else:
                    venues.append(data)
    # Also try the directory_ready.csv import format
    csv_path = DATA_DIR / "validated" / "directory_ready.csv"
    if not venues and csv_path.exists():
        import csv
        with open(csv_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            venues = list(reader)
    return venues

def load_existing_vendors():
    """Load all vendors from data/vendors/ JSON files."""
    vendors = {}
    if VENDOR_DIR.exists():
        for f in VENDOR_DIR.glob("*.json"):
            with open(f, encoding="utf-8") as fh:
                data = json.load(fh)
                for v in data:
                    vendors[v.get("place_id", v.get("slug",""))] = v
    return vendors

def save_vendor(vendor):
    """Append a vendor to the appropriate category JSON file."""
    cat = vendor.get("category", "unknown")
    path = VENDOR_DIR / f"{cat}.json"
    existing = []
    if path.exists():
        with open(path, encoding="utf-8") as f:
            existing = json.load(f)
    # Deduplicate by name
    names = {v.get("name","").lower() for v in existing}
    if vendor.get("name","").lower() not in names:
        existing.append(vendor)
        existing.sort(key=lambda x: x.get("vendor_readiness_score",0), reverse=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
        return True
    return False

def slugify(t):
    t = re.sub(r"[^\w\s-]", "", t.lower().strip())
    return re.sub(r"-+", "-", re.sub(r"[\s_]+", "-", t))


# ---------------------------------------------------------------------------
# WEB FETCHING
# ---------------------------------------------------------------------------

def fetch_page(url, timeout=10):
    """Fetch a webpage and return cleaned text."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        # Remove scripts, styles, nav, footer
        for tag in soup(["script","style","nav","footer","header","noscript"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        # Collapse whitespace
        text = re.sub(r"\s+", " ", text)
        return text[:8000], soup  # Limit to 8000 chars for Claude
    except Exception as e:
        return None, None

def find_preferred_vendor_url(base_url, soup):
    """Look for a preferred vendors page link on the venue website."""
    if not soup:
        return None
    for link in soup.find_all("a", href=True):
        href = link.get("href","").lower()
        text = link.get_text().lower()
        for keyword in PREFERRED_VENDOR_KEYWORDS:
            if keyword in href or keyword in text:
                full_url = urljoin(base_url, link["href"])
                return full_url
    return None


# ---------------------------------------------------------------------------
# CLAUDE EXTRACTION
# ---------------------------------------------------------------------------

def extract_venue_details(text, venue_name, website_url):
    """Use Claude to extract structured venue details from website text."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = f"""Extract wedding venue details from this website text for "{venue_name}".

Website: {website_url}
Text: {text[:6000]}

Return ONLY valid JSON, no markdown:
{{
  "description": "150-200 word wedding-focused description",
  "capacity_min": null,
  "capacity_max": null,
  "catering": "in-house|external|both|unknown",
  "indoor_outdoor": "indoor|outdoor|both",
  "coordinator_name": null,
  "coordinator_phone": null,
  "coordinator_email": null,
  "packages": "brief summary or null",
  "pricing_notes": "any pricing info or null",
  "instagram_handle": "handle without @ or null",
  "accommodations": "yes/no/number of rooms or null",
  "preferred_vendor_page_url": "full URL to preferred vendors page or null"
}}

Set any field to null if not found. Do not guess."""

        msg = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=800,
            messages=[{"role":"user","content":prompt}],
        )
        raw = msg.content[0].text.strip().strip("```json").strip("```").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"    [Claude error] {e}")
        return None

def extract_preferred_vendors(text, venue_name, page_url):
    """Use Claude to extract preferred vendor list from a vendors page."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = f"""Extract the preferred/recommended vendor list from this wedding venue page for "{venue_name}".

Page URL: {page_url}
Text: {text[:6000]}

Return ONLY valid JSON, no markdown:
{{
  "vendors": [
    {{
      "name": "Business Name",
      "category": "photographer|videographer|dj|florist|officiant|hair_makeup|catering|cake|limo|photo_booth|lighting_decor|wedding_planner|unknown",
      "website": "https://... or null",
      "phone": "phone or null",
      "instagram": "handle without @ or null",
      "notes": "any notes about them or null"
    }}
  ]
}}

Return empty vendors array if none found."""

        msg = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1500,
            messages=[{"role":"user","content":prompt}],
        )
        raw = msg.content[0].text.strip().strip("```json").strip("```").strip()
        result = json.loads(raw)
        return result.get("vendors", [])
    except Exception as e:
        print(f"    [Claude error extracting vendors] {e}")
        return []


# ---------------------------------------------------------------------------
# MAIN PIPELINE
# ---------------------------------------------------------------------------

def enrich_venue(venue, existing_vendors, log):
    """Enrich a single venue record."""
    name    = venue.get("name", "Unknown")
    website = venue.get("website", "")
    slug    = venue.get("slug", slugify(name))
    place_id = venue.get("place_id", "")

    if not website:
        print(f"  [SKIP] No website: {name}")
        return venue, []

    if slug in log.get("enriched", []):
        print(f"  [SKIP] Already enriched: {name}")
        return venue, []

    if slug in log.get("failed", []):
        print(f"  [SKIP] Previously failed: {name}")
        return venue, []

    print(f"  Enriching: {name}")
    print(f"    URL: {website}")

    # Fetch venue website
    text, soup = fetch_page(website)
    if not text:
        print(f"    [WARN] Could not fetch website")
        log["failed"].append(slug)
        return venue, []

    # Extract venue details
    details = extract_venue_details(text, name, website)
    time.sleep(0.5)

    new_vendors = []

    if details:
        # Update venue record with extracted details
        for field in ["description","capacity_min","capacity_max","catering",
                      "indoor_outdoor","coordinator_name","coordinator_phone",
                      "coordinator_email","packages","pricing_notes",
                      "instagram_handle","accommodations"]:
            if details.get(field) is not None:
                venue[field] = details[field]
                print(f"    + {field}: {str(details[field])[:60]}")

        # Check for preferred vendor page
        pref_url = details.get("preferred_vendor_page_url")
        if not pref_url:
            pref_url = find_preferred_vendor_url(website, soup)

        if pref_url:
            print(f"    Found preferred vendors page: {pref_url}")
            pref_text, _ = fetch_page(pref_url)
            time.sleep(0.5)
            if pref_text:
                vendors = extract_preferred_vendors(pref_text, name, pref_url)
                print(f"    Extracted {len(vendors)} preferred vendors")
                for v in vendors:
                    vname = v.get("name","")
                    if not vname:
                        continue
                    # Check if already in our DB
                    vname_lower = vname.lower()
                    found = any(
                        vname_lower in ev.get("name","").lower() or
                        ev.get("name","").lower() in vname_lower
                        for ev in existing_vendors.values()
                    )
                    if found:
                        print(f"      Already in DB: {vname}")
                    else:
                        print(f"      NEW vendor: {vname} ({v.get('category')})")
                        new_vendors.append({
                            "place_id": f"ref-{slugify(vname)}-{slug[:8]}",
                            "slug": slugify(vname) + "-ref",
                            "name": vname,
                            "category": v.get("category","unknown"),
                            "address": "", "city": "", "province": "ON",
                            "region": venue.get("region","niagara"),
                            "phone": v.get("phone",""),
                            "website": v.get("website",""),
                            "instagram_handle": v.get("instagram",""),
                            "google_rating": None,
                            "review_count": 0,
                            "vendor_readiness_score": 70,
                            "score_reasoning": f"Preferred vendor at {name}",
                            "description": v.get("notes",""),
                            "price_tier": "unknown",
                            "is_pic_booth": False,
                            "is_niagara_photo_booth": False,
                            "source": f"venue_referral:{slug}",
                            "recommended_by_venues": [slug],
                            "scraped_at": datetime.now(timezone.utc).isoformat(),
                        })

    venue["enriched_at"] = datetime.now(timezone.utc).isoformat()
    log["enriched"].append(slug)
    if new_vendors:
        log["vendors_discovered"].extend([v["name"] for v in new_vendors])

    return venue, new_vendors


def run(limit=50, run_all=False, venue_slug=None):
    venues = load_venues()
    existing_vendors = load_existing_vendors()
    log = load_log()

    if not venues:
        print("ERROR: No venues found. Check data/venues/ or data/validated/directory_ready.csv")
        sys.exit(1)

    print(f"\nLoaded {len(venues)} venues")
    print(f"Loaded {len(existing_vendors)} existing vendors")
    print(f"Previously enriched: {len(log.get('enriched',[]))}")

    # Filter
    if venue_slug:
        venues = [v for v in venues if v.get("slug") == venue_slug]
        if not venues:
            print(f"Venue not found: {venue_slug}")
            sys.exit(1)
    else:
        # Skip already processed
        already_done = set(log.get("enriched",[]) + log.get("failed",[]))
        venues = [v for v in venues if v.get("slug","") not in already_done and v.get("website")]
        if not run_all:
            venues = venues[:limit]

    print(f"Processing {len(venues)} venues\n{'='*60}")

    processed = 0
    total_new_vendors = 0

    for venue in venues:
        updated_venue, new_vendors = enrich_venue(venue, existing_vendors, log)

        # Save updated venue back
        venue_path = VENUES_DIR / f"{venue.get('slug','unknown')}.json"
        VENUES_DIR.mkdir(parents=True, exist_ok=True)
        with open(venue_path, "w", encoding="utf-8") as f:
            json.dump(updated_venue, f, indent=2, ensure_ascii=False)

        # Save new vendors
        for v in new_vendors:
            if save_vendor(v):
                existing_vendors[v["place_id"]] = v
                total_new_vendors += 1

        processed += 1
        save_log(log)
        time.sleep(1)  # Rate limit

    print(f"\n{'='*60}")
    print(f"Processed: {processed} venues")
    print(f"New vendors discovered: {total_new_vendors}")
    print(f"Total enriched: {len(log['enriched'])}")
    if log.get("vendors_discovered"):
        print(f"\nNew vendors found via preferred lists:")
        for vname in log["vendors_discovered"][-20:]:
            print(f"  + {vname}")


def main():
    parser = argparse.ArgumentParser(description="Venue Website Enrichment")
    parser.add_argument("--limit", type=int, default=50, help="Venues to process per run")
    parser.add_argument("--all", action="store_true", help="Process all venues")
    parser.add_argument("--venue-slug", help="Process a single venue by slug")
    args = parser.parse_args()

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set in .env")
        sys.exit(1)

    run(limit=args.limit, run_all=args.all, venue_slug=args.venue_slug)


if __name__ == "__main__":
    main()
