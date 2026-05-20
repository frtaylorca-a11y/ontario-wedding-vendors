"use client";

import { useState } from "react";

type Props = {
  /** Snapshot of plan readiness — drives the checklist */
  readiness: {
    venueSelected:   boolean;
    guestListAdded:  boolean;
    itineraryStarted: boolean;
    musicSaved:      boolean;
  };
  /** Already-activated state (server-loaded) */
  activated: {
    slug:         string | null;
    qrCodeUrl:    string | null;
    djPortalUrl:  string | null;
    adminUrl:     string | null;
    activatedAt:  string | null;
  };
};

type ActivateResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  slug?: string;
  qrCodeUrl?: string;
  djPortalUrl?: string;
  adminUrl?: string;
  publicUrl?: string;
};

export function OneQrActivationCard({ readiness, activated }: Props) {
  const [state, setState] = useState({
    submitting: false,
    error:      null as string | null,
    fallback:   null as string | null,
    result:     activated.slug
      ? {
          slug:         activated.slug,
          qrCodeUrl:    activated.qrCodeUrl ?? null,
          djPortalUrl:  activated.djPortalUrl ?? null,
          adminUrl:     activated.adminUrl ?? null,
          publicUrl:    `https://oneqr.events/e/${activated.slug}`,
        }
      : null,
  });

  async function activate() {
    setState((s) => ({ ...s, submitting: true, error: null, fallback: null }));
    try {
      const res = await fetch("/api/oneqr/activate", { method: "POST" });
      const data = (await res.json()) as ActivateResponse;
      if (res.ok && data.slug) {
        setState({
          submitting: false,
          error:      null,
          fallback:   null,
          result: {
            slug:         data.slug,
            qrCodeUrl:    data.qrCodeUrl    ?? null,
            djPortalUrl:  data.djPortalUrl  ?? null,
            adminUrl:     data.adminUrl     ?? null,
            publicUrl:    data.publicUrl    ?? `https://oneqr.events/e/${data.slug}`,
          },
        });
      } else if (res.status === 503 && data.error === "oneqr_not_configured") {
        setState((s) => ({
          ...s,
          submitting: false,
          fallback:   data.message ?? "OneQR activation coming soon — your data is saved and ready.",
        }));
      } else {
        setState((s) => ({
          ...s,
          submitting: false,
          error: data.error ?? "Activation failed. Try again in a moment.",
        }));
      }
    } catch {
      setState((s) => ({
        ...s,
        submitting: false,
        error: "Network error. Try again.",
      }));
    }
  }

  /* Activated state — render the post-activation card */
  if (state.result) {
    return (
      <section className="rounded-card border-[1.5px] border-rose bg-white p-6 lg:p-8">
        <header className="mb-5">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            OneQR · Activated
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
            Your wedding QR is live
          </h2>
          <p className="mt-2 text-sm text-text-mid">
            One link your guests scan from save-the-date through wedding day:
            RSVP form now, seating chart + live gallery + day timeline on the
            wedding itself.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-[180px_1fr] sm:items-start">
          {state.result.qrCodeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.result.qrCodeUrl}
              alt="OneQR code for your wedding"
              className="h-44 w-44 rounded-card border border-border bg-white p-2"
            />
          ) : (
            <div className="flex h-44 w-44 items-center justify-center rounded-card border border-dashed border-border bg-bg-soft text-xs text-text-muted">
              QR code pending
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
              Public URL
            </div>
            <a
              href={state.result.publicUrl}
              target="_blank"
              rel="noopener"
              className="mt-1 inline-block break-all font-mono text-sm text-rose hover:underline"
            >
              {state.result.publicUrl}
            </a>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={state.result.publicUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-pill bg-rose px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              >
                View guest experience →
              </a>
              {state.result.djPortalUrl && (
                <a
                  href={state.result.djPortalUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-pill border border-rose bg-white px-4 py-2 text-sm font-bold text-rose transition-colors hover:bg-rose hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                >
                  Open DJ portal →
                </a>
              )}
              {state.result.adminUrl && (
                <a
                  href={state.result.adminUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-pill border border-border bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                >
                  Share with vendors →
                </a>
              )}
            </div>
            {activated.activatedAt && (
              <p className="mt-3 text-[0.65rem] text-text-muted">
                Activated {new Date(activated.activatedAt).toLocaleDateString("en-CA", {
                  year:  "numeric",
                  month: "long",
                  day:   "numeric",
                })}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  const items: Array<{ ok: boolean; label: string }> = [
    { ok: readiness.venueSelected,    label: "Venue selected" },
    { ok: readiness.guestListAdded,   label: "Guest list added" },
    { ok: readiness.itineraryStarted, label: "Itinerary started" },
    { ok: readiness.musicSaved,       label: "Music preferences saved" },
  ];

  return (
    <section className="rounded-card border-[1.5px] border-rose bg-rose-pale p-6 lg:p-8">
      <header className="mb-5">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          OneQR · Activation
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
          One QR for save-the-date through wedding day
        </h2>
        <p className="mt-2 text-sm text-text-mid">
          Unlocks a DJ portal with 16,000+ songs, live guest gallery,
          searchable seating chart, and day timeline. Same URL evolves from
          RSVP form → wedding-day hub → photo archive.
        </p>
      </header>

      <ul className="mb-5 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                item.ok ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-text-muted"
              }`}
            >
              {item.ok ? (
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              )}
            </span>
            <span className={item.ok ? "text-charcoal" : "text-text-muted"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={activate}
          disabled={state.submitting}
          className="inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {state.submitting ? "Activating…" : "Activate OneQR →"}
        </button>
        <span className="text-[0.7rem] text-text-muted">
          You can activate any time — readiness is a suggestion, not a gate.
        </span>
      </div>

      {state.fallback && (
        <p className="mt-4 rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {state.fallback}
        </p>
      )}
      {state.error && (
        <p className="mt-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </section>
  );
}
