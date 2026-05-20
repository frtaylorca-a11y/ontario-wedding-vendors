import Link from "next/link";
import type { Route } from "next";

export function ListYourVenueCTA() {
  return (
    <section className="bg-bg-soft border-y border-border">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-6 px-6 py-16 text-center md:flex-row md:justify-between md:gap-10 md:text-left">
        <div className="max-w-[640px]">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            For venue owners
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal md:text-4xl">
            Own a wedding venue?{" "}
            <em className="italic text-rose">Get listed free.</em>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-mid">
            Reach engaged couples searching across Ontario. Basic listings are
            free — featured spots start at $75/month.
          </p>
        </div>
        <Link
          href={"/list-your-venue" as Route}
          className="inline-flex items-center gap-2 rounded-pill bg-rose px-7 py-3.5 font-bold text-white shadow-[0_8px_24px_rgba(185,100,118,0.35)] transition-all duration-200 hover:bg-rose-hover hover:shadow-[0_12px_32px_rgba(185,100,118,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
        >
          Get listed free
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
