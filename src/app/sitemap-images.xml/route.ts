import { isNotNull, and, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { vendors, venues } from "@/lib/schema";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

/* Image sitemap — separate from the regular /sitemap.xml so we can
 * declare per-page <image:image> children. Google uses image sitemaps
 * to index photos that may not be inline in the HTML (and our
 * heroImageCustom URLs sit on a Cloudflare R2 hostname so they need
 * the explicit mapping). Only lists pages WHERE the R2 URL is present
 * — the page URL stays the canonical thing being indexed.
 *
 * Schema:
 *   https://www.sitemaps.org/protocol.html (urlset)
 *   https://support.google.com/webmasters/answer/178636 (image:image) */
export async function GET() {
  const [vendorRows, venueRows] = await Promise.all([
    db
      .select({
        slug:            vendors.slug,
        name:            vendors.name,
        category:        vendors.category,
        city:            vendors.city,
        heroImageCustom: vendors.heroImageCustom,
      })
      .from(vendors)
      .where(
        and(
          isNotNull(vendors.heroImageCustom),
          or(eq(vendors.isHidden, false), sql`${vendors.isHidden} is null`)!,
        ),
      ),
    db
      .select({
        slug:            venues.slug,
        name:            venues.name,
        city:            venues.city,
        venueType:       venues.venueType,
        heroImageCustom: venues.heroImageCustom,
      })
      .from(venues)
      .where(isNotNull(venues.heroImageCustom)),
  ]);

  const escape = (s: string): string =>
    s.replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;");

  const vendorEntries = vendorRows.map((v) => {
    const pageUrl = `${SITE_URL}/vendors/${v.category.replace(/_/g, "-")}/${v.slug}`;
    const title   = `${v.name} — Wedding ${categoryLabel(v.category)} in ${v.city ?? "Ontario"}`;
    const caption = `Wedding ${categoryLabel(v.category).toLowerCase()} in ${v.city ?? "Ontario"}, Ontario`;
    return `  <url>
    <loc>${escape(pageUrl)}</loc>
    <image:image>
      <image:loc>${escape(v.heroImageCustom!)}</image:loc>
      <image:title>${escape(title)}</image:title>
      <image:caption>${escape(caption)}</image:caption>
    </image:image>
  </url>`;
  });

  const venueEntries = venueRows.map((v) => {
    const pageUrl = `${SITE_URL}/venues/${v.slug}`;
    const title   = `${v.name} — Wedding Venue in ${v.city ?? "Ontario"}`;
    const caption = `Wedding venue in ${v.city ?? "Ontario"}, Ontario`;
    return `  <url>
    <loc>${escape(pageUrl)}</loc>
    <image:image>
      <image:loc>${escape(v.heroImageCustom!)}</image:loc>
      <image:title>${escape(title)}</image:title>
      <image:caption>${escape(caption)}</image:caption>
    </image:image>
  </url>`;
  });

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    [...vendorEntries, ...venueEntries].join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "content-type":  "application/xml",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    photographer:    "Photographer",
    videographer:    "Videographer",
    dj:              "DJ",
    florist:         "Florist",
    photo_booth:     "Photo Booth",
    catering:        "Caterer",
    cake:            "Cake Designer",
    hair_makeup:     "Hair & Makeup Artist",
    officiant:       "Officiant",
    limo:            "Limo & Transportation",
    lighting_decor:  "Lighting & Decor",
    wedding_planner: "Wedding Planner",
  };
  return map[cat] ?? "Wedding Vendor";
}
