"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { RegisterModal } from "@/components/auth/RegisterGate";

/**
 * Nav-bar auth affordance. The site has no dedicated /signin page —
 * auth is magic-link only via RegisterModal — but the header still
 * needs a wayfinding entry point. This component keeps the "Sign in"
 * label familiar to users landing from the outside while routing the
 * click into the modal that the rest of the app already uses (heart-a-
 * venue prompt, save-budget prompt, publish-website gate).
 *
 * Behaviour:
 *   - Loading (auth state unknown) → shows "Sign in", opens modal on
 *     click. Safe default: if they're already authed, the modal shows
 *     the sign-in form which does nothing harmful.
 *   - Anonymous  → shows "Sign in", opens modal on click.
 *   - Authed     → shows "My plan", links directly to /plan (the
 *     effective account/dashboard for a couple).
 */
export function SignInNav() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [open,   setOpen]   = useState(false);

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

  const commonClasses =
    "hidden rounded-pill border border-border bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 sm:inline-flex";

  if (authed === true) {
    return (
      <Link href={"/plan" as Route} className={commonClasses}>
        My plan
      </Link>
    );
  }

  /* Anonymous OR loading — clicking always opens the magic-link
   * modal. `type="button"` keeps it out of any surrounding form
   * (the nav has none, but defensive against future refactors). */
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={commonClasses}
      >
        Sign in
      </button>
      {open && (
        <RegisterModal
          intent="sign-in"
          headline="Sign in to Ontario Wedding Vendors"
          subhead="We'll email you a link that signs you in for 30 days. No password required — your saved venues, wedding plan, and vendor shortlists come back with you."
          callbackUrl="/plan"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
