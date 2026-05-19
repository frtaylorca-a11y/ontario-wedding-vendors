import { NextResponse } from "next/server";
import { z } from "zod";
import { listVenues } from "@/lib/queries";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  region: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  q: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  indoor: z.enum(["indoor", "outdoor", "both"]).optional(),
  catering: z.enum(["in-house", "open", "both"]).optional(),
  capacity: z.coerce.number().int().min(0).max(10000).optional(),
  score: z.coerce.number().int().min(0).max(100).default(50),
  sort: z.enum(["rating", "reviews", "capacity", "score"]).default("score"),
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
    const result = await listVenues(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/venues] GET failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
