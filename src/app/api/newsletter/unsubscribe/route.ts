import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/schema";

export const dynamic = "force-dynamic";

/* GET handler so the unsubscribe link in the digest email works as a
 * single click — no form required. Returns plain text. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token.length < 16) {
    return new NextResponse("Invalid unsubscribe token.", { status: 400 });
  }

  const [row] = await db
    .select({ id: newsletterSubscribers.id, isActive: newsletterSubscribers.isActive })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribeToken, token))
    .limit(1);

  if (!row) {
    return new NextResponse("Token not found — you may already be unsubscribed.", { status: 404 });
  }

  if (row.isActive) {
    await db
      .update(newsletterSubscribers)
      .set({ isActive: false })
      .where(eq(newsletterSubscribers.id, row.id));
  }

  return new NextResponse("You've been unsubscribed. Sorry to see you go.");
}
