"use client";

import { useState } from "react";

/**
 * Reusable newsletter signup form.
 *
 * Variants — same component, different layouts:
 *   inline   default — horizontal, used in the homepage footer band
 *   stacked  used in sidebars (/plan) and the blog index where width
 *            is tight; fields and button stack vertically
 *   card     a self-contained card with a heading + subheading, used
 *            mid-page (e.g. as a row on the blog index)
 *
 * Backed by POST /api/newsletter/subscribe — already exists in this
 * codebase. Returns success message on 2xx, surfaces the error string
 * on 4xx/5xx. Validates email + first name client-side so we don't
 * fire a request for obvious noise.
 */
export type NewsletterVariant = "inline" | "stacked" | "card";

export function NewsletterSignup({
  variant   = "inline",
  region,
  heading,
  subheading,
}: {
  variant?:   NewsletterVariant;
  /** Optional region tag — passed through to the API so we can later
   *  segment the digest by region when the audience grows. */
  region?:    string;
  /** Used only by the `card` variant (defaults provided). */
  heading?:    string;
  subheading?: string;
}) {
  const [email,     setEmail]     = useState("");
  const [firstName, setFirstName] = useState("");
  const [status,    setStatus]    = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error,     setError]     = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    /* Client-side validation — cheap signal before we burn an API
     * round-trip. The server re-validates with Zod. */
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({
          email:  trimmedEmail,
          name:   firstName.trim() || undefined,
          region: region ?? undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Subscription failed. Please try again.");
      }
      setStatus("success");
      setEmail("");
      setFirstName("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Subscription failed.");
    }
  }

  if (status === "success") {
    return (
      <div
        className={
          variant === "card"
            ? "rounded-card border border-emerald-200 bg-emerald-50 p-5 text-center"
            : "rounded-pill bg-emerald-50 px-5 py-3 text-center text-sm text-emerald-900"
        }
        role="status"
      >
        You&rsquo;re in! Weekly Ontario wedding tips every Sunday.
      </div>
    );
  }

  /* Card variant — self-contained block with title + copy. */
  if (variant === "card") {
    return (
      <section className="rounded-card border border-rose/30 bg-rose-pale p-6 lg:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          Weekly newsletter
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-charcoal lg:text-3xl">
          {heading ?? "Ontario wedding planning, in your inbox."}
        </h2>
        <p className="mt-1 max-w-[480px] text-sm text-text-mid">
          {subheading ?? "One short edition every Sunday — regional venue picks, vendor pricing, and the planning tips couples actually use. Free, unsubscribe anytime."}
        </p>
        <SignupFields
          variant="stacked"
          email={email} setEmail={setEmail}
          firstName={firstName} setFirstName={setFirstName}
          status={status} error={error}
          onSubmit={onSubmit}
        />
      </section>
    );
  }

  return (
    <SignupFields
      variant={variant}
      email={email} setEmail={setEmail}
      firstName={firstName} setFirstName={setFirstName}
      status={status} error={error}
      onSubmit={onSubmit}
    />
  );
}

/* ─── Field group — shared by the inline + stacked variants ────────── */

function SignupFields({
  variant, email, setEmail, firstName, setFirstName,
  status, error, onSubmit,
}: {
  variant:      Exclude<NewsletterVariant, "card">;
  email:        string;
  setEmail:     (s: string) => void;
  firstName:    string;
  setFirstName: (s: string) => void;
  status:       "idle" | "submitting" | "success" | "error";
  error:        string | null;
  onSubmit:     (e: React.FormEvent) => void;
}) {
  const stacked = variant === "stacked";
  return (
    <form
      onSubmit={onSubmit}
      className={
        stacked
          ? "mt-4 flex flex-col gap-2"
          : "mt-3 flex flex-wrap items-stretch gap-2"
      }
    >
      <input
        type="text"
        name="firstName"
        placeholder="First name"
        autoComplete="given-name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className={`rounded-pill border border-border bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-text-muted focus:border-rose focus:outline-none ${
          stacked ? "w-full" : "min-w-[160px] flex-1"
        }`}
      />
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`rounded-pill border border-border bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-text-muted focus:border-rose focus:outline-none ${
          stacked ? "w-full" : "min-w-[220px] flex-1"
        }`}
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className={`rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover disabled:opacity-50 ${
          stacked ? "w-full" : ""
        }`}
      >
        {status === "submitting" ? "Joining…" : "Subscribe"}
      </button>
      {error && (
        <p
          className={`text-xs text-red-700 ${stacked ? "" : "basis-full"}`}
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
}
