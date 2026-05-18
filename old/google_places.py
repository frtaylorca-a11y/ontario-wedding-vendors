"""
google_places.py — Google Places API discovery + venue website enrichment
Ontario Wedding Venues Scraper v2

Usage:
    python google_places.py --discover --cities niagara-on-the-lake niagara-falls
    python google_places.py --discover --all
    python google_places.py --enrich
    python google_places.py --clean
    python google_places.py --all
    python google_places.py --status
"""

import os
import re
import json
import time
import random
import logging
import argparse
from datetime import datetime, timezone
from pathlib import Path

import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────
GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
ANTHROPIC_KEY  = os.getenv("ANTHROPIC_API_KEY", "")
BASE_DIR       = Path(__file__).parent
DATA_DIR       = BASE_DIR / "data"
RAW_DIR        = DATA_DIR / "raw"
VALIDATED_DIR  = DATA_DIR / "validated"
CHECKPOINT_DIR = DATA_DIR / "checkpoints"

for d in [RAW_DIR, VALIDATED_DIR, CHECKPOINT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Ontario cities ────────────────────────────────────────────
ONTARIO_CITIES = [
    "Niagara-on-the-Lake, Ontario",
    "Niagara Falls, Ontario",
    "St. Catharines, Ontario",
    "Welland, Ontario",
    "Fort Erie, Ontario",
    "Grimsby, Ontario",
    "Lincoln, Ontario",
    "Pelham, Ontario",
    "Thorold, Ontario",
    "Port Colborne, Ontario",
    "Hamilton, Ontario",
    "Burlington, Ontario",
    "Oakville, Ontario",
    "Milton, Ontario",
    "Ancaster, Ontario",
    "Waterdown, Ontario",
    "Toronto, Ontario",
    "Mississauga, Ontario",
    "Brampton, Ontario",
    "Vaughan, Ontario",
    "Markham, Ontario",
    "Richmond Hill, Ontario",
    "Newmarket, Ontario",
    "Aurora, Ontario",
    "Ajax, Ontario",
    "Whitby, Ontario",
    "Oshawa, Ontario",
    "Pickering, Ontario",
    "King City, Ontario",
    "Caledon, Ontario",
    "Halton Hills, Ontario",
    "Barrie, Ontario",
    "Collingwood, Ontario",
    "Wasaga Beach, Ontario",
    "Orillia, Ontario",
    "Gravenhurst, Ontario",
    "Huntsville, Ontario",
    "Bracebridge, Ontario",
    "Midland, Ontario",
    "Innisfil, Ontario",
    "Kitchener, Ontario",
    "Waterloo, Ontario",
    "Cambridge, Ontario",
    "Guelph, Ontario",
    "Fergus, Ontario",
    "Elora, Ontario",
    "London, Ontario",
    "Windsor, Ontario",
    "Chatham, Ontario",
    "Stratford, Ontario",
    "Woodstock, Ontario",
    "Brantford, Ontario",
    "Simcoe, Ontario",
    "St. Thomas, Ontario",
    "Sarnia, Ontario",
    "Ottawa, Ontario",
    "Kingston, Ontario",
    "Belleville, Ontario",
    "Cobourg, Ontario",
    "Peterborough, Ontario",
    "Brockville, Ontario",
    "Cornwall, Ontario",
    "Perth, Ontario",
    "Carleton Place, Ontario",
    "Picton, Ontario",
    "Bloomfield, Ontario",
    "Owen Sound, Ontario",
    "Meaford, Ontario",
    "Thornbury, Ontario",
    "Bobcaygeon, Ontario",
    "Haliburton, Ontario",
    "Lindsay, Ontario",
]

SEARCH_QUERIES = [
    "wedding venue {city}",
    "wedding reception hall {city}",
    "winery wedding venue {city}",
    "wedding banquet hall {city}",
    "outdoor wedding venue {city}",
]

# ── Schema ────────────────────────────────────────────────────
SCHEMA = [
    "place_id", "name", "address", "city", "province", "postal_code",
    "phone", "website", "category", "capacity_min", "capacity_max",
    "coordinator_name", "coordinator_email", "venue_type",
    "catering", "accommodations", "indoor_outdoor",
    "rating", "review_count", "google_closed",
    "description", "packages", "source", "scraped_at",
]

# ── Exclusion filters ─────────────────────────────────────────
EXCLUDE_KEYWORDS = [
    "officiant", "minister", "reverend", " rev ", "photography",
    "photographer", "videographer", "florist", "catering company",
    "wedding planner", "dj ", " dj", "hair salon", "makeup artist",
    "bridal shop", "bridal boutique", "jewellery", "jewelry",
    "invitation", "limo ", "limousine", "shuttle",
]

CANADIAN_POSTAL_RE = re.compile(r'^[A-Za-z]\d[A-Za-z]')


# ════════════════════════════════════════════════════════════
# STEP 1 — Google Places Discovery
# ════════════════════════════════════════════════════════════

def search_places(query: str) -> list:
    url     = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params  = {"query": query, "region": "ca", "key": GOOGLE_API_KEY}
    results = []
    while True:
        try:
            r    = requests.get(url, params=params, timeout=15)
            data = r.json()
        except Exception as e:
            logger.warning(f"Search request failed: {e}")
            break
        status = data.get("status")
        if status == "ZERO_RESULTS":
            break
        if status != "OK":
            logger.warning(f"Places API: {status} — {data.get('error_message', '')}")
            break
        results.extend(data.get("results", []))
        next_token = data.get("next_page_token")
        if not next_token:
            break
        time.sleep(2)
        params = {"pagetoken": next_token, "key": GOOGLE_API_KEY}
    return results

def get_place_details(place_id: str) -> dict:
    url    = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields":   "name,formatted_address,formatted_phone_number,website,"
                    "rating,user_ratings_total,permanently_closed,"
                    "business_status,address_components,types",
        "key":      GOOGLE_API_KEY,
    }
    try:
        r    = requests.get(url, params=params, timeout=15)
        data = r.json()
        if data.get("status") == "OK":
            return data.get("result", {})
    except Exception as e:
        logger.warning(f"Place Details error: {e}")
    return {}

