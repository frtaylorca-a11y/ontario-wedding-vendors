import { NextResponse } from "next/server";
import { runDailyAgent } from "@/lib/blog-agent/agent";

export const dynamic = "force-dynamic";
export const maxDuration = 300;  /* up to 5 min — scout + generate */

/**
 * Cron-triggered daily run. Called from Vercel cron via:
 *   GET /api/blog/daily-agent?run=morning
 *   GET /api/blog/daily-agent?run=afternoon
 *
 * Authentication:
 *  - Vercel cron sends an Authorization: Bearer ${CRON_SECRET} header
 *    when CRON_SECRET is set in the project env. We accept that OR
 *    the regular ADMIN_TOKEN (for manual triggers from the admin UI).
 */
function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_TOKEN;
  /* Open in local dev when neither secret is set. */
  if (!cron && !admin) return true;
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (!m) return false;
  const provided = m[1].trim();
  return (cron && provided === cron.trim()) || (admin && provided === admin.trim()) || false;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const run = (url.searchParams.get("run") ?? "morning") as "morning" | "afternoon";
  if (run !== "morning" && run !== "afternoon") {
    return NextResponse.json({ error: "run must be morning or afternoon" }, { status: 400 });
  }
  const result = await runDailyAgent(run);
  return NextResponse.json(result, { status: result.ok ? 200 : 202 });
}

export async function GET(request: Request)  { return handle(request); }
export async function POST(request: Request) { return handle(request); }
