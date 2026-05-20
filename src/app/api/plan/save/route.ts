import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { venues, weddingPlans } from "@/lib/schema";
import { readPlanSessionId } from "@/lib/session";
import { buildWeddingSiteSlug, regionalDomainForVenue } from "@/lib/wedding-site";

export const dynamic = "force-dynamic";

const bookedVendorSchema = z.object({
  vendorId: z.number().int().nullable(),
  suggestedId: z.number().int().nullable(),
  name: z.string(),
  category: z.string(),
  city: z.string().nullable(),
  rating: z.number().nullable(),
  isUserSuggested: z.boolean(),
  isPicBooth: z.boolean(),
  bookedAt: z.string(),
});

/* All fields optional — each client (wedding planner / Stag & Doe / Checklist) sends only what it owns */
const planSchema = z.object({
  totalBudget:    z.number().int().min(0).max(1_000_000).optional(),
  guestCount:     z.number().int().min(1).max(2000).optional(),
  region:         z.string().max(100).optional(),
  weddingDate:    z.string().nullable().optional(),
  venueId:        z.number().int().nullable().optional(),
  partner1Name:   z.string().max(100).nullable().optional(),
  partner2Name:   z.string().max(100).nullable().optional(),
  bookedVendors:  z.record(z.string(), bookedVendorSchema).optional(),
  savedVendors:   z.record(z.string(), z.array(z.string().max(255))).optional(),
  stagAndDoe:     z.unknown().optional(), /* validated client-side; arbitrary JSONB persisted */
  budgetCategoryStates: z.unknown().optional(), /* { order, toggles } — see plan-state.ts */
  checklistTasks: z.unknown().optional(), /* per-task done state + custom-added tasks */
  musicSelections: z.unknown().optional(), /* MusicSelections — see plan-state.ts */
  guestList:       z.unknown().optional(), /* GuestEntry[] */
  itinerary:       z.unknown().optional(), /* ItineraryEntry[] */
  alertPhone:     z.string().max(50).nullable().optional(),
  alertEmail:     z.string().max(255).nullable().optional(),
  alertChannel:   z.enum(["sms", "email", "both", "none"]).nullable().optional(),

  /* Wedding-website fields (owned by /plan/website editor) */
  weddingTheme:           z.enum(["classic", "romantic", "rustic", "modern", "garden", "coastal", "boho", "luxe", "terracotta", "frosted", "editorial", "minimal", "retro", "bold-garden", "custom"]).optional(),
  /* Custom palette colours + identifier — set by the palette picker. */
  customColorPrimary:     z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  customColorAccent:      z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  customColorBg:          z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  customColorText:        z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  customPaletteId:        z.string().max(50).nullable().optional(),
  weddingTypographyStyle: z.string().max(30).nullable().optional(),
  weddingPublished:       z.boolean().optional(),
  weddingHeroImage:       z.string().max(500).nullable().optional(),
  weddingParty:           z.unknown().optional(),
  weddingRegistry:        z.unknown().optional(),
  weddingPageConfig:      z.unknown().optional(),
  weddingPassword:        z.string().max(100).nullable().optional(),
  weddingHashtag:         z.string().max(100).nullable().optional(),
  weddingSiteShowVendors: z.boolean().optional(),
  ourStory:               z.string().max(8000).nullable().optional(),
  travelCopy:             z.string().max(4000).nullable().optional(),
  dressCodeStyle:         z.string().max(50).nullable().optional(),
  dressCodeDescription:   z.string().max(2000).nullable().optional(),
  dressCodeImageUrl:      z.string().max(500).nullable().optional(),
  thingsToDo:             z.unknown().optional(),
  multipleEvents:         z.unknown().optional(),
  photoGalleryUrls:       z.unknown().optional(),

  /* Setup wizard (Step 2 story seed + Step 3 completion flag) */
  rawStory:               z.string().max(2000).nullable().optional(),
  wizardCompleted:        z.boolean().optional(),
});

