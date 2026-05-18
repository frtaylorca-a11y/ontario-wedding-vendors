import { NextResponse } from "next/server";
import { z } from "zod";
import { listVendors } from "@/lib/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await listVendors(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/vendors] GET failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
