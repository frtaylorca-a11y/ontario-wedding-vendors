# encoding: utf-8
"""
enrich_venues.py -- Venue Website Enrichment (Neon DB version)
Reads venues from Neon, fetches websites, extracts details and preferred vendors.

Usage:
  python enrich_venues.py --limit 20
  python enrich_venues.py --all
  python enrich_venues.py --slug white-oaks-resort-niagara
  python enrich_venues.py --dry-run --limit 3
"""

import os, sys, json, time, argparse, re
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urljoin

import requests
import psycopg2
import psycopg2.extras
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DATABASE_URL      = os.getenv("DATABASE_URL_UNPOOLED") or os.getenv("DATABASE_URL")

DATA_DIR   = Path("data")
LOG_FILE   = DATA_DIR / "enrichment-log.json"
VENDOR_DIR = DATA_DIR / "vendors"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9",
}

PREFERRED_VENDOR_KEYWORDS = [
    "preferred vendor", "preferred partners", "recommended vendor",
    "trusted vendor", "vendor list", "our vendors", "partner vendor",
    "recommended partners", "friends and family", "vendor friends",
    "preferred supplier", "preferred wedding",
]

def get_conn():
    return psycopg2.connect(DATABASE_URL, connect_timeout=15)

def get_venues(conn, limit=20, slug=None, run_all=False):
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if slug:
        cur.execute("SELECT * FROM venues WHERE slug = %s", (slug,))
    elif run_all:
        cur.execute("""
            SELECT * FROM venues
            WHERE website IS NOT NULL AND website != ''
            AND wedding_readiness_score >= 50
            ORDER BY wedding_readiness_score DESC
        """)
    else:
        cur.execute("""
            SELECT * FROM venues
            WHERE website IS NOT NULL AND website != ''
            AND wedding_readiness_score >= 50
            AND (description IS NULL OR length(description) < 100)
            ORDER BY wedding_readiness_score DESC
            LIMIT %s
        """, (limit,))
    rows = cur.fetchall()
    cur.close()
    return [dict(r) for r in rows]

def update_venue(conn, venue_id, updates, dry_run=False):
    if not updates or dry_run:
        return
    cols = ", ".join(f"{k} = %s" for k in updates.keys())
    vals = list(updates.values()) + [venue_id]
    cur = conn.cursor()
    cur.execute(f"UPDATE venues SET {cols}, updated_at = NOW() WHERE id = %s", vals)
    conn.commit()
    cur.close()

def vendor_exists_by_name(conn, name):
    cur = conn.cursor()
    cur.execute("""
        SELECT id FROM vendors
        WHERE lower(name) = lower(%s) OR lower(name) LIKE lower(%s)
        LIMIT 1
    """, (name, f"%{name}%"))
    row = cur.fetchone()
    cur.close()
    return row is not None

def slugify(t):
    t = re.sub(r"[^\w\s-]", "", t.lower().strip())
    return re.sub(r"-+", "-", re.sub(r"[\s_]+", "-", t))

def load_log():
    if LOG_FILE.exists():
        with open(LOG_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"enriched": [], "failed": [], "vendors_discovered": []}

def save_log(log):
    DATA_DIR.mkdir(exist_ok=True)
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2)

def save_vendor_local(vendor):
    VENDOR_DIR.mkdir(exist_ok=True)
    cat = vendor.get("category", "unknown")
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

def fetch_page(url, timeout=12):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script","style","nav","footer","header","noscript","aside"]):
            tag.decompose()
        text = re.sub(r"\s+", " ", soup.get_text(separator=" ", strip=True))
        return text[:8000], soup
    except Exception as e:
        return None, None

def find_preferred_vendor_url(base_url, soup):
    if not soup:
        return None
    for link in soup.find_all("a", href=True):
        href = link.get("href","").lower()
        text = link.get_text().lower().strip()
        for kw in PREFERRED_VENDOR_KEYWORDS:
            if kw in href or kw in text:
                full = urljoin(base_url, link["href"])
                if full.startswith("http"):
                    return full
    return None

def claude_extract_venue(text, name, url):
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = (
            f'Extract wedding venue details from this website for "{name}".\n'
            f"URL: {url}\nText: {text[:5000]}\n\n"
            "Return ONLY valid JSON, no markdown:\n"
            '{"description":"150-200 word wedding description","capacity_min":null,"capacity_max":null,'
            '"catering":"in-house or external or both or null","indoor_outdoor":"indoor or outdoor or both or null",'
            '"coordinator_name":null,"coordinator_phone":null,"coordinator_email":null,'
            '"packages":null,"pricing_notes":null,"instagram_handle":null,'
            '"accommodations":null,"preferred_vendor_page_url":null}\n'
            "Set null if not clearly stated. Do not guess."
        )
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