export async function POST(request: Request) {
  const sessionId = await readPlanSessionId();
  if (!sessionId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  /* Build a partial-update payload: only include fields the client sent.
   * This lets the wedding-planner and Stag-and-Doe pages save independently
   * without clobbering each other's state. */
  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  const insertValues: Record<string, unknown> = { sessionId };

  if (data.totalBudget   !== undefined) { updateSet.totalBudget   = data.totalBudget;   insertValues.totalBudget   = data.totalBudget;   }
  if (data.guestCount    !== undefined) { updateSet.guestCount    = data.guestCount;    insertValues.guestCount    = data.guestCount;    }
  if (data.region        !== undefined) { updateSet.region        = data.region;        insertValues.region        = data.region;        }
  if (data.weddingDate   !== undefined) { updateSet.weddingDate   = data.weddingDate;   insertValues.weddingDate   = data.weddingDate;   }
  if (data.venueId       !== undefined) { updateSet.venueId       = data.venueId;       insertValues.venueId       = data.venueId;       }
  if (data.partner1Name  !== undefined) { updateSet.partner1Name  = data.partner1Name;  insertValues.partner1Name  = data.partner1Name;  }
  if (data.partner2Name  !== undefined) { updateSet.partner2Name  = data.partner2Name;  insertValues.partner2Name  = data.partner2Name;  }
  if (data.bookedVendors !== undefined) { updateSet.bookedVendors = data.bookedVendors; insertValues.bookedVendors = data.bookedVendors; }
  if (data.savedVendors  !== undefined) { updateSet.savedVendors  = data.savedVendors;  insertValues.savedVendors  = data.savedVendors;  }
  if (data.stagAndDoe    !== undefined) { updateSet.stagAndDoe    = data.stagAndDoe;    insertValues.stagAndDoe    = data.stagAndDoe;    }
  if (data.budgetCategoryStates !== undefined) { updateSet.budgetCategoryStates = data.budgetCategoryStates; insertValues.budgetCategoryStates = data.budgetCategoryStates; }
  if (data.checklistTasks !== undefined) { updateSet.checklistTasks = data.checklistTasks; insertValues.checklistTasks = data.checklistTasks; }
  if (data.musicSelections !== undefined) { updateSet.musicSelections = data.musicSelections; insertValues.musicSelections = data.musicSelections; }
  if (data.guestList       !== undefined) { updateSet.guestList       = data.guestList;       insertValues.guestList       = data.guestList;       }
  if (data.itinerary       !== undefined) { updateSet.itinerary       = data.itinerary;       insertValues.itinerary       = data.itinerary;       }
  if (data.alertPhone   !== undefined) { updateSet.alertPhone   = data.alertPhone;   insertValues.alertPhone   = data.alertPhone;   }
  if (data.alertEmail   !== undefined) { updateSet.alertEmail   = data.alertEmail;   insertValues.alertEmail   = data.alertEmail;   }
  if (data.alertChannel !== undefined) { updateSet.alertChannel = data.alertChannel; insertValues.alertChannel = data.alertChannel; }

  /* Wedding-website fields */
  if (data.weddingTheme           !== undefined) { updateSet.weddingTheme           = data.weddingTheme;           insertValues.weddingTheme           = data.weddingTheme;           }
  if (data.weddingPublished       !== undefined) { updateSet.weddingPublished       = data.weddingPublished;       insertValues.weddingPublished       = data.weddingPublished;       }
  if (data.weddingHeroImage       !== undefined) { updateSet.weddingHeroImage       = data.weddingHeroImage;       insertValues.weddingHeroImage       = data.weddingHeroImage;       }
  if (data.weddingParty           !== undefined) { updateSet.weddingParty           = data.weddingParty;           insertValues.weddingParty           = data.weddingParty;           }
  if (data.weddingRegistry        !== undefined) { updateSet.weddingRegistry        = data.weddingRegistry;        insertValues.weddingRegistry        = data.weddingRegistry;        }
  if (data.weddingPageConfig      !== undefined) { updateSet.weddingPageConfig      = data.weddingPageConfig;      insertValues.weddingPageConfig      = data.weddingPageConfig;      }
  if (data.weddingPassword        !== undefined) { updateSet.weddingPassword        = data.weddingPassword;        insertValues.weddingPassword        = data.weddingPassword;        }
  if (data.weddingHashtag         !== undefined) { updateSet.weddingHashtag         = data.weddingHashtag;         insertValues.weddingHashtag         = data.weddingHashtag;         }
  if (data.weddingSiteShowVendors !== undefined) { updateSet.weddingSiteShowVendors = data.weddingSiteShowVendors; insertValues.weddingSiteShowVendors = data.weddingSiteShowVendors; }
  if (data.ourStory               !== undefined) { updateSet.ourStory               = data.ourStory;               insertValues.ourStory               = data.ourStory;               }
  if (data.travelCopy             !== undefined) { updateSet.travelCopy             = data.travelCopy;             insertValues.travelCopy             = data.travelCopy;             }
  if (data.dressCodeStyle         !== undefined) { updateSet.dressCodeStyle         = data.dressCodeStyle;         insertValues.dressCodeStyle         = data.dressCodeStyle;         }
  if (data.dressCodeDescription   !== undefined) { updateSet.dressCodeDescription   = data.dressCodeDescription;   insertValues.dressCodeDescription   = data.dressCodeDescription;   }
  if (data.dressCodeImageUrl      !== undefined) { updateSet.dressCodeImageUrl      = data.dressCodeImageUrl;      insertValues.dressCodeImageUrl      = data.dressCodeImageUrl;      }
  if (data.thingsToDo             !== undefined) { updateSet.thingsToDo             = data.thingsToDo;             insertValues.thingsToDo             = data.thingsToDo;             }
  if (data.multipleEvents         !== undefined) { updateSet.multipleEvents         = data.multipleEvents;         insertValues.multipleEvents         = data.multipleEvents;         }
  if (data.photoGalleryUrls       !== undefined) { updateSet.photoGalleryUrls       = data.photoGalleryUrls;       insertValues.photoGalleryUrls       = data.photoGalleryUrls;       }
  if (data.rawStory               !== undefined) { updateSet.rawStory               = data.rawStory;               insertValues.rawStory               = data.rawStory;               }
  if (data.wizardCompleted        !== undefined) {
    updateSet.wizardCompleted    = data.wizardCompleted;
    insertValues.wizardCompleted = data.wizardCompleted;
    /* Stamp wizardCompletedAt the first time the flag flips true.
     * Stamping unconditionally on every save with wizardCompleted=true
     * would overwrite the original timestamp on no-op updates, so the
     * stamp only goes onto the insert path and onto updates where it
     * goes from any falsy state to true. */
    if (data.wizardCompleted === true) {
      updateSet.wizardCompletedAt    = new Date();
      insertValues.wizardCompletedAt = new Date();
    }
  }
  if (data.customColorPrimary     !== undefined) { updateSet.customColorPrimary     = data.customColorPrimary;     insertValues.customColorPrimary     = data.customColorPrimary;     }
  if (data.customColorAccent      !== undefined) { updateSet.customColorAccent      = data.customColorAccent;      insertValues.customColorAccent      = data.customColorAccent;      }
  if (data.customColorBg          !== undefined) { updateSet.customColorBg          = data.customColorBg;          insertValues.customColorBg          = data.customColorBg;          }
  if (data.customColorText        !== undefined) { updateSet.customColorText        = data.customColorText;        insertValues.customColorText        = data.customColorText;        }
  if (data.customPaletteId        !== undefined) { updateSet.customPaletteId        = data.customPaletteId;        insertValues.customPaletteId        = data.customPaletteId;        }
  if (data.weddingTypographyStyle !== undefined) { updateSet.weddingTypographyStyle = data.weddingTypographyStyle; insertValues.weddingTypographyStyle = data.weddingTypographyStyle; }

  /* Session / attribution capture — INSERT-only fields. Read from request
   * headers + the AttributionCapture cookie. Setting these on the INSERT
   * side of the upsert means existing rows keep their original values. */
  const headers = request.headers;
  const xff = headers.get("x-forwarded-for") ?? "";
  const ipAddress =
    xff.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    null;
  const userAgent = headers.get("user-agent") ?? null;
  const referrer  = headers.get("referer") ?? null;
  const deviceType = userAgent ? deviceTypeFromUa(userAgent) : null;

  const attribution = readAttributionCookie(headers.get("cookie"));

  if (ipAddress)   insertValues.ipAddress  = ipAddress.slice(0, 45);
  if (userAgent)   insertValues.userAgent  = userAgent;
  if (referrer)    insertValues.referrer   = referrer.slice(0, 500);
  if (deviceType)  insertValues.deviceType = deviceType;
  if (attribution) {
    if (attribution.utmSource)      insertValues.utmSource   = attribution.utmSource.slice(0, 100);
    if (attribution.utmMedium)      insertValues.utmMedium   = attribution.utmMedium.slice(0, 100);
    if (attribution.utmCampaign)    insertValues.utmCampaign = attribution.utmCampaign.slice(0, 100);
    if (attribution.utmContent)     insertValues.utmContent  = attribution.utmContent.slice(0, 100);
    if (attribution.firstPage)      insertValues.firstPage   = attribution.firstPage.slice(0, 500);
    if (attribution.firstVisitedAt) insertValues.firstVisitedAt = new Date(attribution.firstVisitedAt);
  }

  /* Wedding-website provisioning — runs when venueId or partner names
   * change and the row doesn't already have a slug + regional domain. */
  if (data.venueId != null || data.partner1Name != null || data.partner2Name != null) {
    /* Load the current row to decide whether to provision */
    const [existing] = await db
      .select({
        weddingSiteSlug:           weddingPlans.weddingSiteSlug,
        weddingSiteRegionalDomain: weddingPlans.weddingSiteRegionalDomain,
        partner1Name:              weddingPlans.partner1Name,
        partner2Name:              weddingPlans.partner2Name,
        venueId:                   weddingPlans.venueId,
      })
      .from(weddingPlans)
      .where(eq(weddingPlans.sessionId, sessionId))
      .limit(1);

    const effectiveVenueId = data.venueId      ?? existing?.venueId      ?? null;
    const effectiveP1      = data.partner1Name ?? existing?.partner1Name ?? null;
    const effectiveP2      = data.partner2Name ?? existing?.partner2Name ?? null;

    /* Pick the regional domain when a venue is known and no domain set yet */
    if (effectiveVenueId != null && !existing?.weddingSiteRegionalDomain) {
      const [v] = await db
        .select({ region: venues.region, city: venues.city })
        .from(venues)
        .where(eq(venues.id, effectiveVenueId))
        .limit(1);
      if (v) {
        const domain = regionalDomainForVenue(v.region, v.city);
        if (domain) {
          updateSet.weddingSiteRegionalDomain = domain;
          insertValues.weddingSiteRegionalDomain = domain;
        }
      }
    }

    /* Mint a slug — only when at least one identifier exists and slot is empty.
     * Collisions resolved by appending the first 6 chars of session_id. */
    if (!existing?.weddingSiteSlug && (effectiveP1 || effectiveP2 || effectiveVenueId != null)) {
      const preferred = buildWeddingSiteSlug(
        effectiveP1,
        effectiveP2,
        sessionId,
      );
      const [collide] = await db
        .select({ id: weddingPlans.id })
        .from(weddingPlans)
        .where(and(eq(weddingPlans.weddingSiteSlug, preferred), ne(weddingPlans.sessionId, sessionId)))
        .limit(1);
      const finalSlug = collide
        ? `${preferred}-${sessionId.slice(0, 6)}`.slice(0, 60)
        : preferred;
      updateSet.weddingSiteSlug = finalSlug;
      insertValues.weddingSiteSlug = finalSlug;
    }
  }

  try {
    await db
      .insert(weddingPlans)
      .values(insertValues as { sessionId: string })
      .onConflictDoUpdate({
        target: weddingPlans.sessionId,
        set: updateSet,
      });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[plan/save] failed:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

function deviceTypeFromUa(ua: string): "mobile" | "tablet" | "desktop" {
  const lc = ua.toLowerCase();
  /* iPad announces both Mobile and iPad — check tablet first. */
  if (/ipad|tablet/.test(lc)) return "tablet";
  if (/android(?!.*mobile)/.test(lc)) return "tablet"; /* Android tablets often lack "mobile" */
  if (/mobile|android|iphone|ipod/.test(lc)) return "mobile";
  return "desktop";
}

function readAttributionCookie(cookieHeader: string | null): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  firstPage?: string;
  firstVisitedAt?: string;
} | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(/;\s*/);
  const target = cookies.find((c) => c.startsWith("owv_attribution="));
  if (!target) return null;
  try {
    const raw = decodeURIComponent(target.slice("owv_attribution=".length));
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const pick = (k: string): string | undefined => {
      const v = parsed[k];
      return typeof v === "string" && v.length > 0 ? v : undefined;
    };
    return {
      utmSource:      pick("utmSource"),
      utmMedium:      pick("utmMedium"),
      utmCampaign:    pick("utmCampaign"),
      utmContent:     pick("utmContent"),
      firstPage:      pick("firstPage"),
      firstVisitedAt: pick("firstVisitedAt"),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const sessionId = await readPlanSessionId();
  if (!sessionId) return NextResponse.json({ plan: null });

  const [row] = await db
    .select()
    .from(weddingPlans)
    .where(eq(weddingPlans.sessionId, sessionId))
    .limit(1);

  return NextResponse.json({ plan: row ?? null });
}
