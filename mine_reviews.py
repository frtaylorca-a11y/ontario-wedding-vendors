# encoding: utf-8
"""
mine_reviews.py -- Google Reviews Vendor Mining
Extracts vendor mentions from Google reviews to build venue-vendor relationships.

Usage:
  python mine_reviews.py --limit 50
  python mine_reviews.py --all
"""

import os, sys, json, time, argparse, re
from pathlib import Path
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GOOGLE_API_KEY    = os.getenv("GOOGLE_PLACES_API_KEY")

DATA_DIR      = Path("data")
VENUES_DIR    = DATA_DIR / "venues"
VENDOR_DIR    = DATA_DIR / "vendors"
RELATIONS_FILE = DATA_DIR / "venue_vendor_relations.json"
MENTIONS_FILE  = DATA_DIR / "review_mentioned_vendors.json"
LOG_FILE       = DATA_DIR / "reviews-log.json"

PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def load_log():
    if LOG_FILE.exists():
        with open(LOG_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"processed": [], "failed": []}

def save_log(log):
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2)

def load_relations():
    if RELATIONS_FILE.exists():
        with open(RELATIONS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_relations(relations):
    with open(RELATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(relations, f, indent=2, ensure_ascii=False)

def load_mentions():
    if MENTIONS_FILE.exists():
        with open(MENTIONS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_mentions(mentions):
    with open(MENTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(mentions, f, indent=2, ensure_ascii=False)

def load_venues():
    venues = []
    if VENUES_DIR.exists():
        for f in VENUES_DIR.glob("*.json"):
            with open(f, encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, list):
                    venues.extend(data)
                else:
                    venues.append(data)
    if not venues:
        csv_path = DATA_DIR / "validated" / "directory_ready.csv"
        if csv_path.exists():
            import csv
            with open(csv_path, encoding="utf-8") as f:
                venues = list(csv.DictReader(f))
    return venues

def load_all_vendors():
    vendors = {}
    if VENDOR_DIR.exists():
        for f in VENDOR_DIR.glob("*.json"):
            with open(f, encoding="utf-8") as fh:
                for v in json.load(fh):
                    vendors[v.get("name","").lower()] = v
    return vendors

def slugify(t):
    t = re.sub(r"[^\w\s-]", "", t.lower().strip())
    return re.sub(r"-+", "-", re.sub(r"[\s_]+", "-", t))

def fuzzy_match_vendor(name, vendors):
    """Try to find a vendor in our DB by fuzzy name matching."""
    name_lower = name.lower().strip()
    # Exact match
    if name_lower in vendors:
        return vendors[name_lower]
    # Partial match
    for vname, vendor in vendors.items():
        if name_lower in vname or vname in name_lower:
            return vendor
        # Word overlap
        name_words = set(name_lower.split())
        v_words = set(vname.split())
        if len(name_words & v_words) >= 2:
            return vendor
    return None


# ---------------------------------------------------------------------------
# GOOGLE PLACES REVIEWS
# ---------------------------------------------------------------------------

def get_reviews(place_id):
    """Fetch reviews from Google Places Details API."""
    try:
        params = {
            "place_id": place_id,
            "fields": "reviews,name",
            "key": GOOGLE_API_KEY,
        }
        resp = requests.get(PLACES_DETAIL_URL, params=params, timeout=15)
        data = resp.json()
        if data.get("status") != "OK":
            return []
        return data.get("result", {}).get("reviews", [])
    except Exception as e:
        print(f"    [API error] {e}")
        return []


# ---------------------------------------------------------------------------
# CLAUDE EXTRACTION
# ---------------------------------------------------------------------------

def extract_vendor_mentions(reviews_text, venue_name):
    """Use Claude to extract vendor mentions from review text."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = f"""Extract any wedding vendor business mentions from these Google reviews for "{venue_name}".

Look for: photographer names, DJ/band names, florist names, caterer names, 
makeup/hair artists, officiants, videographers, photo booth companies, 
wedding planners, transportation companies, cake makers.

Reviews:
{reviews_text[:5000]}

Return ONLY valid JSON, no markdown:
{{
  "vendor_mentions": [
    {{
      "name": "Business or person name",
      "category": "photographer|videographer|dj|florist|officiant|hair_makeup|catering|cake|limo|photo_booth|wedding_planner|lighting_decor|unknown",
      "context": "the sentence mentioning them",
      "sentiment": "positive|neutral|negative"
    }}
  ]
}}

Only include clear vendor/business mentions. Return empty array if none found.
Do not include the venue itself."""

        msg = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=600,
            messages=[{"role":"user","content":prompt}],
        )
        raw = msg.content[0].text.strip().strip("```json").strip("```").strip()
        result = json.loads(raw)
        return result.get("vendor_mentions", [])
    except Exception as e:
        print(f"    [Claude error] {e}")
        return []


# ---------------------------------------------------------------------------
# MAIN PIPELINE
# ---------------------------------------------------------------------------

def process_venue(venue, all_vendors, relations, mentions, log):
    """Mine reviews for a single venue."""
    name     = venue.get("name", "Unknown")
    place_id = venue.get("place_id", "")
    slug     = venue.get("slug", slugify(name))

    if not place_id:
        return 0

    if slug in log.get("processed", []):
        return 0

    print(f"  Mining: {name}")

    # Fetch reviews
    reviews = get_reviews(place_id)
    time.sleep(0.3)

    if not reviews:
        print(f"    No reviews found")
        log["processed"].append(slug)
        return 0

    # Build review text
    review_texts = []
    for r in reviews:
        text = r.get("text","").strip()
        if text:
            review_texts.append(f'"{text}"')

    if not review_texts:
        log["processed"].append(slug)
        return 0

    combined = "\n\n".join(review_texts)
    print(f"    Found {len(review_texts)} reviews with text")

    # Extract vendor mentions
    vendor_mentions = extract_vendor_mentions(combined, name)
    time.sleep(0.5)

    new_relations = 0
    for mention in vendor_mentions:
        vname = mention.get("name","").strip()
        category = mention.get("category","unknown")
        sentiment = mention.get("sentiment","neutral")
        context = mention.get("context","")

        if not vname or sentiment == "negative":
            continue

        # Try to match in our vendor DB
        matched = fuzzy_match_vendor(vname, all_vendors)

        # Add to relations
        relation_key = f"{slug}:{slugify(vname)}"
        if relation_key not in relations:
            relations[relation_key] = {
                "venue_slug": slug,
                "venue_name": name,
                "vendor_name": vname,
                "vendor_slug": matched.get("slug") if matched else None,
                "vendor_category": category,
                "in_database": matched is not None,
                "sentiment": sentiment,
                "context": context[:200],
                "source": "google_review",
                "discovered_at": datetime.now(timezone.utc).isoformat(),
            }
            print(f"    + Relation: {vname} ({category}) {'[IN DB]' if matched else '[NEW]'}")
            new_relations += 1

        # Track unmatched vendors as discovery candidates
        if not matched:
            mention_key = vname.lower()
            if mention_key not in mentions:
                mentions[mention_key] = {
                    "name": vname,
                    "category": category,
                    "mention_count": 0,
                    "venues_mentioned_at": [],
                    "contexts": [],
                    "added_to_vendors": False,
                    "first_seen": datetime.now(timezone.utc).isoformat(),
                }
            mentions[mention_key]["mention_count"] += 1
            if slug not in mentions[mention_key]["venues_mentioned_at"]:
                mentions[mention_key]["venues_mentioned_at"].append(slug)
            if context and len(mentions[mention_key]["contexts"]) < 3:
                mentions[mention_key]["contexts"].append(context[:150])

    log["processed"].append(slug)
    return new_relations


def run(limit=50, run_all=False):
    venues = load_venues()
    all_vendors = load_all_vendors()
    relations = load_relations()
    mentions = load_mentions()
    log = load_log()

    print(f"\nLoaded {len(venues)} venues")
    print(f"Loaded {len(all_vendors)} vendors")
    print(f"Existing relations: {len(relations)}")
    print(f"Unmatched vendor mentions: {len(mentions)}")

    # Filter unprocessed venues with place_id
    processed_set = set(log.get("processed",[]))
    to_process = [
        v for v in venues
        if v.get("place_id") and
        v.get("slug","") not in processed_set and
        int(v.get("wedding_readiness_score",0) or 0) >= 50
    ]

    if not run_all:
        to_process = to_process[:limit]

    print(f"Processing {len(to_process)} venues\n{'='*60}")

    total_relations = 0

    for venue in to_process:
        new = process_venue(venue, all_vendors, relations, mentions, log)
        total_relations += new
        save_relations(relations)
        save_mentions(mentions)
        save_log(log)
        time.sleep(1)

    # Summary report
    print(f"\n{'='*60}")
    print(f"Total new relations found: {total_relations}")
    print(f"Total relations in DB: {len(relations)}")
    print(f"\nTop unmatched vendors (not in our DB):")
    top_unmatched = sorted(
        [m for m in mentions.values() if not m["added_to_vendors"]],
        key=lambda x: x["mention_count"],
        reverse=True
    )[:20]
    for m in top_unmatched:
        print(f"  {m['mention_count']:3}x {m['name']} ({m['category']}) — {len(m['venues_mentioned_at'])} venues")

    print(f"\nRun vendor_search.py for the top unmatched vendors above to add them to the DB.")


def main():
    parser = argparse.ArgumentParser(description="Mine Google Reviews for Vendor Mentions")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set in .env")
        sys.exit(1)
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_PLACES_API_KEY not set in .env")
        sys.exit(1)

    run(limit=args.limit, run_all=args.all)


if __name__ == "__main__":
    main()
