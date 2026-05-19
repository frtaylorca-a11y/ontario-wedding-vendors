# encoding: utf-8
"""
discover_web.py -- Web-Based Vendor Discovery
Finds vendors via Bing Search API, WeddingWire scraping, and review mentions.

Usage:
  python discover_web.py --source bing --category photographers
  python discover_web.py --source weddingwire --category all
  python discover_web.py --source reviews
  python discover_web.py --source all
"""

import os, sys, json, time, argparse, re
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GOOGLE_API_KEY    = os.getenv("GOOGLE_PLACES_API_KEY")
BING_API_KEY      = os.getenv("BING_API_KEY")  # Optional

DATA_DIR   = Path("data")
VENDOR_DIR = DATA_DIR / "vendors"
LOG_FILE   = DATA_DIR / "web-discovery-log.json"
MENTIONS_FILE = DATA_DIR / "review_mentioned_vendors.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9",
}

WEDDINGWIRE_CATEGORIES = {
    "photographers":    "wedding-photographers",
    "videographers":    "wedding-videographers",
    "djs":              "wedding-djs-bands",
    "florists":         "wedding-florists",
    "officiants":       "wedding-officiants-celebrants",
    "hair_makeup":      "wedding-beauty-health",
    "catering":         "wedding-catering",
    "wedding_planners": "wedding-planners-coordinators",
    "cake":             "wedding-cakes-desserts",
    "limo":             "wedding-transportation",
    "photo_booth":      "wedding-photo-booths",
    "lighting_decor":   "wedding-decorations-rentals",
}

NIAGARA_CITIES = ["st-catharines", "niagara-falls", "niagara-on-the-lake", "welland", "grimsby"]


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def load_log():
    if LOG_FILE.exists():
        with open(LOG_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"bing": [], "weddingwire": [], "reviews": []}

def save_log(log):
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2)

def load_existing_vendors():
    vendors = {}
    if VENDOR_DIR.exists():
        for f in VENDOR_DIR.glob("*.json"):
            with open(f, encoding="utf-8") as fh:
                for v in json.load(fh):
                    name = v.get("name","").lower()
                    if name:
                        vendors[name] = v
    return vendors

def save_vendor(vendor):
    cat = vendor.get("category","unknown")
    path = VENDOR_DIR / f"{cat}.json"
    existing = []
    if path.exists():
        with open(path, encoding="utf-8") as f:
            existing = json.load(f)
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

def is_already_known(name, existing):
    name_l = name.lower()
    for known in existing:
        if name_l in known or known in name_l:
            return True
    return False


# ---------------------------------------------------------------------------
# SOURCE 1: BING SEARCH
# ---------------------------------------------------------------------------

def search_bing(query, count=10):
    """Search Bing and return result URLs."""
    if not BING_API_KEY:
        return search_ddg(query)  # Fallback to DDG

    try:
        headers = {"Ocp-Apim-Subscription-Key": BING_API_KEY}
        params  = {"q": query, "count": count, "mkt": "en-CA", "safeSearch": "Moderate"}
        resp = requests.get(
            "https://api.bing.microsoft.com/v7.0/search",
            headers=headers, params=params, timeout=10
        )
        data = resp.json()
        results = data.get("webPages",{}).get("value",[])
        return [r.get("url","") for r in results if r.get("url")]
    except Exception as e:
        print(f"    [Bing error] {e}")
        return []

def search_ddg(query):
    """Fallback: DuckDuckGo instant answers (limited but free/keyless)."""
    try:
        params = {"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"}
        resp = requests.get("https://api.duckduckgo.com/", params=params, timeout=10)
        data = resp.json()
        urls = []
        for topic in data.get("RelatedTopics", []):
            url = topic.get("FirstURL","")
            if url:
                urls.append(url)
        return urls[:5]
    except Exception as e:
        print(f"    [DDG error] {e}")
        return []

def extract_vendor_from_page(url, category):
    """Fetch a vendor website and extract business info via Claude."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script","style","nav","footer"]):
            tag.decompose()
        text = re.sub(r"\s+", " ", soup.get_text(separator=" ", strip=True))[:4000]

        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = f"""Is this a wedding {category} business in Ontario, Canada?
If yes, extract the business details. If no, return null.

URL: {url}
Page text: {text[:3000]}

