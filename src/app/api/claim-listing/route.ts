import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { vendorClaims } from "@/lib/schema";

export const dynamic = "force-dynamic";

const schema = z.object({
  listingType:   z.enum(["venue", "vendor"]),
  category:      z.string().trim().max(50).optional().nullable(),
  businessName:  z.string().trim().min(2).max(255),
  businessUrl:   z.string().trim().max(500).optional().nullable(),
  claimantName:  z.string().trim().min(2).max(120),
  claimantEmail: z.string().trim().email().max(255),
  claimantPhone: z.string().trim().max(50).optional().nullable(),
  claimantRole:  z.string().trim().max(120).optional().nullable(),
  message:       z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const xff = request.headers.get("x-forwarded-for") ?? "";
  const ipAddress =
    xff.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") ?? null;

  try {
    const [row] = await db
      .insert(vendorClaims)
      .values({
        listingType:    data.listingType,
        category:       data.category ?? null,
        businessName:   data.businessName,
        businessUrl:    data.businessUrl ?? null,
        claimantName:   data.claimantName,
        claimantEmail:  data.claimantEmail,
        claimantPhone:  data.claimantPhone ?? null,
        claimantRole:   data.claimantRole  ?? null,
        message:        data.message       ?? null,
        ipAddress:      ipAddress ? ipAddress.slice(0, 45) : null,
        userAgent,
      })
      .returning({ id: vendorClaims.id });
    return NextResponse.json({ ok: true, claimId: row?.id ?? null });
  } catch (err) {
    console.error("[claim-listing] insert failed:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
