/**
 * Cheap HTTP health check for vendor websites.
 *
 * Strategy: HEAD first (no body download); if the server doesn't
 * support HEAD or returns 4xx/5xx on it, fall back to GET with a
 * range-zero header so we still avoid pulling the whole page. We're
 * just trying to distinguish "real, reachable site" from "DNS dead /
 * 404 / blank / timeout" — not validating content.
 *
 * Status taxonomy on the vendor row:
 *   null        unchecked
 *   'ok'        2xx or 3xx — real, reachable
 *   'broken'    network failure, timeout, DNS fail, 4xx, 5xx, or
 *               returns 0 bytes
 *   'blocked'   403 / 429 / 451 — site exists but rejects our UA.
 *               Treat as visible-but-suspect; the renderer keeps the
 *               link but we know to retry with a different UA later.
 */

const TIMEOUT_MS = 8_000;

const REQUEST_HEADERS: HeadersInit = {
  /* Realistic Chrome UA — same one we use elsewhere to avoid bot
   * filters from blocking us spuriously. */
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-CA,en-US;q=0.9,en;q=0.8",
};

export type UrlCheckResult = {
  url:    string;
  valid:  boolean;                              /* true when status is 2xx/3xx */
  status: number;                               /* HTTP status, or 0 on network failure */
  kind:   "ok" | "broken" | "blocked";
  reason: string;
};

/* Normalize a URL — adds https:// if missing, returns null when the
 * input doesn't parse to a real http(s) URL. */
function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchOnce(url: string, method: "HEAD" | "GET"): Promise<{ status: number; bytes: number; err?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers:  REQUEST_HEADERS,
      redirect: "follow",
      signal:   AbortSignal.timeout(TIMEOUT_MS),
    });
    if (method === "GET") {
      /* Pull at most 1KB to confirm the body isn't empty without
       * tying up bandwidth on huge pages. */
      const reader = res.body?.getReader();
      let bytes = 0;
      if (reader) {
        try {
          for (let i = 0; i < 2; i++) {  /* up to ~2 chunks */
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes >= 1024) break;
          }
          await reader.cancel().catch(() => {});
        } catch { /* ignore body-read errors — status alone is enough */ }
      }
      return { status: res.status, bytes };
    }
    return { status: res.status, bytes: -1 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 0, bytes: 0, err: msg };
  }
}

export async function checkUrl(rawUrl: string | null | undefined): Promise<UrlCheckResult> {
  const url = normalizeUrl(rawUrl);
  if (!url) {
    return { url: rawUrl ?? "", valid: false, status: 0, kind: "broken", reason: "invalid url" };
  }

  /* First attempt — HEAD. Many servers respond fast here. */
  const head = await fetchOnce(url, "HEAD");

  if (head.status >= 200 && head.status < 400) {
    return { url, valid: true, status: head.status, kind: "ok", reason: `HEAD ${head.status}` };
  }

  /* Block-codes that mean "we exist but won't talk to bots." Site is
   * real; we just can't verify with our UA. Show the link, retry
   * later with a different UA if it matters. */
  if (head.status === 403 || head.status === 429 || head.status === 451) {
    /* Try GET — some servers 403 HEAD but 200 GET. */
    const get = await fetchOnce(url, "GET");
    if (get.status >= 200 && get.status < 400) {
      return { url, valid: true, status: get.status, kind: "ok", reason: `GET ${get.status} (HEAD ${head.status})` };
    }
    if (get.status === 403 || get.status === 429 || get.status === 451) {
      return { url, valid: true, status: get.status, kind: "blocked", reason: `blocked ${get.status}` };
    }
    /* HEAD blocked but GET failed for a different reason — fall
     * through to broken below. */
    head.status = get.status;
    head.err    = get.err;
  } else if (head.status === 405 || head.status === 0) {
    /* 405 = "HEAD not allowed". 0 = HEAD failed at the network layer.
     * Try GET as a fallback. */
    const get = await fetchOnce(url, "GET");
    if (get.status >= 200 && get.status < 400) {
      const blankBody = get.bytes === 0;
      if (blankBody) {
        return { url, valid: false, status: get.status, kind: "broken", reason: `GET ${get.status} but empty body` };
      }
      return { url, valid: true, status: get.status, kind: "ok", reason: `GET ${get.status}` };
    }
    if (get.status === 403 || get.status === 429 || get.status === 451) {
      return { url, valid: true, status: get.status, kind: "blocked", reason: `blocked ${get.status}` };
    }
    head.status = get.status;
    head.err    = get.err;
  }

  return {
    url,
    valid:  false,
    status: head.status,
    kind:   "broken",
    reason: head.err ? `network: ${head.err}` : `status ${head.status}`,
  };
}