def get_component(components: list, ctype: str) -> str:
    for c in components:
        if ctype in c.get("types", []):
            return c.get("long_name", "")
    return ""

def get_country(components: list) -> str:
    for c in components:
        if "country" in c.get("types", []):
            return c.get("short_name", "")
    return ""

def is_ontario(components: list, address: str) -> bool:
    if get_country(components) not in ("CA", ""):
        return False
    if any(x in address for x in (", NY ", ", USA", "United States", ", NY\n")):
        return False
    postal = get_component(components, "postal_code")
    if postal and not CANADIAN_POSTAL_RE.match(postal):
        return False
    prov = get_component(components, "administrative_area_level_1")
    if prov and prov not in ("Ontario", "ON"):
        return False
    return True

def is_venue(name: str, components: list, address: str) -> bool:
    name_l = name.lower()
    if not is_ontario(components, address):
        return False
    if any(k in name_l for k in EXCLUDE_KEYWORDS):
        return False
    venue_kw = [
        "wedding", "venue", "hall", "estate", "manor", "winery", "vineyard",
        "resort", "inn", "hotel", "spa", "garden", "barn", "farm", "club",
        "banquet", "ballroom", "chateau", "castle", "conservation", "lodge",
        "retreat", "house", "restaurant", "bistro", "centre", "center",
        "park", "event", "terrace", "pavilion", "loft",
    ]
    return any(k in name_l for k in venue_kw)

def discover_city(city: str) -> list:
    seen    = set()
    records = []
    for query_tpl in SEARCH_QUERIES:
        query = query_tpl.format(city=city)
        logger.info(f"  Searching: {query}")
        try:
            places = search_places(query)
        except Exception as e:
            logger.warning(f"  Failed: {e}")
            continue
        for place in places:
            pid = place.get("place_id", "")
            if not pid or pid in seen:
                continue
            time.sleep(0.3)
            details    = get_place_details(pid)
            components = details.get("address_components", [])
            name       = details.get("name") or place.get("name", "")
            address    = details.get("formatted_address") or place.get("formatted_address", "")
            if not is_venue(name, components, address):
                continue
            seen.add(pid)
            r = {f: "" for f in SCHEMA}
            r["place_id"]      = pid
            r["name"]          = name
            r["address"]       = address
            r["city"]          = get_component(components, "locality") or city.split(",")[0]
            r["province"]      = "ON"
            r["postal_code"]   = get_component(components, "postal_code")
            r["phone"]         = details.get("formatted_phone_number", "")
            r["website"]       = details.get("website", "")
            r["rating"]        = str(details.get("rating") or place.get("rating", ""))
            r["review_count"]  = str(details.get("user_ratings_total") or
                                     place.get("user_ratings_total", ""))
            r["google_closed"] = "yes" if (
                details.get("permanently_closed") or
                details.get("business_status") == "CLOSED_PERMANENTLY"
            ) else "no"
            r["category"]      = "Wedding Venue"
            r["source"]        = "google_places"
            r["scraped_at"]    = datetime.now(timezone.utc).isoformat()
            records.append(r)
        time.sleep(random.uniform(1, 2))
    logger.info(f"  Found {len(records)} Ontario venues in {city}")
    return records

