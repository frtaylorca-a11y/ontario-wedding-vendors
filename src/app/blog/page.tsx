import type { Metadata } from "next";
import { listBlogPosts } from "@/lib/blog";
import { BreadcrumbSchema } from "@/components/seo/SchemaInjector";
import { BlogIndexClient } from "@/components/blog/BlogIndexClient";

export const metadata: Metadata = {
  title: "Ontario Wedding Blog | Venue Guides & Vendor Pricing 2026",
  description:
    "Ontario wedding pricing benchmarks, region-by-region venue guides, and vendor cost breakdowns — Niagara, Muskoka, Toronto, Hamilton and beyond, updated 2026.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = listBlogPosts();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
        ]}
      />

      <main className="bg-bg-warm">
        <div className="mx-auto max-w-[1180px] px-6 py-12 lg:py-16">
          <header className="mb-10 max-w-[760px]">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              Blog
            </div>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-charcoal md:text-6xl">
              Plan a smarter <em className="italic text-rose">Ontario wedding</em>
            </h1>
            <p className="mt-4 text-text-mid md:text-lg">
              Region guides, venue picks, vendor pricing benchmarks — written
              by the team that runs the directory, not a content mill.
            </p>
          </header>

          <BlogIndexClient posts={posts} />
        </div>
      </main>
    </>
  );
}
