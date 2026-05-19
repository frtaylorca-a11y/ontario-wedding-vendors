import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { vendors, userSuggestedVendors, type Vendor } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

const FUZZY_THRESHOLD = 3;
const MAX_CANDIDATES = 200;

const inputSchema = z.object({
  name:      z.string().min(1).max(255),
  category:  z.string().min(1).max(50),
  website:   z.string().max(500).optional().nullable(),
  instagram: z.string().max(100).optional().nullable(),
  phone:     z.string().max(50).optional().nullable(),
  city:      z.string().min(1).max(100),
  region:    z.string().min(1).max(100),
  notes:     z.string().max(2000).optional().nullable(),
  /** When true, the client is acknowledging "no match" and asking to persist as a suggestion */
  forceInsert: z.boolean().optional(),
});

/** Lower, strip punctuation, drop common business filler words */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|and|of|inc|llc|ltd|co|company|studio|studios|photography|photo|videography)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Standard iterative Levenshtein — O(m*n), good enough at ≤200 candidates */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(a.length + 1);
  const curr = new Array(a.length + 1);
  for (let j = 0; j <= a.length; j++) prev[j] = j;

  for (let i = 1; i <= b.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= a.length; j++) prev[j] = curr[j];
  }
  return prev[a.length];
}

async function fuzzyMatch(
  name: string,
  category: string,
  region: string,
): Promise<Vendor | null> {
  const target = normalize(name);
  if (!target) return null;

  /* Restrict to same-category + same-region first */
  const candidates = await db
    .select()
    .from(vendors)
    .where(and(
      eq(vendors.category, category),
      eq(vendors.region, region),
    ))
    .limit(MAX_CANDIDATES);

  let best: { vendor: Vendor; dist: number } | null = null;
  for (const v of candidates) {
    const dist = levenshtein(target, normalize(v.name));
    if (dist <= FUZZY_THRESHOLD && (best === null || dist < best.dist)) {
      best = { vendor: v, dist };
    }
  }
  if (best) return best.vendor;

  /* Fall back to category-only if regional search found nothing */
  const wider = await db
    .select()
    .from(vendors)
    .where(eq(vendors.category, category))
    .limit(MAX_CANDIDATES);

  for (const v of wider) {
    const dist = levenshtein(target, normalize(v.name));
    if (dist <= FUZZY_THRESHOLD && (best === null || dist < best.dist)) {
      best = { vendor: v, dist };
    }
  }
  return best?.vendor ?? null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const sessionId = await readPlanSessionId();

  /* Step 1 — try fuzzy match (unless client requested forceInsert) */
  if (!data.forceInsert) {
    const matched = await fuzzyMatch(data.name, data.category, data.region);
    if (matched) {
      return NextResponse.json({
        match: {
          vendorId:        matched.id,
          slug:            matched.slug,
          name:            matched.name,
          category:        matched.category,
          city:            matched.city,
          region:          matched.region,
          googleRating:    matched.googleRating,
          reviewCount:     matched.reviewCount,
          isPicBooth:      matched.isPicBooth ?? false,
        },
        suggestionInserted: null,
      });
    }
  }

  /* Step 2 — no match (or forceInsert): record as a user-suggested vendor.
   * Dedupe on normalized_name + category — increment mention_count if exists. */
  const normalizedName = normalize(data.name);
  const existing = await db
    .select({ id: userSuggestedVendors.id, mentionCount: userSuggestedVendors.mentionCount })
    .from(userSuggestedVendors)
    .where(and(
      eq(userSuggestedVendors.normalizedName, normalizedName),
      eq(userSuggestedVendors.category, data.category),
    ))
    .limit(1);

  let inserted: { id: number };
  if (existing.length > 0) {
    await db
      .update(userSuggestedVendors)
      .set({
        mentionCount: existing[0].mentionCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(userSuggestedVendors.id, existing[0].id));
    inserted = { id: existing[0].id };
  } else {
    const [row] = await db
      .insert(userSuggestedVendors)
      .values({
        name:               data.name,
        normalizedName,
        category:           data.category,
        website:            data.website ?? null,
        instagram:          data.instagram ?? null,
        phone:              data.phone ?? null,
        city:               data.city,
        region:             data.region,
        notes:              data.notes ?? null,
        submittedBySession: sessionId ?? null,
      })
      .returning({ id: userSuggestedVendors.id });
    inserted = row;
  }

  return NextResponse.json({
    match: null,
    suggestionInserted: {
      id:       inserted.id,
      name:     data.name,
      category: data.category,
      city:     data.city,
      region:   data.region,
    },
  });
}
