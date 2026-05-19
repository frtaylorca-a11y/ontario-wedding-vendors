"""
vendor_search.py — Ontario Wedding Vendor Discovery
Same pipeline as google_places.py but for vendor categories.

Usage:
  python vendor_search.py --category photographers
  python vendor_search.py --category all
  python vendor_search.py --category djs --region niagara
  python vendor_search.py --list-categories
"""

import os
import sys
import json
import time
import argparse
import hashlib
import re
from pathlib import Path
from datetime import datetime

import requests
from dotenv import load_dotenv

load_dotenv()

# ── CONFIG ────────────────────────────────────────────────────────────────────

GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

OUTPUT_DIR = Path("data/vendors")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PLACES_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"

DETAIL_FIELDS = (
    "place_id,name,formatted_address,formatted_phone_number,"
    "website,rating,user_ratings_total,business_status,"
    "geometry,types,permanently_closed"
)

# ── CATEGORIES ────────────────────────────────────────────────────────────────

CATEGORIES = {
    "photographers": {
        "queries": [
            "wedding photographer Ontario",
            "wedding photography studio Ontario",
            "bridal photographer Niagara",
            "wedding photographer Toronto",
            "wedding photographer Hamilton",
        ],
        "negative": ["photo booth", "photobooth", "stock photo", "school photo"],
        "score_hints": "Look for: dedicated wedding portfolio, number of weddings shot, style (documentary/editorial/traditional), pricing packages listed.",
    },
    "videographers": {
        "queries": [
            "wedding videographer Ontario",
            "wedding cinematographer Ontario",
            "wedding films Ontario",
            "wedding video production Ontario",
        ],
        "negative": ["photo booth", "commercial video", "corporate video only"],
        "score_hints": "Look for: wedding highlight reels on website, cinematic vs traditional style, drone footage mentioned.",
    },
    "djs": {
        "queries": [
            "wedding DJ Ontario",
            "wedding DJ Niagara",
            "wedding DJ Toronto",
            "wedding DJ Hamilton",
            "wedding entertainment DJ Ontario",
        ],
        "negative": ["nightclub", "bar DJ", "club DJ", "radio DJ"],
        "score_hints": "Look for: dedicated wedding DJ service, MC services, lighting packages, online booking.",
    },
    "florists": {
        "queries": [
            "wedding florist Ontario",
            "bridal flowers Ontario",
            "wedding flower shop Niagara",
            "wedding floral design Toronto",
            "wedding florist Hamilton",
        ],
        "negative": ["grocery store flowers", "funeral flowers only", "silk flowers only"],
        "score_hints": "Look for: wedding portfolio on website, bridal bouquets, ceremony and reception arrangements, consultation booking.",
    },
    "officiants": {
        "queries": [
            "wedding officiant Ontario",
            "marriage commissioner Ontario",
            "wedding celebrant Ontario",
            "civil wedding ceremony Ontario",
            "non-denominational wedding officiant Ontario",
        ],
        "negative": ["funeral officiant", "religious only", "church only"],
        "score_hints": "Look for: licensed Ontario marriage officiant, ceremony customization, secular and religious options.",
    },
    "hair_makeup": {
        "queries": [
            "bridal hair and makeup Ontario",
            "wedding hair stylist Ontario",
            "bridal makeup artist Ontario",
            "wedding beauty Niagara",
            "bridal hair and makeup Toronto",
        ],
        "negative": ["hair salon general", "barbershop", "nail salon only"],
        "score_hints": "Look for: bridal party packages, on-location service, trial sessions, portfolio of bridal looks.",
    },
    "catering": {
        "queries": [
            "wedding catering Ontario",
            "wedding caterer Niagara",
            "wedding food catering Toronto",
            "wedding reception catering Hamilton",
            "farm to table wedding catering Ontario",
        ],
        "negative": ["fast food", "pizza delivery", "meal prep", "corporate only"],
        "score_hints": "Look for: wedding menu packages, tasting sessions, serving staff included, dietary accommodation.",
    },
    "wedding_planners": {
        "queries": [
            "wedding planner Ontario",
            "wedding coordinator Niagara",
            "day of wedding coordinator Ontario",
            "full service wedding planner Toronto",
            "wedding planning company Hamilton",
        ],
        "negative": ["event planning corporate only", "party planner"],
        "score_hints": "Look for: full planning vs day-of coordinator, vendor network, number of weddings managed.",
    },
    "cake": {
        "queries": [
            "wedding cake Ontario",
            "custom wedding cake Niagara",
            "wedding cake bakery Toronto",
            "wedding cake designer Hamilton",
            "wedding dessert table Ontario",
        ],
        "negative": ["grocery store", "mass production", "cupcake shop only"],
        "score_hints": "Look for: custom wedding cake design, tasting sessions, delivery and setup, portfolio.",
    },
    "limo": {
        "queries": [
            "wedding limousine Ontario",
            "wedding limo service Niagara",
            "bridal car rental Ontario",
            "wedding transportation Toronto",
            "luxury wedding car Hamilton",
        ],
        "negative": ["airport shuttle only", "taxi", "rideshare"],
        "score_hints": "Look for: wedding packages, fleet options (limo, SUV, vintage car), hours/pricing, chauffeur.",
    },
    "photo_booth": {
        "queries": [
            "photo booth rental Ontario wedding",
            "wedding photo booth Niagara",
            "photo booth hire Toronto wedding",
            "wedding photo booth Hamilton",
        ],
        "negative": ["photo studio", "photography only"],
        "score_hints": "Look for: wedding-specific packages, props, digital sharing, prints included.",
    },
    "lighting_decor": {
        "queries": [
            "wedding lighting Ontario",
            "wedding decor rental Ontario",
            "uplighting wedding Niagara",
            "marquee letters wedding Ontario",
            "wedding draping Ontario",
        ],
        "negative": ["Christmas lights", "commercial lighting", "electrical contractor"],
        "score_hints": "Look for: wedding uplighting, draping, marquee letters, dance floor lighting, custom packages.",
    },
}

