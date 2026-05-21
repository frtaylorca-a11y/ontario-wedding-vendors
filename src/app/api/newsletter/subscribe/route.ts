import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email:  z.string().email().max(255),
  name:   z.string().max(120).optional(),
  region: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { email, name, region } = parsed.data;

  /* If already subscribed, just reactivate (don't regenerate the
   * unsubscribe token — old links should keep working). */
  const [existing] = await db
    .select({ id: newsletterSubscribers.id, isActive: newsletterSubscribers.isActive })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    if (!existing.isActive) {
      await db
        .update(newsletterSubscribers)
        .set({ isActive: true })
        .where(eq(newsletterSubscribers.id, existing.id));
    }
    return NextResponse.json({ ok: true, status: "already-subscribed" });
  }

  await db.insert(newsletterSubscribers).values({
    email:            email.toLowerCase(),
    name:             name ?? null,
    region:           region ?? null,
    unsubscribeToken: randomBytes(24).toString("hex"),
    isActive:         true,
  });

  return NextResponse.json({ ok: true, status: "subscribed" });
}
