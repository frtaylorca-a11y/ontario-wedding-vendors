import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { listRecentScout } from "@/lib/blog-agent/scout";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const onlyUnused = url.searchParams.get("onlyUnused") === "1";
  const limit      = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10) || 100));
  const rows = await listRecentScout(limit, onlyUnused);
  return NextResponse.json({ ok: true, rows });
}
