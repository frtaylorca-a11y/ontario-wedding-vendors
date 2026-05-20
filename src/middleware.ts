import { NextRequest, NextResponse } from "next/server";
import { ALL_REGIONAL_DOMAINS } from "@/lib/wedding-site";

const COOKIE_NAME = "owv_plan_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

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
