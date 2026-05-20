"use client";

import { useState } from "react";

/* Password gate for /weddings/[slug] — rendered server-side when the
 * plan has a wedding_password and the request didn't carry the
 * matching auth cookie. POSTs to /api/weddings/auth to set the cookie
 * and reload. */
export function PasswordGate({
  slug,
  coupleLabel,
}: {
  slug: string;
  coupleLabel: string;
}) {
  const [password, setPassword] = useState("");
  const [busy,    setBusy]      = useState(false);
  const [error,   setError]     = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/weddings/auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slug, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Incorrect password.");
        return;
      }
      /* Cookie set — reload to render the real page. */
      window.location.reload();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        backgroundColor: "var(--wt-page-bg)",
        color: "var(--wt-ink)",
        fontFamily: "var(--wt-font-body)",
      }}
      className="flex min-h-screen items-center justify-center px-6 py-16"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-[420px] rounded-2xl border p-8 text-center shadow-sm"
        style={{ background: "var(--wt-surface)", borderColor: "var(--wt-border)" }}
      >
        <div className="text-xs font-bold uppercase tracking-[0.18em]"
             style={{ color: "var(--wt-accent)" }}>
          Private
        </div>
        <h1
          className="mt-3 text-3xl font-semibold leading-tight"
          style={{
            fontFamily: "var(--wt-font-display)",
            fontStyle: "var(--wt-display-italic)",
          }}
        >
          {coupleLabel}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--wt-ink-muted)" }}>
          Enter the password to view the wedding website.
        </p>

        <input
          type="password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-6 w-full rounded-full border px-4 py-3 text-sm focus:outline-none"
          style={{ borderColor: "var(--wt-border)", background: "var(--wt-surface-alt)" }}
          placeholder="Password"
        />

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition-colors disabled:opacity-60"
          style={{ background: "var(--wt-accent)", color: "var(--wt-accent-ink)" }}
        >
          {busy ? "Checking…" : "Enter →"}
        </button>
      </form>
    </main>
  );
}
