import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  encodeSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  verifyMagicLink,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url   = new URL(req.url);
  const token = url.searchParams.get("token");

  /* Failure redirects go to `/?auth-error=...` — the site has no
   * standalone /sign-in page (auth is magic-link modal only, see
   * src/components/layout/SignInNav.tsx). The homepage doesn't
   * currently surface the query param, but at least the user lands
   * on a 200 route instead of a 404 and can re-open the sign-in
   * modal from the nav. */
  if (!token) {
    return NextResponse.redirect(new URL("/?auth-error=missing-token", url.origin));
  }

  const result = await verifyMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/?auth-error=${result.reason}`, url.origin),
    );
  }

  /* Only redirect within our own origin — magic-link callbackUrl came
   * from a previous request body that we already validated to a "/"
   * prefix, so this is belt-and-suspenders. */
  const dest = result.callbackUrl.startsWith("/") ? result.callbackUrl : "/plan";
  const target = new URL(dest, url.origin);
  /* Pass an intent hint to the destination so the page can show a
   * "Welcome back, your shortlist is ready" toast etc. */
  if (result.intent) target.searchParams.set("welcome", result.intent);

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, encodeSessionCookie(result.userId), SESSION_COOKIE_OPTIONS);

  return NextResponse.redirect(target);
}
