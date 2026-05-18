import type { MetadataRoute } from "next";
import { getAllVenueSlugs } from "@/lib/queries";
import { REGIONS } from "@/lib/regions";
import { VENDOR_CATEGORIES } from "@/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/venues`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/vendors`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/plan`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const regionUrls: MetadataRoute.Sitemap = REGIONS.map((r) => ({
    url: `${siteUrl}/regions/${r.slug}`,
    changeFrequency: "weekly",
    priority: r.featured ? 0.8 : 0.6,
  }));

  const categoryUrls: MetadataRoute.Sitemap = VENDOR_CATEGORIES.map((c) => ({
    url: `${siteUrl}/vendors/${c}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  let venueUrls: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getAllVenueSlugs();
    venueUrls = slugs.map((v) => ({
      url: `${siteUrl}/venues/${v.slug}`,
      lastModified: v.updatedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch (err) {
    console.error("[sitemap] failed to load venue slugs", err);
  }

  return [...staticUrls, ...regionUrls, ...categoryUrls, ...venueUrls];
}
