#!/usr/bin/env python3
"""
Bulk Yoast SEO audit + update for picbooth.ca.

For every published post:
  1. Fetch the post + its Yoast meta fields via the WordPress REST API.
  2. Flag missing _yoast_wpseo_title / _metadesc / _focuskw.
  3. Call Claude Haiku to fill in the missing fields.
  4. POST the meta updates back to /wp-json/wp/v2/posts/{id}.

This tool DOES NOT live in the OntarioWeddingVendors codebase — it
just happens to live in this repo's scripts/picbooth-yoast/ folder
for convenience. Run it from anywhere.

Setup
-----
Create a .env file in scripts/picbooth-yoast/ with:
  WP_BASE_URL=https://picbooth.ca
  WP_USERNAME=your-app-username
  WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
  ANTHROPIC_API_KEY=sk-ant-...

WP_APP_PASSWORD is a WordPress Application Password
(Users → Profile → Application Passwords), NOT your login password.

Usage
-----
  python wp_seo_bulk_update.py --limit 10 --dry-run    # smoke test
  python wp_seo_bulk_update.py --limit 10 --confirm    # update 10
  python wp_seo_bulk_update.py --confirm               # full batch

Cost
----
Claude Haiku at ~$0.001 per generation. 87 posts ≈ $0.09 total.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from base64 import b64encode
from pathlib import Path
from typing import Any, Dict, List, Optional

# ─── .env loader (no extra deps) ─────────────────────────────────────


def load_env(env_path: Optional[Path] = None) -> None:
    candidates = []
    if env_path:
        candidates.append(env_path)
    candidates += [
        Path(__file__).parent / ".env",
        Path.cwd() / ".env",
    ]
    for p in candidates:
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        return


# ─── HTTP helpers ────────────────────────────────────────────────────


def http_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    body: Optional[Dict[str, Any]] = None,
    timeout: int = 30,
) -> Dict[str, Any]:
    data = None
    hdrs = {"accept": "application/json", "user-agent": "picbooth-yoast/1.0"}
    if headers:
        hdrs.update(headers)
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs["content-type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return {
                "status":  resp.status,
                "body":    json.loads(raw) if raw else None,
                "headers": dict(resp.headers.items()),
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(err_body)
        except Exception:
            err_json = err_body
        raise RuntimeError(f"HTTP {e.code} {method} {url}: {err_json}")


def wp_auth_header() -> Dict[str, str]:
    user = os.environ.get("WP_USERNAME")
    pw   = os.environ.get("WP_APP_PASSWORD")
    if not user or not pw:
        sys.exit("WP_USERNAME + WP_APP_PASSWORD must be set (see scripts/picbooth-yoast/.env)")
    token = b64encode(f"{user}:{pw}".encode("utf-8")).decode("ascii")
    return {"authorization": f"Basic {token}"}


def wp_base_url() -> str:
    url = os.environ.get("WP_BASE_URL")
    if not url:
        sys.exit("WP_BASE_URL must be set (e.g. https://picbooth.ca)")
    return url.rstrip("/")


# ─── WP REST: list posts + fetch Yoast meta ──────────────────────────


def list_all_posts(limit: Optional[int]) -> List[Dict[str, Any]]:
    """Walk /posts pages until we hit `limit` or run out."""
    base = wp_base_url()
    out:  List[Dict[str, Any]] = []
    page = 1
    while True:
        per_page = 100 if (limit is None or limit - len(out) > 100) else max(1, limit - len(out))
        url = f"{base}/wp-json/wp/v2/posts?per_page={per_page}&page={page}&_fields=id,title,link,content,meta,yoast_head_json,status"
        try:
            r = http_request(url, headers=wp_auth_header())
        except RuntimeError as e:
            # WP returns a 400 on page-past-end; treat as end of pagination
            if "rest_post_invalid_page_number" in str(e):
                break
            raise
        rows = r.get("body") or []
        if not isinstance(rows, list) or len(rows) == 0:
            break
        out.extend(rows)
        if limit is not None and len(out) >= limit:
            return out[:limit]
        if len(rows) < per_page:
            break
        page += 1
    return out


def yoast_fields_from_post(post: Dict[str, Any]) -> Dict[str, str]:
    """Read existing Yoast fields. Prefers meta.* (writable), falls back
    to yoast_head_json.* (read-only) for the audit signal."""
    meta = post.get("meta") or {}
    head = post.get("yoast_head_json") or {}
    return {
        "title":       meta.get("_yoast_wpseo_title")    or head.get("title")       or "",
        "metaDesc":    meta.get("_yoast_wpseo_metadesc") or head.get("description") or "",
        "focusKw":     meta.get("_yoast_wpseo_focuskw")  or "",
    }


# ─── Claude generation ───────────────────────────────────────────────


SYSTEM_PROMPT = """You write SEO metadata for Pic Booth Niagara — an Ontario wedding + event photo booth company.
Voice: warm, concrete, professional. Canadian English (colour, centre).
Return ONE JSON object with these exact keys:

{
  "seoTitle":     "Max 60 chars. Include the focus keyword + brand suffix '| Pic Booth Niagara' when room.",
  "metaDesc":     "Max 155 chars. Include the focus keyword + one concrete benefit + an implicit CTA.",
  "focusKeyword": "Primary keyword. Specific. 2-5 words. Lowercase. No brand name."
}

