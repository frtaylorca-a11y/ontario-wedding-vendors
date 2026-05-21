/**
 * Two presentations of the same data — vendor.{instagramHandle,
 * yelpUrl, pinterestUrl, website}:
 *
 *   <SocialPresence />    horizontal pill row, mounted under the
 *                         About/Gallery block. Compact, always shows
 *                         when at least one channel exists.
 *
 *   <FindThemOnline />    card grid mounted near the bottom — only
 *                         when the vendor has NO traditional website
 *                         but DOES have one or more social channels.
 *                         Acts as a substitute for the "Visit website"
 *                         button in that case.
 *
 * Both skip silently when there's nothing to show. No empty sections.
 */

export type VendorSocial = {
  vendorName:       string;
  instagramHandle:  string | null;
  yelpUrl:          string | null;
  pinterestUrl:     string | null;
  website:          string | null;
  googleRating:     string | null;   /* used by Yelp card subtitle when distinct */
  reviewCount:      number | null;
};

/* Normalize an IG handle into a (display, url) pair. Handles common
 * shapes: "@handle", "handle", "https://instagram.com/handle". */
function normalizeIg(raw: string | null): { display: string; url: string } | null {
  if (!raw) return null;
  let h = raw.trim();
  if (!h) return null;
  /* Strip URL prefix to extract just the handle. */
  const urlMatch = h.match(/instagram\.com\/([^/?#\s]+)/i);
  if (urlMatch) h = urlMatch[1];
  h = h.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
  if (!h) return null;
  return { display: `@${h}`, url: `https://instagram.com/${h}` };
}

function hasAnyChannel(v: VendorSocial): boolean {
  return !!(v.instagramHandle || v.yelpUrl || v.pinterestUrl || v.website);
}

function hasAnySocial(v: VendorSocial): boolean {
  return !!(v.instagramHandle || v.yelpUrl || v.pinterestUrl);
}

/* ─── Section 4: SocialPresence (pill row) ─────────────────────────── */

export function SocialPresence({ social }: { social: VendorSocial }) {
  if (!hasAnyChannel(social)) return null;
  const ig = normalizeIg(social.instagramHandle);

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold text-charcoal">
        Social presence
      </h2>
      <p className="mt-1 text-sm text-text-mid">
        Where you&rsquo;ll find {social.vendorName} online.
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {ig && (
          <SocialPill
            href={ig.url}
            icon={<IgIcon />}
            label="Instagram"
            value={ig.display}
          />
        )}
        {social.yelpUrl && (
          <SocialPill
            href={social.yelpUrl}
            icon={<StarIcon />}
            label="Yelp"
            value={
              social.googleRating && social.reviewCount
                ? `${social.googleRating}★ · ${social.reviewCount} reviews`
                : "Read reviews"
            }
          />
        )}
        {social.pinterestUrl && (
          <SocialPill
            href={social.pinterestUrl}
            icon={<PinIcon />}
            label="Pinterest"
            value="View portfolio"
          />
        )}
        {social.website && (
          <SocialPill
            href={social.website}
            icon={<GlobeIcon />}
            label="Website"
            value="Visit site"
          />
        )}
      </div>
    </section>
  );
}

function SocialPill({
  href, icon, label, value,
}: { href: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener nofollow"
      className="inline-flex items-center gap-2.5 rounded-pill border border-border bg-white px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-rose hover:text-rose"
    >
      <span className="text-rose">{icon}</span>
      <span className="font-semibold text-charcoal">{label}</span>
      <span className="text-text-muted" style={{ fontSize: "0.78rem" }}>·</span>
      <span className="text-text-mid" style={{ fontSize: "0.82rem" }}>{value}</span>
    </a>
  );
}

/* ─── Section 7: FindThemOnline (full card grid) ────────────────────── */

/* Renders ONLY when the vendor has no traditional website but DOES
 * have one or more social channels. Replaces the "Visit website" CTA
 * for these vendors. */
export function FindThemOnline({ social }: { social: VendorSocial }) {
  if (social.website) return null;          /* already has a real website */
  if (!hasAnySocial(social)) return null;   /* nothing to show */

  const ig = normalizeIg(social.instagramHandle);

  return (
    <section className="mt-12 rounded-card border border-border bg-white p-6 lg:p-8">
      <h2 className="font-display text-2xl font-semibold text-charcoal lg:text-3xl">
        Find {social.vendorName} online
      </h2>
      <p className="mt-1 text-sm text-text-mid">
        {social.vendorName} doesn&rsquo;t have a dedicated website yet — here&rsquo;s
        where to see their work.
      </p>

      <ul className="mt-6 divide-y divide-border-light">
        {ig && (
          <FindThemRow
            href={ig.url}
            icon={<IgIcon />}
            heading="Instagram"
            subheading={ig.display}
            cta="Follow on Instagram"
          />
        )}
        {social.yelpUrl && (
          <FindThemRow
            href={social.yelpUrl}
            icon={<StarIcon />}
            heading="Yelp"
            subheading={
              social.googleRating && social.reviewCount
                ? `${social.googleRating} stars · ${social.reviewCount} reviews`
                : "Customer reviews"
            }
            cta="Read reviews on Yelp"
          />
        )}
        {social.pinterestUrl && (
          <FindThemRow
            href={social.pinterestUrl}
            icon={<PinIcon />}
            heading="Pinterest"
            subheading="Wedding portfolio"
            cta="View portfolio"
          />
        )}
      </ul>
    </section>
  );
}

function FindThemRow({
  href, icon, heading, subheading, cta,
}: {
  href: string; icon: React.ReactNode; heading: string; subheading: string; cta: string;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener nofollow"
        className="group flex items-center gap-4 py-4 transition-colors hover:bg-bg-soft/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-rose-pale text-rose">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold text-charcoal group-hover:text-rose">
            {heading}
          </p>
          <p className="text-sm text-text-mid">{subheading}</p>
        </div>
        <span className="text-sm font-bold text-rose">
          {cta} <span aria-hidden>→</span>
        </span>
      </a>
    </li>
  );
}

/* ─── Icons (custom SVG — no icon-font dependency) ─────────────────── */

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15 9 22 9 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9 9 9 12 2" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  );
}
