import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { BlogAgentClient } from "./BlogAgentClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:  "Blog agent (admin) | Ontario Wedding Vendors",
  robots: { index: false, follow: false },
};

async function isAuthorized(): Promise<boolean> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return true;
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const match = cookie.match(/owv_admin_token=([^;]+)/);
  return match != null && decodeURIComponent(match[1]) === expected;
}

export default async function BlogAgentAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const expected = process.env.ADMIN_TOKEN;

  if (expected && token === expected) {
    return <BlogAgentClient bootstrapToken={token} />;
  }
  if (!(await isAuthorized())) notFound();
  return <BlogAgentClient />;
}
