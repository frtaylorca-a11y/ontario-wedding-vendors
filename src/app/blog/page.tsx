import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type { Metadata } from "next";
import { listBlogPosts } from "@/lib/blog";
import { BreadcrumbSchema } from "@/components/seo/SchemaInjector";

export const metadata: Metadata = {
  title: "Wedding Blog | Ontario Wedding Vendors",
  description:
    "Region guides, venue picks, and vendor pricing benchmarks for couples planning weddings across Ontario.",
  alternates: { canonical: "/blog" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  });
}

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

          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}` as Route}
                  className="group block overflow-hidden rounded-card border border-border-light bg-white transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[var(--shadow-card)]"
                >
                  <div className="relative aspect-[16/9] bg-bg-soft">
                    <Image
                      src={post.heroImage}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-rose">
                      {post.category}
                    </div>
                    <h2 className="mt-1 font-display text-xl font-semibold leading-tight text-charcoal group-hover:text-rose">
                      {post.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm text-text-mid">
                      {post.excerpt}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-[0.7rem] text-text-muted">
                      <span>{formatDate(post.publishedAt)}</span>
                      <span aria-hidden>·</span>
                      <span>{post.readMinutes} min read</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
