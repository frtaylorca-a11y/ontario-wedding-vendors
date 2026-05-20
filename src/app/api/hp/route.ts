import { NextRequest, NextResponse } from "next/server";

/* Honeypot route.
 *
 * Linked from the venue listing page via an invisible, aria-hidden,
 * tabindex=-1 anchor — no real user agent will ever request this.
 * Anything that hits it is either a scraper following every link in the
 * DOM regardless of visibility, or a bot probing for admin endpoints.
 *
 * Behavior: log enough to identify the offender, then return a 404 so
 * we don't reveal the route exists. The 404 is deliberate — bots that
 * see a 200 mark the URL as live and come back for more.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const referer   = req.headers.get("referer")   ?? "none";
  const timestamp = new Date().toISOString();

  /* Single-line structured log — easy to grep in Vercel logs. */
  console.warn(
    `[honeypot] ${timestamp} ip="${ip}" ua="${userAgent}" referer="${referer}"`,
  );

  return new NextResponse("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