def run_discovery(cities: list = None):
    cities  = cities or ONTARIO_CITIES
    total   = len(cities)
    path    = RAW_DIR / "google_places.csv"
    ex_ids  = set()
    all_rec = []
    if path.exists():
        df_ex   = pd.read_csv(path, dtype=str).fillna("")
        ex_ids  = set(df_ex["place_id"].dropna().tolist())
        all_rec = df_ex.to_dict("records")
        logger.info(f"Loaded {len(all_rec)} existing records")
    for i, city in enumerate(cities, 1):
        slug = re.sub(r"[^a-z0-9]", "_", city.lower())
        cp   = CHECKPOINT_DIR / f"gplaces_{slug}.done"
        if cp.exists():
            logger.info(f"[{i}/{total}] {city} — skipping (done)")
            continue
        logger.info(f"[{i}/{total}] {city}...")
        try:
            records = discover_city(city)
            new     = [r for r in records if r["place_id"] not in ex_ids]
            all_rec.extend(new)
            for r in new:
                ex_ids.add(r["place_id"])
            pd.DataFrame(all_rec, columns=SCHEMA).to_csv(path, index=False)
            cp.touch()
            logger.info(f"  +{len(new)} new — {len(all_rec)} total")
        except Exception as e:
            logger.error(f"  ERROR: {e}")
        time.sleep(random.uniform(2, 4))
    logger.info(f"\nDiscovery complete — {len(all_rec)} total venues")


# ════════════════════════════════════════════════════════════
# STEP 2 — Clean (remove US results that slipped through)
# ════════════════════════════════════════════════════════════

def run_clean():
    path = RAW_DIR / "google_places.csv"
    if not path.exists():
        logger.error("No google_places.csv to clean")
        return
    df     = pd.read_csv(path, dtype=str).fillna("")
    before = len(df)
    us_zip  = df["postal_code"].str.match(r"^\d{5}$", na=False)
    us_addr = df["address"].str.contains(
        r",\s*(NY|PA|OH|MI|VT|ME|WA|CA|FL)\s+\d{5}", na=False, regex=True)
    us_text = df["address"].str.contains("USA|United States", na=False)
    df      = df[~(us_zip | us_addr | us_text)]
    df.to_csv(path, index=False)
    logger.info(f"Cleaned: removed {before - len(df)} non-Ontario records — {len(df)} remain")


# ════════════════════════════════════════════════════════════
# STEP 3 — Website Enrichment via Claude API
# ════════════════════════════════════════════════════════════

def fetch_website(url: str) -> str:
    if not url or not url.startswith("http"):
        return ""
    try:
        r = requests.get(
            url, timeout=12, allow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                     "Accept": "text/html"},
        )
        if r.status_code == 200:
            return r.text[:8000]
    except Exception:
        pass
    return ""

def extract_with_claude(name: str, html: str) -> dict:
    if not ANTHROPIC_KEY or not html:
        return {}
    prompt = f"""Extract wedding venue info from this website HTML.
Venue: {name}
HTML: {html}

Return ONLY valid JSON with these keys (empty string if not found):
{{
  "capacity_min": "min guests as number",
  "capacity_max": "max guests as number",
  "coordinator_name": "coordinator name if listed",
  "coordinator_email": "wedding email if listed",
  "venue_type": "winery|hotel|barn|estate|golf club|conservation area|restaurant|banquet hall|resort|other",
  "catering": "in-house only|open to outside caterers|both",
  "accommodations": "yes|no|nearby",
  "indoor_outdoor": "indoor|outdoor|both",
  "packages": "brief package description max 100 chars",
  "description": "2 warm professional sentences about venue max 150 chars"
}}"""
    try:
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_KEY,
                     "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            json={"model": "claude-sonnet-4-20250514", "max_tokens": 500,
                  "messages": [{"role": "user", "content": prompt}]},
            timeout=30,
        )
        text = r.json().get("content", [{}])[0].get("text", "")
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        logger.warning(f"Claude error for {name}: {e}")
        return {}

