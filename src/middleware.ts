import { NextRequest, NextResponse } from "next/server";
import { ALL_REGIONAL_DOMAINS } from "@/lib/wedding-site";

const COOKIE_NAME = "owv_plan_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

/* ─── /api/* rate limiter ───────────────────────────────────────────────
 * Sliding-window counter, in-process Map. 30 requests per minute per IP
 * across all /api/* routes. No external dependency — fine for a single
 * Vercel region; if we ever go multi-region this needs Redis.
 *
 * Exempt paths: /api/plan/save (autosave fires constantly while couples
 * are editing) and /api/rsvp (guests on the wedding-site subdomain can
 * legitimately burst when an RSVP link is shared).
 */
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_EXEMPT = ["/api/plan/save", "/api/rsvp"];

type RateHit = { count: number; resetAt: number };
const rateMap = new Map<string, RateHit>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const hit = rateMap.get(ip);
  if (!hit || hit.resetAt <= now) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }
  if (hit.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)) };
  }
  hit.count += 1;
  return { ok: true };
}

/* Opportunistic garbage collection — keep the map from growing forever. */
function maybeGcRateMap(): void {
  if (rateMap.size < 5000) return;
  const now = Date.now();
  for (const [ip, hit] of rateMap) {
    if (hit.resetAt <= now) rateMap.delete(ip);
  }
}

/**
 * Middleware does two things:
 *
 * 1. Subdomain routing for couple wedding websites.
 *    When the host is `{slug}.{regional-domain}` (e.g. alice-and-bob.
 *    niagaraweddingvenues.com), rewrite internally to /wedding/{slug}
 *    so the dynamic route can render that couple's site. Apex and "www"
 *    fall through to the regular OWV pages (those domains 301 to OWV via
 *    Vercel-level redirects).
 *
 * 2. Mint the plan-session cookie on first visit to /plan or /api/plan/*.
 *    Lives on this same middleware so we don't fight Next over which
 *    matcher wins — one handler, both behaviors.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const pathname = req.nextUrl.pathname;

  /* 0. Rate-limit /api/* — runs before anything else so the limiter
   *    can short-circuit the rest of middleware. */
  if (pathname.startsWith("/api/") && !RATE_LIMIT_EXEMPT.includes(pathname)) {
    const ip = clientIp(req);
    const verdict = checkRateLimit(ip);
    if (!verdict.ok) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After":  String(verdict.retryAfter),
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
    maybeGcRateMap();
  }

  /* 1. Wedding-website subdomain rewrite */
  for (const domain of ALL_REGIONAL_DOMAINS) {
    /* Exact apex or www — pass through; don't rewrite */
    if (host === domain || host === `www.${domain}`) break;

    /* Subdomain — extract and rewrite */
    if (host.endsWith(`.${domain}`)) {
      const subdomain = host.slice(0, host.length - domain.length - 1);
      if (
        subdomain &&
        subdomain !== "www" &&
        /* Don't rewrite if we're already on the rewrite target — Next
         * sometimes re-runs middleware after a rewrite. */
        !pathname.startsWith("/weddings/")
      ) {
        const url = req.nextUrl.clone();
        url.pathname = `/weddings/${subdomain}${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(url);
      }
      break;
    }
  }

  /* 2. Plan-session cookie minting — only on /plan/* and /api/plan/* */
  const res = NextResponse.next();
  if (
    (pathname.startsWith("/plan") || pathname.startsWith("/api/plan")) &&
    !req.cookies.get(COOKIE_NAME)
  ) {
    res.cookies.set(COOKIE_NAME, crypto.randomUUID(), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR,
      path: "/",
    });
  }
  return res;
}

/* Run on everything except static assets + Next internals so subdomain
 * rewrites work site-wide. The handler short-circuits cheaply when the
 * host isn't a regional domain. */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     *   _next/static  · _next/image  · favicon.ico  · robots.txt
     *   sitemap.xml   · images/      · (file extensions)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/).*)",
  ],
};
