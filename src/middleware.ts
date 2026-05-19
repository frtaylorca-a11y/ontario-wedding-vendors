import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "owv_plan_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Mints a plan-session cookie on first visit to /plan or /api/plan/*.
 * Runs before server components render, which allows /plan/page.tsx to
 * safely read the cookie via cookies() — cookies().set() is forbidden
 * inside server-component render but allowed here in middleware.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(COOKIE_NAME)) {
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

export const config = {
  matcher: ["/plan/:path*", "/api/plan/:path*"],
};
