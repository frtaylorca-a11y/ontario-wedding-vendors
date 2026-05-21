import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { BlogGeneratorClient } from "./BlogGeneratorClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:   "Blog generator (admin) | Ontario Wedding Vendors",
  robots:  { index: false, follow: false },
};

/**
 * Gate the admin page behind the same ADMIN_TOKEN the API uses.
 * The token is passed as a query string on the first visit
 * (?token=...) then stored in localStorage by the client.
 *
 * When ADMIN_TOKEN is unset (local dev), the page opens for anyone
 * — same fallback the API uses.
 */
async function isAuthorized(): Promise<boolean> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return true;
  const h = await headers();
  /* Token can arrive as either ?token=... (caught client-side and
   * then on subsequent reloads via cookie) OR x-admin-token header
   * (Vercel preview). At the server level we only check the cookie
   * — the client passes it through. */
  const cookie = h.get("cookie") ?? "";
  const match = cookie.match(/owv_admin_token=([^;]+)/);
  return match != null && decodeURIComponent(match[1]) === expected;
}

export default async function BlogGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const expected = process.env.ADMIN_TOKEN;

  /* First visit with ?token=... — pass it down so the client can
   * cookie + then redirect. After that, every reload uses the cookie. */
  if (expected && token === expected) {
    return <BlogGeneratorClient bootstrapToken={token} />;
  }

  const ok = await isAuthorized();
  if (!ok) {
    notFound();
  }
  return <BlogGeneratorClient />;
}
