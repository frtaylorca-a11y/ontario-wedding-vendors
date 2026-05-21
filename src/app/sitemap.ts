import type { MetadataRoute } from "next";
import { getAllVenueSlugs, getAllVendorSlugs } from "@/lib/queries";
import { REGIONS } from "@/lib/regions";
import { VENDOR_CATEGORIES } from "@/types";
import { BLOG_POSTS } from "@/lib/blog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* Static + manually-curated pages. Listed in priority order so the
   * resulting sitemap reads sensibly to a human crawler too. */
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`,             changeFrequency: "weekly",  priority: 1   },
    { url: `${siteUrl}/venues`,       changeFrequency: "daily",   priority: 0.9 },
    { url: `${siteUrl}/vendors`,      changeFrequency: "daily",   priority: 0.8 },
    { url: `${siteUrl}/blog`,         changeFrequency: "weekly",  priority: 0.8 },
    { url: `${siteUrl}/plan`,         changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/about`,        changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/claim-listing`,changeFrequency: "monthly", priority: 0.5 },
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

  /* Every blog post is a static-generated detail page. Pull from the
   * same BLOG_POSTS array generateStaticParams uses so they can never
   * drift apart. */
  const blogUrls: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url:             `${siteUrl}/blog/${p.slug}`,
    lastModified:    p.publishedAt,
    changeFrequency: "monthly",
    priority:        0.7,
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

  /* Individual vendor detail pages — /vendors/[category]/[slug]. Each
   * open vendor in the directory has its own page; surfacing them all
   * to the sitemap lets Google crawl into the long tail. */
  let vendorUrls: MetadataRoute.Sitemap = [];
  try {
    const rows = await getAllVendorSlugs();
    /* Some legacy vendor rows have a null category — those can't
     * resolve to a real URL, so we skip them rather than 404 in the
     * sitemap. */
    vendorUrls = rows
      .filter((v) => v.category)
      .map((v) => ({
        url:             `${siteUrl}/vendors/${v.category}/${v.slug}`,
        lastModified:    v.updatedAt ?? undefined,
        changeFrequency: "weekly",
        priority:        0.6,
      }));
  } catch (err) {
    console.error("[sitemap] failed to load vendor slugs", err);
  }

  return [
    ...staticUrls,
    ...regionUrls,
    ...categoryUrls,
    ...blogUrls,
    ...venueUrls,
    ...vendorUrls,
  ];
}
