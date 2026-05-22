import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(newsletterSubscribers);

  const [{ active }] = await db
    .select({ active: sql<number>`count(*)::int` })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.isActive, true));

  const [{ last7 }] = await db
    .select({ last7: sql<number>`count(*)::int` })
    .from(newsletterSubscribers)
    .where(sql`${newsletterSubscribers.subscribedAt} > now() - interval '7 days'`);

  const [{ last30 }] = await db
    .select({ last30: sql<number>`count(*)::int` })
    .from(newsletterSubscribers)
    .where(sql`${newsletterSubscribers.subscribedAt} > now() - interval '30 days'`);

  const recent = await db
    .select({
      id:           newsletterSubscribers.id,
      email:        newsletterSubscribers.email,
      name:         newsletterSubscribers.name,
      region:       newsletterSubscribers.region,
      subscribedAt: newsletterSubscribers.subscribedAt,
      isActive:     newsletterSubscribers.isActive,
    })
    .from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.subscribedAt))
    .limit(25);

  return NextResponse.json({
    ok: true,
    stats: { total, active, last7, last30 },
    recent,
  });
}
