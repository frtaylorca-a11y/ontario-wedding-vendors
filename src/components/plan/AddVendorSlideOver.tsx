"use client";

import { useEffect, useRef, useState } from "react";
import { PLANNER_REGIONS, type BookedVendor } from "@/lib/plan-state";

const CATEGORY_LABEL: Record<string, string> = {
  photographer:    "Photographer",
  videographer:    "Videographer",
  dj:              "DJ",
  florist:         "Florist",
  photo_booth:     "Photo Booth",
  catering:        "Caterer",
  cake:            "Cake Designer",
  hair_makeup:     "Hair & Makeup Artist",
  officiant:       "Officiant",
  limo:            "Limo Service",
  lighting_decor:  "Lighting & Decor",
  wedding_planner: "Wedding Planner",
};

type Props = {
  open: boolean;
  category: string | null;
  defaultRegion: string;
  onClose: () => void;
  onBook: (vendor: BookedVendor) => void;
};

type ViewState = "form" | "matched" | "success";

type MatchResult = {
  vendorId: number;
  slug: string;
  name: string;
  category: string;
  city: string | null;
  region: string | null;
  googleRating: string | null;
  reviewCount: number | null;
  isPicBooth: boolean;
};

type SuggestionResult = {
  id: number;
  name: string;
  category: string;
  city: string;
  region: string;
};

const initialForm = {
  name: "",
  website: "",
  phone: "",
  city: "",
  notes: "",
};

