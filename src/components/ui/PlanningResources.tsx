import Link from "next/link";
import type { Route } from "next";
import type { ResolvedVendorResources } from "@/lib/vendor-resources-resolver";

/**
 * Planning Resources section — rendered above Similar Vendors on each
 * /vendors/[category]/[slug] page. Two white cards with a rose accent.
 *
 * For photo_booth vendor pages (except Pic Booth's own listing) we
 * also render a third "Featured Local Provider" card that points to
 * picbooth.ca with editorial copy.
 */
export function PlanningResources({
  resources,
  showPicBoothCard = false,
}: {
  resources:         ResolvedVendorResources;
  showPicBoothCard?: boolean;
}) {
  const { howTo, cost } = resources;

  /* Don't render the heading + grid if there's nothing to show. */
  if (!howTo && !cost && !showPicBoothCard) return null;

  return (
    <section className="mt-12 rounded-card border border-border bg-white p-6 lg:p-8">
      <h2 className="font-display text-2xl text-charcoal lg:text-3xl">
        Planning Resources
      </h2>
      <p className="mt-1 text-sm text-text-mid">
        Ontario guides to help you choose — written by the team behind the directory.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {howTo && <ResourceCard slug={howTo.slug} label={howTo.label} kind="howTo" />}
        {cost  && <ResourceCard slug={cost.slug}  label={cost.label}  kind="cost"  />}
        {showPicBoothCard && <PicBoothFeaturedCard />}
      </div>
    </section>
  );
}

function ResourceCard({
  slug, label, kind,
}: { slug: string; label: string; kind: "howTo" | "cost" }) {
  /* Pictogram differs by kind. Custom SVG — no icon-font dependency. */
  const icon = kind === "howTo"
    ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-rose" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      )
    : (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-rose" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="12" y1="2"  x2="12" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );

  return (
    <Link
      href={`/blog/${slug}` as Route}
      className="group block rounded-card border border-rose/30 bg-rose-pale p-5 transition-all hover:-translate-y-0.5 hover:border-rose hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-pill bg-white p-2">{icon}</div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            {kind === "howTo" ? "How-to guide" : "Cost guide"}
          </p>
          <p className="mt-1 font-display text-base font-semibold leading-snug text-charcoal group-hover:text-rose">
            {label}
          </p>
          <p className="mt-3 text-xs font-medium text-rose">Read the guide →</p>
        </div>
      </div>
    </Link>
  );
}

function PicBoothFeaturedCard() {
  return (
    <a
      href="https://picbooth.ca/wedding-photo-booth/"
      target="_blank"
      rel="noopener"
      className="group block rounded-card border border-rose bg-cream p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-pill bg-rose p-2">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polygon points="12 2 15 9 22 9 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9 9 9 12 2" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Featured Local Provider
          </p>
          <p className="mt-1 font-display text-base font-semibold leading-snug text-charcoal group-hover:text-rose">
            Pic Booth
          </p>
          <p className="mt-2 text-xs text-text-mid">
            Premium photo booth rentals across Niagara, Hamilton, and the GTA —
            including Magic Mirror, 360 Booth, and Draw Bots.
          </p>
          <p className="mt-3 text-xs font-medium text-rose">View packages →</p>
        </div>
      </div>
    </a>
  );
}