def run_enrichment():
    path = RAW_DIR / "google_places.csv"
    if not path.exists():
        logger.error("No google_places.csv — run --discover first")
        return
    df       = pd.read_csv(path, dtype=str).fillna("")
    enriched = 0
    for idx, row in df.iterrows():
        if str(row.get("capacity_max", "")).strip():
            continue
        website = str(row.get("website", "")).strip()
        if not website or row.get("google_closed") == "yes":
            continue
        name = str(row.get("name", ""))
        logger.info(f"  Enriching: {name}")
        html    = fetch_website(website)
        details = extract_with_claude(name, html)
        if details:
            for k, v in details.items():
                if k in df.columns and v:
                    df.at[idx, k] = str(v)
            enriched += 1
        if enriched % 10 == 0 and enriched > 0:
            df.to_csv(path, index=False)
            logger.info(f"  Checkpoint — {enriched} enriched")
        time.sleep(random.uniform(1.5, 3.0))
    df.to_csv(path, index=False)
    logger.info(f"Enrichment done — {enriched} venues enriched")


# ════════════════════════════════════════════════════════════
# Status
# ════════════════════════════════════════════════════════════

def run_status():
    path = RAW_DIR / "google_places.csv"
    if not path.exists():
        print("No google_places.csv yet — run --discover first")
        return
    df = pd.read_csv(path, dtype=str).fillna("")
    print(f"\nTotal records:            {len(df)}")
    print(f"With website:             {(df['website'].str.strip() != '').sum()}")
    print(f"Enriched (has capacity):  {(df['capacity_max'].str.strip() != '').sum()}")
    print(f"Has coordinator email:    {(df['coordinator_email'].str.strip() != '').sum()}")
    print(f"Permanently closed:       {(df['google_closed'] == 'yes').sum()}")
    print(f"Cities covered:           {df['city'].nunique()}")
    print(f"\nTop 10 cities:")
    for city, count in df["city"].value_counts().head(10).items():
        print(f"  {city:<35} {count}")


# ════════════════════════════════════════════════════════════
# CLI
# ════════════════════════════════════════════════════════════

def resolve_cities(args_cities):
    resolved = []
    for c in args_cities:
        clean = c.replace("-", " ").title()
        match = next((oc for oc in ONTARIO_CITIES if clean.lower() in oc.lower()), None)
        resolved.append(match or f"{clean}, Ontario")
    return resolved

def main():
    parser = argparse.ArgumentParser(description="Google Places venue discovery + enrichment")
    parser.add_argument("--discover", action="store_true")
    parser.add_argument("--enrich",   action="store_true")
    parser.add_argument("--clean",    action="store_true")
    parser.add_argument("--all",      action="store_true")
    parser.add_argument("--status",   action="store_true")
    parser.add_argument("--cities",   nargs="+")
    args = parser.parse_args()

    if not GOOGLE_API_KEY and not args.status:
        print("ERROR: GOOGLE_PLACES_API_KEY not set in .env")
        return

    cities = resolve_cities(args.cities) if args.cities else None

    if args.status:
        run_status()
    elif args.clean:
        run_clean()
    elif args.discover:
        n = len(cities) if cities else len(ONTARIO_CITIES)
        print(f"\nDiscovering venues — {n} cities")
        print(f"Est. cost: ~${n * len(SEARCH_QUERIES) * 0.032:.2f} USD\n")
        run_discovery(cities)
    elif args.enrich:
        if not ANTHROPIC_KEY:
            print("ERROR: ANTHROPIC_API_KEY not set in .env")
            return
        run_enrichment()
    elif args.all:
        n = len(cities) if cities else len(ONTARIO_CITIES)
        print(f"\nFull run — {n} cities")
        print(f"Est. cost: ~${n * len(SEARCH_QUERIES) * 0.032:.2f} USD\n")
        run_discovery(cities)
        run_clean()
        if ANTHROPIC_KEY:
            run_enrichment()
        else:
            print("Skipping enrichment — add ANTHROPIC_API_KEY to .env")
        run_status()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