export function AddVendorSlideOver({
  open,
  category,
  defaultRegion,
  onClose,
  onBook,
}: Props) {
  const [view, setView] = useState<ViewState>("form");
  const [form, setForm] = useState({ ...initialForm, region: defaultRegion });
  const [submitting, setSubmitting] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  /* Reset state every time the panel opens for a new category */
  useEffect(() => {
    if (open) {
      setView("form");
      setForm({ ...initialForm, region: defaultRegion });
      setMatch(null);
      setSuggestion(null);
      setError(null);
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open, category, defaultRegion]);

  /* Esc closes */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !category) return null;

  const categoryLabel = CATEGORY_LABEL[category] ?? category;

  async function callSuggestApi(forceInsert = false) {
    if (!form.name.trim() || !form.city.trim()) {
      setError("Please fill in the required fields.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const websiteOrIg = form.website.trim();
      const isInstagram = websiteOrIg.startsWith("@") || /^https?:\/\/(www\.)?instagram\.com\//i.test(websiteOrIg);

      const res = await fetch("/api/plan/suggest-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      form.name.trim(),
          category,
          website:   !isInstagram && websiteOrIg ? websiteOrIg : null,
          instagram: isInstagram ? websiteOrIg.replace(/^@/, "").replace(/.*instagram\.com\//, "").replace(/\/$/, "") : null,
          phone:     form.phone.trim() || null,
          city:      form.city.trim(),
          region:    form.region,
          notes:     form.notes.trim() || null,
          forceInsert,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Something went wrong. Try again.");
        return;
      }

      if (data.match) {
        setMatch(data.match);
        setView("matched");
      } else if (data.suggestionInserted) {
        setSuggestion(data.suggestionInserted);
        bookAsSuggestion(data.suggestionInserted);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function bookAsMatch(m: MatchResult) {
    onBook({
      vendorId:        m.vendorId,
      suggestedId:     null,
      name:            m.name,
      category:        m.category,
      city:            m.city,
      rating:          m.googleRating ? Number(m.googleRating) : null,
      isUserSuggested: false,
      isPicBooth:      m.isPicBooth,
      bookedAt:        new Date().toISOString(),
    });
    setView("success");
    setTimeout(onClose, 1500);
  }

  function bookAsSuggestion(s: SuggestionResult) {
    onBook({
      vendorId:        null,
      suggestedId:     s.id,
      name:            s.name,
      category:        s.category,
      city:            s.city,
      rating:          null,
      isUserSuggested: true,
      isPicBooth:      false,
      bookedAt:        new Date().toISOString(),
    });
    setView("success");
    setTimeout(onClose, 1500);
  }

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="fixed inset-0 z-[150] bg-charcoal/50 backdrop-blur-sm transition-opacity"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-vendor-title"
        className="fixed inset-y-0 right-0 z-[200] flex w-full max-w-[480px] flex-col bg-white shadow-2xl"
        style={{ animation: "slideIn 200ms ease-out" }}
      >
        {/* Sticky header */}
        <header className="flex items-start justify-between gap-4 border-b border-border-light bg-white p-6">
          <div>
            <div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-rose">
              Add a vendor
            </div>
            <h2
              id="add-vendor-title"
              className="mt-1 font-display text-2xl font-semibold leading-tight text-charcoal"
            >
              {view === "form" && `Add a ${categoryLabel.toLowerCase()} to your plan`}
              {view === "matched" && "We found a match"}
              {view === "success" && "Added to plan"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-pill border border-border bg-white text-text-mid transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STATE 1 — FORM */}
          {view === "form" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                callSuggestApi(false);
              }}
              className="space-y-5"
            >
              <Field label="Business name" required>
                <input
                  ref={firstFieldRef}
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={`e.g. ${categoryLabel === "Photographer" ? "Nordello Photography" : "Their business name"}`}
                  className="input"
                />
              </Field>

              <Field label="Category">
                <select
                  disabled
                  value={category}
                  className="input cursor-not-allowed bg-bg-soft text-text-mid"
                >
                  <option value={category}>{categoryLabel}</option>
                </select>
              </Field>

              <Field label="Website or Instagram" helper="Paste a URL or @handle — we auto-detect.">
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https:// or @handle"
                  className="input"
                />
              </Field>

              <Field label="Phone">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(905) 555-1234"
                  className="input"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City" required>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="St. Catharines"
                    className="input"
                  />
                </Field>
                <Field label="Region" required>
                  <select
                    required
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="input"
                  >
                    {PLANNER_REGIONS.map((r) => (
                      <option key={r.slug} value={r.slug}>{r.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="My photographer from high school — does great candid work"
                  className="input resize-none"
                />
              </Field>

              {error && (
                <p className="rounded-card border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {error}
                </p>
              )}
            </form>
          )}

          {/* STATE 2 — MATCH CONFIRMATION */}
          {view === "matched" && match && (
            <div>
              <p className="text-sm text-text-mid">
                Did you mean…
              </p>

              <div className="mt-3 rounded-card border-[1.5px] border-border bg-white p-5">
                {match.googleRating && (
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <span className="leading-none tracking-wider text-gold">
                      {"★".repeat(Math.round(Number(match.googleRating)))}
                      <span className="text-border">{"★".repeat(5 - Math.round(Number(match.googleRating)))}</span>
                    </span>
                    <span className="text-text-mid">
                      {match.googleRating}
                      {match.reviewCount != null && (
                        <span className="text-text-muted"> ({match.reviewCount} reviews)</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="font-display text-xl font-semibold text-charcoal">
                  {match.name}
                </div>
                <div className="mt-1 text-sm text-text-mid">
                  {categoryLabel}
                  {match.city ? ` · ${match.city}` : ""}
                </div>
                {match.isPicBooth && (
                  <div className="mt-2 inline-flex items-center rounded-pill bg-gold-light px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-charcoal">
                    Site partner
                  </div>
                )}
              </div>

              <p className="mt-4 text-[0.7rem] leading-relaxed text-text-muted">
                We&rsquo;re matching on name — if this isn&rsquo;t them, click
                &ldquo;No&rdquo; and we&rsquo;ll save your entry as a new
                suggestion.
              </p>
            </div>
          )}

          {/* STATE 3 — SUCCESS */}
          {view === "success" && (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-pale text-rose">
                <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="mt-4 font-display text-xl font-semibold text-charcoal">
                Added to your plan
              </p>
              <p className="mt-1 text-sm text-text-mid">
                {match ? match.name : suggestion?.name} is now in your{" "}
                {categoryLabel.toLowerCase()} slot.
              </p>
              <p className="mt-3 text-xs text-text-muted">Closing…</p>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        {view !== "success" && (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border-light bg-white p-6">
            {view === "form" && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-pill border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-mid transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => callSuggestApi(false)}
                  className="inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {submitting ? "Checking…" : "Add to my plan"}
                  <span aria-hidden>→</span>
                </button>
              </>
            )}
            {view === "matched" && match && (
              <>
                <button
                  type="button"
                  onClick={() => callSuggestApi(true)}
                  className="rounded-pill border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-mid transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                >
                  No, different vendor
                </button>
                <button
                  type="button"
                  onClick={() => bookAsMatch(match)}
                  className="inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                >
                  Yes, that&rsquo;s them
                  <span aria-hidden>✓</span>
                </button>
              </>
            )}
          </footer>
        )}
      </aside>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1.5px solid var(--color-border);
          border-radius: 999px;
          font-size: 0.875rem;
          color: var(--color-text);
          background: white;
        }
        .input:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px white, 0 0 0 4px var(--color-rose);
        }
        textarea.input {
          border-radius: 16px;
          padding: 0.75rem 0.875rem;
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
        {label}
        {required && <span className="ml-1 text-rose">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {helper && <span className="mt-1 block text-[0.7rem] text-text-muted">{helper}</span>}
    </label>
  );
}