# ── ONTARIO CITIES ────────────────────────────────────────────────────────────

REGIONS = {
    "niagara": [
        "St. Catharines ON", "Niagara Falls ON", "Niagara-on-the-Lake ON",
        "Welland ON", "Grimsby ON", "Fort Erie ON", "Pelham ON", "Thorold ON",
        "Lincoln ON", "West Lincoln ON",
    ],
    "gta": [
        "Toronto ON", "Mississauga ON", "Brampton ON", "Vaughan ON",
        "Markham ON", "Richmond Hill ON", "Oakville ON", "Burlington ON",
    ],
    "hamilton": [
        "Hamilton ON", "Stoney Creek ON", "Ancaster ON", "Dundas ON",
        "Waterdown ON",
    ],
    "muskoka": [
        "Huntsville ON", "Bracebridge ON", "Gravenhurst ON", "Port Carling ON",
    ],
    "waterloo": [
        "Kitchener ON", "Waterloo ON", "Cambridge ON", "Guelph ON",
    ],
    "eastern": [
        "Kingston ON", "Ottawa ON", "Belleville ON", "Peterborough ON",
    ],
    "pec": [
        "Picton ON", "Wellington ON", "Bloomfield ON",
    ],
    "ontario": None,  # uses category queries directly without city suffix
}

ALL_CITIES = [city for region in REGIONS.values() if region for city in region]


# ── HELPERS ───────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text


def place_id_hash(place_id: str) -> str:
    return hashlib.md5(place_id.encode()).hexdigest()[:8]


def load_existing(category: str) -> dict:
    path = OUTPUT_DIR / f"{category}.json"
    if path.exists():
        with open(path) as f:
            records = json.load(f)
        return {r["place_id"]: r for r in records}
    return {}