def claude_extract_vendors(text, venue_name, page_url):
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = (
            f'Extract preferred vendor list from this wedding venue page for "{venue_name}".\n'
            f"URL: {page_url}\nText: {text[:5000]}\n\n"
            "Return ONLY valid JSON:\n"
            '{"vendors":[{"name":"Business Name","category":"photographer or videographer or dj or florist or '
            'officiant or hair_makeup or catering or cake or limo or photo_booth or lighting_decor or wedding_planner or unknown",'
            '"website":null,"phone":null,"instagram":null,"notes":null}]}\n'
            "Return empty vendors array if no preferred vendor list found."
        )
        msg = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1500,
            messages=[{"role":"user","content":prompt}],
        )
        raw = msg.content[0].text.strip().strip("```json").strip("```").strip()
        return json.loads(raw).get("vendors", [])
    except Exception as e:
        print(f"    [Claude vendor extract error] {e}")
        return []

def enrich_venue(venue, conn, log, dry_run=False):
    name     = venue.get("name","Unknown")
    website  = venue.get("website","")
    slug     = venue.get("slug","")
    venue_id = venue.get("id")

    if slug in log.get("enriched",[]) or slug in log.get("failed",[]):
        print(f"  [SKIP] {name}")
        return 0

    print(f"\n  {'[DRY RUN] ' if dry_run else ''}Enriching: {name}")
    print(f"    {website}")

    text, soup = fetch_page(website)
    if not text:
        print(f"    [FAIL] Cannot fetch website")
        log["failed"].append(slug)
        return 0

    details = claude_extract_venue(text, name, website)
    time.sleep(0.5)

    new_vendors = 0
    updates = {}

    if details:
        field_map = {
            "description":"description","capacity_min":"capacity_min","capacity_max":"capacity_max",
            "catering":"catering","indoor_outdoor":"indoor_outdoor","coordinator_name":"coordinator_name",
            "coordinator_phone":"coordinator_phone","coordinator_email":"coordinator_email",
            "packages":"packages","pricing_notes":"pricing_notes",
            "instagram_handle":"instagram_handle","accommodations":"accommodations",
        }
        for src, dst in field_map.items():
            val = details.get(src)
            current = venue.get(dst)
            if val is not None and (not current or str(current).strip() in ("","unknown","null")):
                updates[dst] = val
                print(f"    + {dst}: {str(val)[:70]}")

        pref_url = details.get("preferred_vendor_page_url") or find_preferred_vendor_url(website, soup)

        if pref_url:
            print(f"    Preferred vendors page: {pref_url}")
            pref_text, _ = fetch_page(pref_url)
            time.sleep(0.5)
            if pref_text:
                vendors = claude_extract_vendors(pref_text, name, pref_url)
                print(f"    Found {len(vendors)} preferred vendors")
                for v in vendors:
                    vname = v.get("name","").strip()
                    if not vname:
                        continue
                    if vendor_exists_by_name(conn, vname):
                        print(f"      Already in DB: {vname}")
                    else:
                        print(f"      NEW: {vname} ({v.get('category','?')})")
                        if not dry_run:
                            nv = {
                                "place_id": f"ref-{slugify(vname)[:20]}",
                                "slug": slugify(vname)+"-ref",
                                "name": vname,
                                "category": v.get("category","unknown"),
                                "address":"","city":venue.get("city",""),
                                "province":"ON","region":venue.get("region","niagara"),
                                "phone":v.get("phone","") or "","website":v.get("website","") or "",
                                "instagram_handle":v.get("instagram","") or "",
                                "google_rating":None,"review_count":0,
                                "vendor_readiness_score":70,
                                "score_reasoning":f"Preferred vendor at {name}",
                                "description":v.get("notes","") or "",
                                "price_tier":"unknown",
                                "is_pic_booth":False,"is_niagara_photo_booth":False,
                                "source":f"venue_referral:{slug}",
                                "scraped_at":datetime.now(timezone.utc).isoformat(),
                            }
                            if save_vendor_local(nv):
                                log["vendors_discovered"].append(vname)
                                new_vendors += 1

    if updates:
        update_venue(conn, venue_id, updates, dry_run)
        print(f"    {'[DRY RUN] Would write' if dry_run else 'Wrote'} {len(updates)} fields to Neon")
    else:
        print(f"    Nothing new extracted")

    if not dry_run:
        log["enriched"].append(slug)

    return new_vendors

def run(limit=20, run_all=False, slug=None, dry_run=False):
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not in .env"); sys.exit(1)
    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not in .env"); sys.exit(1)

    log = load_log()
    print("\nConnecting to Neon...")
    conn = get_conn()
    print("Connected.")

    venues = get_venues(conn, limit=limit, slug=slug, run_all=run_all)
    print(f"Found {len(venues)} venues to process")
    if dry_run:
        print("DRY RUN — no DB writes\n" + "="*60)

    total_new = 0
    for venue in venues:
        total_new += enrich_venue(venue, conn, log, dry_run)
        save_log(log)
        time.sleep(1)

    conn.close()
    print(f"\n{'='*60}")
    print(f"Processed: {len(venues)} | New vendors: {total_new} | Total enriched: {len(log['enriched'])}")
    if log.get("vendors_discovered"):
        print("\nNew vendors via preferred lists:")
        for v in log["vendors_discovered"][-10:]:
            print(f"  + {v}")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--limit",   type=int, default=20)
    p.add_argument("--all",     action="store_true")
    p.add_argument("--slug",    help="Single venue slug")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    run(limit=args.limit, run_all=args.all, slug=args.slug, dry_run=args.dry_run)

if __name__ == "__main__":
    main()
