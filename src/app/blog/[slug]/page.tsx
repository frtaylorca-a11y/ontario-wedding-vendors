import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost, type BlogPost } from "@/lib/blog";
import { BreadcrumbSchema } from "@/components/seo/SchemaInjector";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { getDbBlogPost, listDbBlogSlugs } from "@/lib/blog-agent/db-posts";

type Params = Promise<{ slug: string }>;

/* Don't pre-render DB posts at build time — they're created at
 * runtime by the daily agent. Static posts stay pre-rendered. */
export const dynamicParams = true;

export async function generateStaticParams() {
  const staticSlugs = BLOG_POSTS.map((p) => p.slug);
  let dbSlugs: string[] = [];
  try { dbSlugs = await listDbBlogSlugs(); } catch { /* DB optional at build */ }
  const all = new Set<string>([...staticSlugs, ...dbSlugs]);
  return Array.from(all).map((slug) => ({ slug }));
}

async function resolvePost(slug: string): Promise<BlogPost | null> {
  const staticPost = getBlogPost(slug);
  if (staticPost) return staticPost;
  try { return await getDbBlogPost(slug); } catch { return null; }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: `${post.title} | Ontario Wedding Vendors`,
    description: post.metaDescription,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title:       post.title,
      description: post.metaDescription,
      type:        "article",
      publishedTime: post.publishedAt,
      images:      [post.heroImage],
    },
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ontarioweddingvendors.com";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year:  "numeric",
    month: "long",
    day:   "numeric",
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) notFound();

  const articleSchema = {
    "@context":       "https://schema.org",
    "@type":          "Article",
    headline:         post.title,
    description:      post.metaDescription,
    image:            `${SITE_URL}${post.heroImage}`,
    datePublished:    post.publishedAt,
    dateModified:     post.publishedAt,
    author:           { "@type": "Organization", name: "Ontario Wedding Vendors", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name:    "Ontario Wedding Vendors",
      logo: {
        "@type": "ImageObject",
        url:     `${SITE_URL}/images/hero-niagara-vineyard.png`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${slug}` },
  };

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home",      url: "/" },
          { name: "Blog",      url: "/blog" },
          { name: post.title,  url: `/blog/${slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c") }}
      />

      <main className="bg-bg-warm">
        <article className="mx-auto max-w-[820px] px-6 py-12 lg:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs font-medium text-text-muted">
            <ol className="flex flex-wrap items-center gap-1">
              <li><Link href={"/" as Route} className="hover:text-rose">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link href={"/blog" as Route} className="hover:text-rose">Blog</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-charcoal">{post.title}</li>
            </ol>
          </nav>

          <header className="mb-8">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              {post.category}
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-muted">
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              <span aria-hidden>·</span>
              <span>{post.readMinutes} min read</span>
            </div>
          </header>

          <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-card bg-bg-soft">
            <Image
              src={post.heroImage}
              alt=""
              fill
              priority
              sizes="(max-width: 820px) 100vw, 820px"
              className="object-cover"
            />
          </div>

          <div className="blog-prose">
            {post.body}
          </div>

          <RelatedPosts currentSlug={slug} />

          <footer className="mt-12 border-t border-border-light pt-6">
            <Link
              href={"/blog" as Route}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-rose hover:underline"
            >
              ← All posts
            </Link>
          </footer>
        </article>

        {/* Inline prose styling — keeps the post component itself bare JSX */}
        <style>{`
          .blog-prose p { margin-top: 1em; line-height: 1.75; color: var(--text-mid); font-weight: 300; }
          .blog-prose h2 { margin-top: 2em; font-family: var(--font-display); font-size: 1.6rem; font-weight: 600; color: var(--charcoal); }
          .blog-prose h3 { margin-top: 1.6em; font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: var(--charcoal); }
          .blog-prose ol, .blog-prose ul { margin-top: 1em; padding-left: 1.5em; line-height: 1.75; color: var(--text-mid); }
          .blog-prose ol li, .blog-prose ul li { margin-top: 0.4em; }
          .blog-prose ol { list-style: decimal; }
          .blog-prose ul { list-style: disc; }
          .blog-prose a { color: var(--rose); text-decoration: underline; text-underline-offset: 2px; }
          .blog-prose a:hover { color: var(--rose-hover); }
          .blog-prose strong { color: var(--charcoal); font-weight: 600; }
          .blog-prose em { color: var(--rose); font-style: italic; }
        `}</style>
      </main>
    </>
  );
}