Return ONLY valid JSON or null:
{{
  "name": "Business Name",
  "phone": "phone or null",
  "city": "city in Ontario or null",
  "instagram": "handle without @ or null",
  "description": "1 sentence about their wedding services",
  "price_tier": "budget|mid|luxury|unknown",
  "is_wedding_vendor": true
}}"""

        msg = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=300,
            messages=[{"role":"user","content":prompt}],
        )
        raw = msg.content[0].text.strip().strip("```json").strip("```").strip()
        if raw.lower() == "null" or not raw.startswith("{"):
            return None
        return json.loads(raw)
    except Exception as e:
        return None

def run_bing_discovery(category, existing_vendors, log):
    """Discover vendors via Bing/DDG search."""
    queries = [
        f"wedding {category} Niagara Ontario",
        f"wedding {category} St Catharines Ontario",
        f"best wedding {category} Niagara 2026",
        f"wedding {category} Niagara Falls Ontario",
    ]

    new_count = 0
    seen_urls = set(log.get("bing",[]))

    for query in queries:
        print(f"  Searching: {query}")
        urls = search_bing(query)
        time.sleep(1)

        for url in urls:
            if url in seen_urls:
                continue
            if any(skip in url for skip in ["google.com","bing.com","facebook.com","instagram.com","theknot.com","weddingwire"]):
                continue

            seen_urls.add(url)
            log["bing"].append(url)

            vendor_data = extract_vendor_from_page(url, category)
            time.sleep(0.5)

            if not vendor_data:
                continue

            name = vendor_data.get("name","")
            if not name or is_already_known(name, existing_vendors):
                continue

            vendor = {
                "place_id": f"web-{slugify(name)[:20]}",
                "slug": slugify(name) + "-web",
                "name": name,
                "category": category,
                "address": "",
                "city": vendor_data.get("city",""),
                "province": "ON",
                "region": "niagara",
                "phone": vendor_data.get("phone",""),
                "website": url,
                "instagram_handle": vendor_data.get("instagram",""),
                "google_rating": None,
                "review_count": 0,
                "vendor_readiness_score": 55,
                "score_reasoning": "Web-discovered via search",
                "description": vendor_data.get("description",""),
                "price_tier": vendor_data.get("price_tier","unknown"),
                "is_pic_booth": False,
                "is_niagara_photo_booth": False,
                "source": "bing_search",
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }

            if save_vendor(vendor):
                print(f"    + New: {name}")
                existing_vendors[name.lower()] = vendor
                new_count += 1

    return new_count


# ---------------------------------------------------------------------------
# SOURCE 2: WEDDINGWIRE SCRAPING
# ---------------------------------------------------------------------------

def scrape_weddingwire_category(category, existing_vendors):
    """Scrape WeddingWire.ca for vendors in a category."""
    ww_cat = WEDDINGWIRE_CATEGORIES.get(category)
    if not ww_cat:
        print(f"  No WeddingWire mapping for {category}")
        return 0

    new_count = 0

    for city in NIAGARA_CITIES:
        url = f"https://www.weddingwire.ca/{ww_cat}/{city}--d2"
        print(f"  Scraping WeddingWire: {url}")

        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, "html.parser")

            # WeddingWire vendor cards — look for vendor listings
            # They use various class names — try common patterns
            vendor_cards = (
                soup.find_all("div", class_=re.compile(r"vendor-card|listing-card|storefront")) or
                soup.find_all("article", class_=re.compile(r"vendor|listing|storefront")) or
                soup.find_all("div", attrs={"data-testid": re.compile(r"vendor|listing")})
            )

            if not vendor_cards:
                # Try extracting all business names from the page text
                text = soup.get_text()
                print(f"    No vendor cards found ({len(text)} chars of text)")
                time.sleep(1)
                continue

            for card in vendor_cards[:20]:
                name_el = card.find(["h2","h3","h4","strong"], class_=re.compile(r"name|title|business"))
                if not name_el:
                    continue
                name = name_el.get_text(strip=True)
                if not name or is_already_known(name, existing_vendors):
                    continue

                # Try to get rating
                rating_el = card.find(class_=re.compile(r"rating|stars|score"))
                rating = None
                if rating_el:
                    try:
                        rating = float(re.search(r"\d+\.?\d*", rating_el.get_text()).group())
                    except:
                        pass

                # Try to get review count
                review_el = card.find(class_=re.compile(r"review|count"))
                review_count = 0
                if review_el:
                    try:
                        review_count = int(re.search(r"\d+", review_el.get_text()).group())
                    except:
                        pass

                # Try to get city
                city_el = card.find(class_=re.compile(r"city|location|address"))
                city_name = city_el.get_text(strip=True) if city_el else city.replace("-"," ").title()

                # Try to get vendor URL
                link = card.find("a", href=True)
                vendor_url = urljoin("https://www.weddingwire.ca", link["href"]) if link else None

                score = 50
                if rating and rating >= 4.5: score += 25
                elif rating and rating >= 4.0: score += 15
                if review_count >= 20: score += 15
                elif review_count >= 5: score += 5

                vendor = {
                    "place_id": f"ww-{slugify(name)[:20]}",
                    "slug": slugify(name) + "-ww",
                    "name": name,
                    "category": category,
                    "address": "",
                    "city": city_name,
                    "province": "ON",
                    "region": "niagara",
                    "phone": "",
                    "website": vendor_url or "",
                    "google_rating": rating,
                    "review_count": review_count,
                    "vendor_readiness_score": min(score, 90),
                    "score_reasoning": "WeddingWire listing",
                    "description": f"{name} is a {category} serving weddings in {city_name}, Ontario.",
                    "price_tier": "unknown",
                    "is_pic_booth": False,
                    "is_niagara_photo_booth": False,
                    "source": "weddingwire_scrape",
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }

                if save_vendor(vendor):
                    print(f"    + New: {name} ({city_name})")
                    existing_vendors[name.lower()] = vendor
                    new_count += 1

            time.sleep(2)

        except Exception as e:
            print(f"    [Error] {e}")
            time.sleep(2)

    return new_count


# ---------------------------------------------------------------------------
# SOURCE 3: REVIEW MENTIONS
# ---------------------------------------------------------------------------

def process_review_mentions(existing_vendors):
    """Turn high-mention unmatched vendors into proper vendor records."""
    if not MENTIONS_FILE.exists():
        print("No review mentions file found. Run mine_reviews.py first.")
        return 0

    with open(MENTIONS_FILE, encoding="utf-8") as f:
        mentions = json.load(f)

    new_count = 0
    # Process vendors mentioned 2+ times and not yet in DB
    candidates = [
        m for m in mentions.values()
        if m["mention_count"] >= 2 and not m["added_to_vendors"]
    ]
    candidates.sort(key=lambda x: x["mention_count"], reverse=True)

    print(f"  Found {len(candidates)} review-mentioned vendors to process")

    for m in candidates[:50]:
        name = m["name"]
        category = m["category"]

        if is_already_known(name, existing_vendors):
            m["added_to_vendors"] = True
            continue

        print(f"  Processing: {name} ({category}) — mentioned {m['mention_count']}x")

        # Try Google Places search to find them
        try:
            params = {
                "query": f"{name} Ontario Canada",
                "key": GOOGLE_API_KEY,
                "region": "ca",
            }
            resp = requests.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params=params, timeout=10
            )
            data = resp.json()
            time.sleep(0.3)

            if data.get("status") == "OK" and data.get("results"):
                result = data["results"][0]
                place_id = result.get("place_id")
                address  = result.get("formatted_address","")

                vendor = {
                    "place_id": place_id or f"rev-{slugify(name)[:20]}",
                    "slug": slugify(name) + "-rev",
                    "name": result.get("name", name),
                    "category": category,
                    "address": address,
                    "city": "",
                    "province": "ON",
                    "region": "niagara",
                    "phone": "",
                    "website": result.get("website",""),
                    "google_rating": result.get("rating"),
                    "review_count": result.get("user_ratings_total",0),
                    "vendor_readiness_score": 65 + (m["mention_count"] * 5),
                    "score_reasoning": f"Mentioned in {m['mention_count']} venue reviews",
                    "description": f"{name} has been mentioned by couples in Google reviews at {len(m['venues_mentioned_at'])} Niagara venues.",
                    "price_tier": "unknown",
                    "is_pic_booth": "pic booth" in name.lower(),
                    "is_niagara_photo_booth": "niagara photo booth" in name.lower(),
                    "source": "review_mention",
                    "mentioned_at_venues": m["venues_mentioned_at"],
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }

                if save_vendor(vendor):
                    print(f"    + Added: {vendor['name']} (score: {vendor['vendor_readiness_score']})")
                    existing_vendors[name.lower()] = vendor
                    m["added_to_vendors"] = True
                    new_count += 1

        except Exception as e:
            print(f"    [Error] {e}")

        time.sleep(0.5)

    # Save updated mentions
    with open(MENTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(mentions, f, indent=2, ensure_ascii=False)

    return new_count


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Web-Based Vendor Discovery")
    parser.add_argument("--source", choices=["bing","weddingwire","reviews","all"], default="weddingwire")
    parser.add_argument("--category", default="all", help="Vendor category or 'all'")
    args = parser.parse_args()

    existing_vendors = load_existing_vendors()
    log = load_log()

    print(f"\nLoaded {len(existing_vendors)} existing vendors")

    categories = list(WEDDINGWIRE_CATEGORIES.keys()) if args.category == "all" else [args.category]
    total_new = 0

    if args.source in ("bing", "all"):
        print(f"\n{'='*60}\nSOURCE: Bing/DDG Search\n{'='*60}")
        if not BING_API_KEY:
            print("Note: BING_API_KEY not set — using DuckDuckGo fallback (limited results)")
        for cat in categories:
            print(f"\nCategory: {cat.upper()}")
            new = run_bing_discovery(cat, existing_vendors, log)
            total_new += new
            print(f"  Added {new} new vendors")
            save_log(log)
            time.sleep(1)

    if args.source in ("weddingwire", "all"):
        print(f"\n{'='*60}\nSOURCE: WeddingWire.ca\n{'='*60}")
        for cat in categories:
            print(f"\nCategory: {cat.upper()}")
            new = scrape_weddingwire_category(cat, existing_vendors)
            total_new += new
            print(f"  Added {new} new vendors")
            time.sleep(2)

    if args.source in ("reviews", "all"):
        print(f"\n{'='*60}\nSOURCE: Review Mentions\n{'='*60}")
        new = process_review_mentions(existing_vendors)
        total_new += new
        print(f"  Added {new} new vendors from review mentions")

    print(f"\n{'='*60}")
    print(f"Total new vendors discovered: {total_new}")
    print(f"Total vendors in DB: {len(existing_vendors)}")


if __name__ == "__main__":
    main()
