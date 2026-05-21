import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Live connectivity probes per platform. Each probe is a cheap read
 * call that confirms the credentials work — never a write. Returns:
 *   { platform, ok: true/false, detail? }
 */

async function testGbp(): Promise<{ ok: boolean; detail?: string }> {
  const cid  = process.env.GBP_CLIENT_ID;
  const csec = process.env.GBP_CLIENT_SECRET;
  const rtok = process.env.GBP_REFRESH_TOKEN;
  if (!cid || !csec || !rtok) return { ok: false, detail: "missing OAuth env vars" };
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     cid,
        client_secret: csec,
        refresh_token: rtok,
        grant_type:    "refresh_token",
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { ok: false, detail: `token exchange ${r.status}` };
    const j = (await r.json()) as { access_token?: string };
    return { ok: !!j.access_token };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function testMeta(scope: "instagram" | "facebook"): Promise<{ ok: boolean; detail?: string }> {
  const token = process.env.META_ACCESS_TOKEN;
  const id    = scope === "instagram" ? process.env.META_IG_USER_ID : process.env.META_PAGE_ID;
  if (!token || !id) return { ok: false, detail: "missing Meta env vars" };
  try {
    const r = await fetch(
      `https://graph.facebook.com/v18.0/${id}?fields=name,id&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!r.ok) return { ok: false, detail: `Graph ${r.status}` };
    const j = (await r.json()) as { id?: string; name?: string };
    return { ok: !!j.id, detail: j.name };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function testPinterest(): Promise<{ ok: boolean; detail?: string }> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) return { ok: false, detail: "missing PINTEREST_ACCESS_TOKEN" };
  try {
    const r = await fetch("https://api.pinterest.com/v5/user_account", {
      headers: { authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { ok: false, detail: `Pinterest ${r.status}` };
    const j = (await r.json()) as { username?: string };
    return { ok: !!j.username, detail: j.username };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url      = new URL(request.url);
  const platform = url.searchParams.get("platform");
  if (!platform) {
    return NextResponse.json({ error: "platform query param required" }, { status: 400 });
  }

  let result: { ok: boolean; detail?: string };
  switch (platform) {
    case "gbp":       result = await testGbp(); break;
    case "instagram": result = await testMeta("instagram"); break;
    case "facebook":  result = await testMeta("facebook"); break;
    case "pinterest": result = await testPinterest(); break;
    default:
      return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
  }
  return NextResponse.json({ platform, ...result });
}
