"use client";

import { useState } from "react";

type ListingType = "venue" | "vendor";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; claimId: number | null }
  | { kind: "error"; message: string };

const VENDOR_CATEGORIES: { value: string; label: string }[] = [
  { value: "photographer",    label: "Photographer" },
  { value: "videographer",    label: "Videographer" },
  { value: "dj",              label: "DJ" },
  { value: "florist",         label: "Florist" },
  { value: "photo_booth",     label: "Photo Booth" },
  { value: "catering",        label: "Catering" },
  { value: "cake",            label: "Cake Designer" },
  { value: "hair_makeup",     label: "Hair & Makeup" },
  { value: "officiant",       label: "Officiant" },
  { value: "limo",            label: "Limo / Transportation" },
  { value: "lighting_decor",  label: "Lighting & Decor" },
  { value: "wedding_planner", label: "Wedding Planner" },
];

export function ClaimListingForm({
  initialBusinessName = "",
}: {
  initialBusinessName?: string;
}) {
  const [listingType, setListingType]     = useState<ListingType>("venue");
  const [businessName, setBusinessName]   = useState(initialBusinessName);
  const [category, setCategory]           = useState("");
  const [businessUrl, setBusinessUrl]     = useState("");
  const [claimantName, setClaimantName]   = useState("");
  const [claimantEmail, setClaimantEmail] = useState("");
  const [claimantPhone, setClaimantPhone] = useState("");
  const [claimantRole, setClaimantRole]   = useState("");
  const [message, setMessage]             = useState("");
  const [state, setState]                 = useState<SubmitState>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/claim-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingType,
          category:      listingType === "vendor" ? (category || null) : null,
          businessName:  businessName.trim(),
          businessUrl:   businessUrl.trim()  || null,
          claimantName:  claimantName.trim(),
          claimantEmail: claimantEmail.trim(),
          claimantPhone: claimantPhone.trim() || null,
          claimantRole:  claimantRole.trim()  || null,
          message:       message.trim()       || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setState({ kind: "success", claimId: json.claimId ?? null });
      } else {
        setState({
          kind: "error",
          message: json.error === "Invalid input"
            ? "Please check the highlighted fields and try again."
            : "Submission failed. Try again in a moment.",
        });
      }
    } catch {
      setState({ kind: "error", message: "Network error. Try again." });
    }
  }

  if (state.kind === "success") {
    return (
      <div className="rounded-card border border-rose bg-rose-pale p-8 text-center">
        <h2 className="font-display text-3xl font-semibold text-charcoal">
          Thanks {claimantName.split(" ")[0] || "—"}!
        </h2>
        <p className="mt-3 text-text-mid">
          We&rsquo;ll be in touch within 24 hours at{" "}
          <strong className="font-semibold text-charcoal">{claimantEmail}</strong>{" "}
          to verify and activate your listing for{" "}
          <strong className="font-semibold text-charcoal">{businessName}</strong>.
        </p>
        {state.claimId != null && (
          <p className="mt-2 text-[0.7rem] text-text-muted">
            Reference #{state.claimId}
          </p>
        )}
      </div>
    );
  }

  const disabled = state.kind === "submitting";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8"
    >
      {/* Listing type */}
      <fieldset>
        <legend className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
          What are you claiming?
        </legend>
        <div className="mt-2 inline-flex rounded-pill border border-border bg-bg-warm p-1">
          {(["venue", "vendor"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setListingType(t)}
              aria-pressed={listingType === t}
              className={
                listingType === t
                  ? "rounded-pill bg-rose px-4 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-white"
                  : "rounded-pill px-4 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-text-mid hover:text-rose"
              }
            >
              {t === "venue" ? "Wedding venue" : "Wedding vendor"}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Business name + (category | url) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={listingType === "venue" ? "Venue name" : "Business name"}
          required
        >
          <input
            type="text"
            required
            disabled={disabled}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={listingType === "venue"
              ? "e.g. White Oaks Resort & Spa"
              : "e.g. Verve Photography"}
            className={inputClass}
            maxLength={255}
          />
        </Field>
        {listingType === "vendor" ? (
          <Field label="Category" required>
            <select
              required
              disabled={disabled}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>Pick one…</option>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Business website" hint="Helps us verify the listing">
            <input
              type="url"
              disabled={disabled}
              value={businessUrl}
              onChange={(e) => setBusinessUrl(e.target.value)}
              placeholder="https://"
              className={inputClass}
              maxLength={500}
            />
          </Field>
        )}
      </div>

      {/* Vendor type needs URL on its own row since category took the second slot */}
      {listingType === "vendor" && (
        <Field label="Business website" hint="Helps us verify the listing">
          <input
            type="url"
            disabled={disabled}
            value={businessUrl}
            onChange={(e) => setBusinessUrl(e.target.value)}
            placeholder="https://"
            className={inputClass}
            maxLength={500}
          />
        </Field>
      )}

      {/* Claimant identity */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required>
          <input
            type="text"
            required
            disabled={disabled}
            value={claimantName}
            onChange={(e) => setClaimantName(e.target.value)}
            className={inputClass}
            maxLength={120}
            autoComplete="name"
          />
        </Field>
        <Field label="Your role" hint="e.g. owner, coordinator, manager">
          <input
            type="text"
            disabled={disabled}
            value={claimantRole}
            onChange={(e) => setClaimantRole(e.target.value)}
            className={inputClass}
            maxLength={120}
            autoComplete="organization-title"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" required>
          <input
            type="email"
            required
            disabled={disabled}
            value={claimantEmail}
            onChange={(e) => setClaimantEmail(e.target.value)}
            className={inputClass}
            maxLength={255}
            autoComplete="email"
          />
        </Field>
        <Field label="Phone" hint="Optional — verifies faster">
          <input
            type="tel"
            disabled={disabled}
            value={claimantPhone}
            onChange={(e) => setClaimantPhone(e.target.value)}
            className={inputClass}
            maxLength={50}
            autoComplete="tel"
          />
        </Field>
      </div>

      <Field label="Anything else?" hint="Corrections, photos, package info — all optional">
        <textarea
          disabled={disabled}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          className={`${inputClass} resize-y`}
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-light pt-4">
        <p className="text-[0.7rem] text-text-muted">
          We&rsquo;ll review within 24 hours. By submitting you confirm
          you&rsquo;re authorised to manage this listing.
        </p>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {disabled ? "Submitting…" : "Claim my free listing →"}
        </button>
      </div>

      {state.kind === "error" && (
        <p className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}

const inputClass =
  "mt-1 w-full rounded-pill border border-border bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 disabled:bg-bg-warm disabled:opacity-70";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
        {label}
        {required && <span aria-hidden className="ml-1 text-rose">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[0.65rem] text-text-muted">{hint}</span>}
    </label>
  );
}
