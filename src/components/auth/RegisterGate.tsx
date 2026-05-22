"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Reusable registration gate. Wraps any trigger element; when the
 * couple is anonymous AND the gate is active, clicking the child fires
 * the registration modal instead of the original action. Once signed
 * in, the modal becomes a passthrough and the wrapped action runs.
 *
 * Usage:
 *   <RegisterGate
 *     active={savedVenueCount >= 3}
 *     intent="save-shortlist"
 *     headline="Save more venues to your shortlist"
 *     subhead="Sign in to save unlimited venues, and we'll keep your
 *              wedding plan in sync across every device."
 *     onProceed={() => actuallySaveVenue()}
 *   >
 *     <button>Save</button>
 *   </RegisterGate>
 *
 * The gate auto-detects sign-in state via /api/auth/me. While loading
 * state is unknown the child is rendered but its onClick is captured;
 * pressing it opens the modal as if anonymous (safe default).
 */
export type RegisterGateIntent =
  | "save-shortlist"
  | "save-budget"
  | "publish-website"
  | "sign-in";

export function RegisterGate({
  active,
  intent,
  headline,
  subhead,
  callbackUrl,
  onProceed,
  children,
}: {
  active:      boolean;
  intent:      RegisterGateIntent;
  headline:    string;
  subhead:     string;
  callbackUrl?: string;
  /** Called instead of opening the modal when user is already signed in. */
  onProceed?:  () => void;
  children:    ReactNode;
}) {
  const [authed,  setAuthed]  = useState<boolean | null>(null);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j: { authenticated?: boolean }) => {
        if (!cancelled) setAuthed(Boolean(j.authenticated));
      })
      .catch(() => { if (!cancelled) setAuthed(false); });
    return () => { cancelled = true; };
  }, []);

  function handleClick(e: React.MouseEvent) {
    /* If already authed OR the gate isn't active, let the child do
     * whatever it normally does. */
    if (authed === true || !active) {
      onProceed?.();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <span onClickCapture={handleClick} style={{ display: "contents" }}>
        {children}
      </span>
      {open && (
        <RegisterModal
          intent={intent}
          headline={headline}
          subhead={subhead}
          callbackUrl={callbackUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function RegisterModal({
  intent,
  headline,
  subhead,
  callbackUrl,
  onClose,
}: {
  intent:       RegisterGateIntent;
  headline:     string;
  subhead:      string;
  callbackUrl?: string;
  onClose:      () => void;
}) {
  const [email,   setEmail]   = useState("");
  const [status,  setStatus]  = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error,   setError]   = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email,
          intent,
          callbackUrl: callbackUrl ?? (typeof window !== "undefined" ? window.location.pathname : "/plan"),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "send failed");
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "send failed");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-gate-headline"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {status !== "sent" ? (
          <>
            <h2
              id="register-gate-headline"
              className="font-display text-2xl text-charcoal mb-2"
            >
              {headline}
            </h2>
            <p className="text-sm text-text-muted leading-relaxed mb-5">{subhead}</p>
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-xs font-medium text-charcoal">
                Email address
                <input
                  type="email"
                  required
                  value={email}
                  autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/30"
                  placeholder="you@example.com"
                />
              </label>
              <button
                type="submit"
                disabled={status === "sending" || !email.includes("@")}
                className="block w-full rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white hover:bg-rose-light disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Email me a sign-in link"}
              </button>
              {error && <p className="text-xs text-red-700">{error}</p>}
              <button
                type="button"
                onClick={onClose}
                className="block w-full text-center text-xs text-text-muted hover:text-charcoal mt-1"
              >
                Cancel
              </button>
            </form>
            <p className="mt-5 text-[11px] text-text-muted leading-relaxed">
              No password — we'll email you a link that signs you in for 30 days.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl text-charcoal mb-2">Check your email</h2>
            <p className="text-sm text-text-muted leading-relaxed mb-5">
              We sent a sign-in link to <strong>{email}</strong>. Open it on this device to
              save your work and unlock unlimited shortlists.
            </p>
            <button
              onClick={onClose}
              className="block w-full rounded-full border border-border bg-white px-6 py-2.5 text-sm font-semibold text-charcoal hover:border-rose hover:text-rose"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