No markdown fences. No prose around the JSON."""


def call_claude(post_title: str, content_snippet: str) -> Dict[str, str]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ANTHROPIC_API_KEY must be set")

    user = (
        f"Blog post title: {post_title}\n\n"
        f"First 500 characters of the post body:\n{content_snippet}\n\n"
        "Return the JSON now."
    )
    r = http_request(
        "https://api.anthropic.com/v1/messages",
        method="POST",
        headers={
            "x-api-key":          api_key,
            "anthropic-version":  "2023-06-01",
        },
        body={
            "model":      "claude-haiku-4-5",
            "max_tokens": 600,
            "system":     SYSTEM_PROMPT,
            "messages":   [{"role": "user", "content": user}],
        },
        timeout=60,
    )
    body = r.get("body") or {}
    blocks = body.get("content") or []
    text = ""
    for b in blocks:
        if isinstance(b, dict) and b.get("type") == "text":
            text += b.get("text", "")
    text = text.strip()
    if text.startswith("```"):
        text = text.lstrip("`").lstrip("json").strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    parsed = json.loads(text)
    return {
        "seoTitle":     str(parsed.get("seoTitle",     "")).strip(),
        "metaDesc":     str(parsed.get("metaDesc",     "")).strip(),
        "focusKeyword": str(parsed.get("focusKeyword", "")).strip(),
    }


# ─── Strip HTML for the snippet sent to Claude ───────────────────────


def html_to_text(html: str, limit: int = 500) -> str:
    import re
    if not html:
        return ""
    s = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    s = re.sub(r"<style[\s\S]*?</style>",   " ", s, flags=re.IGNORECASE)
    s = re.sub(r"<[^>]+>",                  " ", s)
    s = re.sub(r"&nbsp;|&[a-z]+;", " ", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:limit]


# ─── Update a post's Yoast meta ──────────────────────────────────────


def update_post_meta(post_id: int, fields: Dict[str, str]) -> Dict[str, Any]:
    base = wp_base_url()
    url  = f"{base}/wp-json/wp/v2/posts/{post_id}"
    body = {
        "meta": {
            "_yoast_wpseo_title":    fields["seoTitle"],
            "_yoast_wpseo_metadesc": fields["metaDesc"],
            "_yoast_wpseo_focuskw":  fields["focusKeyword"],
        }
    }
    return http_request(url, method="POST", headers=wp_auth_header(), body=body)


# ─── Main flow ───────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bulk Yoast SEO audit + fill for picbooth.ca posts.",
    )
    parser.add_argument("--limit",   type=int, default=None, help="Cap the number of posts processed.")
    parser.add_argument("--dry-run", action="store_true",    help="Print what would change; don't write.")
    parser.add_argument("--confirm", action="store_true",    help="Actually update WordPress (otherwise dry-run).")
    parser.add_argument("--env",     type=str, default=None, help="Path to .env (default: scripts/picbooth-yoast/.env).")
    args = parser.parse_args()

    load_env(Path(args.env) if args.env else None)

    # Default to dry-run unless --confirm.
    dry_run = args.dry_run or not args.confirm

    print(f"[picbooth-yoast] mode = {'DRY-RUN' if dry_run else 'WRITE'}; limit = {args.limit or 'no limit'}")
    posts = list_all_posts(args.limit)
    print(f"[picbooth-yoast] fetched {len(posts)} posts")

    audited = 0
    fixed   = 0
    skipped = 0
    failed: List[int] = []

    for i, post in enumerate(posts, 1):
        post_id   = post["id"]
        title     = (post.get("title") or {}).get("rendered", "")
        link      = post.get("link", "")
        existing  = yoast_fields_from_post(post)
        missing   = [k for k in ("title", "metaDesc", "focusKw") if not existing[k]]
        audited += 1

        if not missing:
            print(f"  [{i}/{len(posts)}] OK  id={post_id}  '{title[:60]}'")
            skipped += 1
            continue

        snippet = html_to_text((post.get("content") or {}).get("rendered", ""))
        try:
            gen = call_claude(title, snippet)
        except Exception as e:
            print(f"  [{i}/{len(posts)}] FAIL Claude  id={post_id}  {e}")
            failed.append(post_id)
            continue

        # Only overwrite the specific keys that were missing — never
        # clobber a hand-curated field.
        final = {
            "seoTitle":     existing["title"]    or gen["seoTitle"],
            "metaDesc":     existing["metaDesc"] or gen["metaDesc"],
            "focusKeyword": existing["focusKw"]  or gen["focusKeyword"],
        }

        print(f"  [{i}/{len(posts)}] FIX id={post_id}  missing={','.join(missing)}")
        print(f"        title:    {final['seoTitle']}")
        print(f"        metaDesc: {final['metaDesc']}")
        print(f"        focusKw:  {final['focusKeyword']}")
        print(f"        url:      {link}")

        if dry_run:
            fixed += 1
            continue

        try:
            update_post_meta(post_id, final)
            fixed += 1
        except Exception as e:
            print(f"  [{i}/{len(posts)}] FAIL WP write id={post_id}  {e}")
            failed.append(post_id)
            continue

        # Gentle rate limit — WP can throttle hard updates.
        time.sleep(0.4)

    print("")
    print(f"[picbooth-yoast] audited={audited} fixed={fixed} skipped={skipped} failed={len(failed)}")
    if failed:
        print(f"[picbooth-yoast] failed ids: {failed}")
    if dry_run:
        print("[picbooth-yoast] DRY-RUN — re-run with --confirm to apply.")


if __name__ == "__main__":
    main()
