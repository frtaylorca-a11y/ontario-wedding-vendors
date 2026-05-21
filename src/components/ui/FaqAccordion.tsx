import Link from "next/link";
import type { Route } from "next";

export type FaqItem = {
  question: string;
  answer:   string;
  /** Optional CTA hyperlink appended to the answer body. */
  link?: { text: string; href: string };
};

/**
 * Zero-JS FAQ accordion. Uses native <details>/<summary> so it works
 * with JS disabled, indexes cleanly, and avoids a hydration round-trip.
 *
 * Style: rose-pale card background, charcoal headings, rose accent on
 * the open chevron. Matches the "Niagara Edit" design tokens.
 */
export function FaqAccordion({
  items,
  heading,
  subheading,
}: {
  items:       FaqItem[];
  heading?:    string;
  subheading?: string;
}) {
  if (!items.length) return null;

  return (
    <section className="rounded-card border border-border bg-white p-6 lg:p-8">
      {heading && (
        <h2 className="font-display text-2xl text-charcoal lg:text-3xl">
          {heading}
        </h2>
      )}
      {subheading && (
        <p className="mt-2 max-w-[640px] text-sm text-text-mid">
          {subheading}
        </p>
      )}

      <div className={`${heading || subheading ? "mt-6" : ""} divide-y divide-border-light`}>
        {items.map((faq, i) => (
          <details
            key={i}
            className="group py-4 first:pt-0 last:pb-0"
            /* First FAQ open by default so the section reads as content,
             * not a hidden drawer. */
            open={i === 0}
          >
            <summary
              className="flex cursor-pointer list-none items-start justify-between gap-4 font-display text-lg text-charcoal hover:text-rose lg:text-xl"
            >
              <span>{faq.question}</span>
              <span
                aria-hidden
                className="mt-1 shrink-0 text-rose transition-transform group-open:rotate-45"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </summary>
            <div className="mt-3 max-w-[720px] text-[15px] leading-relaxed text-text-mid">
              <p>{faq.answer}</p>
              {faq.link && (
                <p className="mt-3">
                  <Link
                    href={faq.link.href as Route}
                    className="font-medium text-rose hover:underline"
                  >
                    {faq.link.text} →
                  </Link>
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
