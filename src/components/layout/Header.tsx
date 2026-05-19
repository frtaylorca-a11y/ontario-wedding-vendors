import Link from "next/link";
import type { Route } from "next";
import { getSiteStats } from "@/lib/queries";

const NAV_LINKS: { label: string; href: Route }[] = [
  { label: "Venues",  href: "/venues" as Route },
  { label: "Vendors", href: "/vendors" as Route },
  { label: "Plan",    href: "/plan" as Route },
  { label: "Blog",    href: "/blog" as Route },
  { label: "About",   href: "/about" as Route },
];

export async function Header() {
  const stats = await getSiteStats().catch(() => null);

  const trustItems = stats
    ? [
        `${stats.venueCount.toLocaleString()} venues`,
        `${stats.vendorCount.toLocaleString()} verified vendors`,
        `${stats.premierCount} premier listings`,
        "Updated every 60 days",
      ]
    : [
        "Google-verified Ontario wedding directory",
        "Updated every 60 days",
      ];

  return (
    <>
      <header
        className="sticky top-0 z-[100] border-b border-border bg-white/85 backdrop-blur-md"
        style={{ height: "58px" }}
      >
        <nav className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
          <Link
            href={"/" as Route}
            className="font-display text-[1.4rem] font-semibold leading-none text-charcoal transition-colors hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
          >
            Ontario Wedding <em className="italic text-rose">Vendors</em>
          </Link>

          <ul className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-sm font-medium text-text-mid transition-colors hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Link
              href={"/signin" as Route}
              className="hidden rounded-pill border border-border bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href={"/plan" as Route}
              className="inline-flex items-center rounded-pill bg-rose px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all duration-200 hover:bg-rose-hover hover:shadow-[0_6px_18px_rgba(185,100,118,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              Start planning
            </Link>
          </div>
        </nav>
      </header>

      <div className="bg-charcoal">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-6 py-2 text-center">
          {trustItems.map((item, i) => (
            <span key={item} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden className="text-white/35">
                  ·
                </span>
              )}
              <span
                className="font-medium text-white"
                style={{ fontSize: "0.7rem" }}
              >
                {item}
              </span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