def save_results(category: str, records: dict):
    path = OUTPUT_DIR / f"{category}.json"
    data = list(records.values())
    data.sort(key=lambda x: x.get("vendor_readiness_score", 0), reverse=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {len(data)} vendors → {path}")


# ── GOOGLE PLACES ─────────────────────────────────────────────────────────────

def search_places(query: str, city: str = "") -> list[dict]:
    full_query = f"{query} {city}".strip()
    results = []
    params = {
        "query": full_query,
        "key": GOOGLE_API_KEY,
        "type": "establishment",
        "region": "ca",
    }
    while True:
        resp = requests.get(PLACES_SEARCH_URL, params=params, timeout=15)
        data = resp.json()
        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            print(f"    [WARN] Places API: {data.get('status')} for '{full_query}'")
            break
        results.extend(data.get("results", []))
        token = data.get("next_page_token")
        if not token:
            break
        time.sleep(2.5)
        params = {"pagetoken": token, "key": GOOGLE_API_KEY}
    return results


def get_place_details(place_id: str) -> dict:
    params = {
        "place_id": place_id,
        "fields": DETAIL_FIELDS,
        "key": GOOGLE_API_KEY,
    }
    resp = requests.get(PLACES_DETAIL_URL, params=params, timeout=15)
    data = resp.json()
    if data.get("status") != "OK":
        return {}
    return data.get("result", {})


# ── CLAUDE SCORING ────────────────────────────────────────────────────────────

def score_vendor_with_claude(vendor: dict, category: str, score_hints: str) -> dict:
    """Use Claude to score vendor wedding-readiness 0-100."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        prompt = f"""You are evaluating a wedding vendor for inclusion in an Ontario wedding directory.

Category: {category}
Vendor name: {vendor.get('name')}
Address: {vendor.get('address')}
Website: {vendor.get('website', 'none')}
Phone: {vendor.get('phone', 'none')}
Google rating: {vendor.get('google_rating')} ({vendor.get('review_count')} reviews)
Business status: {vendor.get('business_status')}

{score_hints}

Score this vendor 0-100 for wedding-readiness based on:
- 30 pts: Active business with phone/website
- 25 pts: High Google rating (4.0+ = 15pts, 4.5+ = 25pts)
- 20 pts: Significant review count (20+ = 10pts, 50+ = 20pts)
- 15 pts: Appears to actively serve wedding market
- 10 pts: Website exists and appears active

Also write a 1-2 sentence description for the directory listing.

Respond ONLY with valid JSON, no markdown:
{{"score": 75, "reasoning": "why", "description": "2 sentence description", "price_tier": "budget|mid|luxury|unknown"}}"""

        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        # Strip any markdown fences
        text = re.sub(r"```json|```", "", text).strip()
        result = json.loads(text)
        return result
    except Exception as e:
        print(f"    [Claude error] {e}")
        # Fallback scoring
        score = 30
        rating = vendor.get("google_rating") or 0
        reviews = vendor.get("review_count") or 0
        if rating >= 4.5:
            score += 25
        elif rating >= 4.0:
            score += 15
        if reviews >= 50:
            score += 20
        elif reviews >= 20:
            score += 10
        if vendor.get("website"):
            score += 10
        if vendor.get("phone"):
            score += 5
        return {
            "score": min(score, 100),
            "reasoning": "Scored by fallback algorithm",
            "description": f"{vendor['name']} is a {category} serving Ontario weddings.",
            "price_tier": "unknown",
        }


# ── MAIN PIPELINE ─────────────────────────────────────────────────────────────

def process_category(category: str, region: str = "ontario", skip_claude: bool = False):
    if category not in CATEGORIES:
        print(f"Unknown category: {category}")
        print(f"Available: {', '.join(CATEGORIES.keys())}")
        return

    cat_config = CATEGORIES[category]
    existing = load_existing(category)
    new_count = 0
    updated_count = 0

    print(f"\n{'='*60}")
    print(f"Category: {category.upper()}")
    print(f"Region: {region}")
    print(f"Existing records: {len(existing)}")
    print(f"{'='*60}")

    # Build city list
    if region == "ontario":
        cities = ALL_CITIES
    else:
        cities = REGIONS.get(region, ALL_CITIES)

    # Collect all place IDs
    discovered = {}

    for query in cat_config["queries"]:
        for city in cities[:8]:  # Limit cities per query to control API costs
            print(f"  Searching: {query} | {city}")
            results = search_places(query, city)
            time.sleep(0.5)

            for r in results:
                pid = r.get("place_id")
                if not pid or pid in discovered:
                    continue

                name = r.get("name", "")

                # Skip negatives
                name_lower = name.lower()
                skip = False
                for neg in cat_config.get("negative", []):
                    if neg.lower() in name_lower:
                        skip = True
                        break
                if skip:
                    continue

                # Skip permanently closed
                if r.get("business_status") == "CLOSED_PERMANENTLY":
                    continue

                discovered[pid] = {
                    "place_id": pid,
                    "name": name,
                    "address": r.get("formatted_address", ""),
                    "google_rating": r.get("rating"),
                    "review_count": r.get("user_ratings_total", 0),
                }

    print(f"\n  Discovered {len(discovered)} candidates")

    # Enrich + score each new vendor
    for i, (pid, basic) in enumerate(discovered.items()):
        if pid in existing:
            continue  # Already have this vendor

        print(f"  [{i+1}/{len(discovered)}] Enriching: {basic['name']}")

        # Get full details
        details = get_place_details(pid)
        time.sleep(0.3)

        if not details:
            continue

        # Build vendor record
        address = details.get("formatted_address", basic.get("address", ""))
        city = ""
        province = "ON"
        if address:
            parts = address.split(",")
            if len(parts) >= 2:
                city = parts[-3].strip() if len(parts) >= 3 else parts[-2].strip()

        vendor = {
            "place_id": pid,
            "slug": slugify(basic["name"]) + "-" + place_id_hash(pid),
            "name": basic["name"],
            "category": category,
            "address": address,
            "city": city,
            "province": province,
            "region": region if region != "ontario" else "",
            "phone": details.get("formatted_phone_number", ""),
            "website": details.get("website", ""),
            "google_rating": details.get("rating") or basic.get("google_rating"),
            "review_count": details.get("user_ratings_total") or basic.get("review_count", 0),
            "business_status": details.get("business_status", "OPERATIONAL"),
            "lat": details.get("geometry", {}).get("location", {}).get("lat"),
            "lng": details.get("geometry", {}).get("location", {}).get("lng"),
            "source": "google_places",
            "scraped_at": datetime.utcnow().isoformat(),
            "vendor_readiness_score": 0,
            "score_reasoning": "",
            "description": "",
            "price_tier": "unknown",
            "is_pic_booth": False,
            "is_niagara_photo_booth": False,
        }

        # Score with Claude
        if not skip_claude:
            print(f"    Scoring with Claude...")
            scored = score_vendor_with_claude(vendor, category, cat_config["score_hints"])
            vendor["vendor_readiness_score"] = scored.get("score", 0)
            vendor["score_reasoning"] = scored.get("reasoning", "")
            vendor["description"] = scored.get("description", "")
            vendor["price_tier"] = scored.get("price_tier", "unknown")
            time.sleep(0.5)  # Rate limit Claude

        existing[pid] = vendor
        new_count += 1

        # Save every 10 records
        if new_count % 10 == 0:
            save_results(category, existing)
            print(f"  Auto-saved ({new_count} new so far)")

    # Final save
    save_results(category, existing)

    # Summary
    all_vendors = list(existing.values())
    scoreable = [v for v in all_vendors if v.get("vendor_readiness_score", 0) >= 50]
    print(f"\n  ✓ Done: {new_count} new | {len(all_vendors)} total | {len(scoreable)} directory-ready (50+)")


def pin_pic_booth(category: str = "photo_booth"):
    """Pin Pic Booth and Niagara Photo Booth at top of photo booth category."""
    existing = load_existing(category)

    pic_booth = {
        "place_id": "picbooth-manual",
        "slug": "pic-booth-st-catharines",
        "name": "Pic Booth",
        "category": category,
        "address": "111 Fourth Ave, St. Catharines, ON L2S 3P5",
        "city": "St. Catharines",
        "province": "ON",
        "region": "niagara",
        "phone": "(905) 931-5709",
        "website": "https://picbooth.ca",
        "google_rating": 5.0,
        "review_count": 100,
        "business_status": "OPERATIONAL",
        "vendor_readiness_score": 100,
        "score_reasoning": "Owner-operated, JUNO Awards Official After Party credential",
        "description": "Pic Booth is Niagara's premium photo booth rental — JUNO Awards Official After Party provider, serving weddings across the Golden Horseshoe with the Magazine Booth, Mirror Booth, and One QR system.",
        "price_tier": "luxury",
        "is_pic_booth": True,
        "is_niagara_photo_booth": False,
        "source": "manual",
        "scraped_at": datetime.utcnow().isoformat(),
    }

    niagara_pb = {
        "place_id": "niagaraphotobooth-manual",
        "slug": "niagara-photo-booth",
        "name": "Niagara Photo Booth",
        "category": category,
        "address": "Niagara Region, ON",
        "city": "Niagara Falls",
        "province": "ON",
        "region": "niagara",
        "phone": "(905) 357-7720",
        "website": "https://niagaraphotobooth.com",
        "google_rating": 4.8,
        "review_count": 50,
        "business_status": "OPERATIONAL",
        "vendor_readiness_score": 90,
        "score_reasoning": "Budget-tier photo booth brand, Niagara region",
        "description": "Niagara Photo Booth offers affordable photo booth rental for weddings and events across the Niagara region.",
        "price_tier": "budget",
        "is_pic_booth": False,
        "is_niagara_photo_booth": True,
        "source": "manual",
        "scraped_at": datetime.utcnow().isoformat(),
    }

    existing["picbooth-manual"] = pic_booth
    existing["niagaraphotobooth-manual"] = niagara_pb
    save_results(category, existing)
    print(f"✓ Pinned Pic Booth + Niagara Photo Booth in {category}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Ontario Wedding Vendor Discovery")
    parser.add_argument("--category", default="photographers",
                        help="Category to scrape, or 'all' for all categories")
    parser.add_argument("--region", default="ontario",
                        choices=list(REGIONS.keys()),
                        help="Region to search (default: ontario = all cities)")
    parser.add_argument("--list-categories", action="store_true",
                        help="List available categories and exit")
    parser.add_argument("--skip-claude", action="store_true",
                        help="Skip Claude scoring (faster, uses fallback scoring)")
    parser.add_argument("--pin-pic-booth", action="store_true",
                        help="Pin Pic Booth manually in photo_booth category")
    args = parser.parse_args()

    if args.list_categories:
        print("\nAvailable categories:")
        for cat in CATEGORIES:
            print(f"  {cat}")
        return

    if args.pin_pic_booth:
        pin_pic_booth()
        return

    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_PLACES_API_KEY not set in .env")
        sys.exit(1)

    if args.category == "all":
        for cat in CATEGORIES:
            process_category(cat, args.region, args.skip_claude)
            time.sleep(2)
    else:
        process_category(args.category, args.region, args.skip_claude)


if __name__ == "__main__":
    main()
