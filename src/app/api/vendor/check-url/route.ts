import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vendors } from "@/lib/schema";
import { checkUrl } from "@/lib/check-url";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Health check for a vendor website. Used by:
 *   - admin tools doing ad-hoc verification
 *   - the nightly check-vendor-websites script (calls checkUrl
 *     directly, not via this route)
 *   - the future "check before booking" surface
 *
 *   GET /api/vendor/check-url?url=https://example.com
 *   GET /api/vendor/check-url?url=...&vendorId=123  (also persists)
 *
 * Returns { url, valid, status, kind, reason }.
 *
 * When vendorId is passed AND the result is 'broken', also flips
 * website_status='broken' + needs_website_search=true on the row.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  const vendorIdRaw = url.searchParams.get("vendorId");

  if (!target) {
    return NextResponse.json({ error: "url query param required" }, { status: 400 });
  }

  const result = await checkUrl(target);

  /* Optional persistence when vendorId is passed. The website_status
   * column is varchar(50) on vendors and already in the schema;
   * needs_website_search gets set TRUE on broken so the re-search
   * pipeline can pick the row up. */
  if (vendorIdRaw) {
    const vendorId = parseInt(vendorIdRaw, 10);
    if (Number.isFinite(vendorId)) {
      try {
        await db
          .update(vendors)
          .set({
            websiteStatus:      result.kind,
            needsWebsiteSearch: result.kind === "broken" ? true : undefined,
            updatedAt:          new Date(),
          })
          .where(eq(vendors.id, vendorId));
      } catch (err) {
        console.error("[/api/vendor/check-url] persist failed:",
          err instanceof Error ? err.message : err);
        /* Don't fail the response — the check result is still useful. */
      }
    }
  }

  return NextResponse.json(result);
}
