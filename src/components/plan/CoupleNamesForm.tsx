"use client";

import { useState } from "react";

type Props = {
  partner1Name: string | null;
  partner2Name: string | null;
  onChange: (next: { partner1Name?: string | null; partner2Name?: string | null }) => void;
};

/**
 * Two neutral text fields at the top of /plan Step 1. Names go into
 * wedding_plans.partner1_name / partner2_name and feed the wedding-website
 * slug (partner1-and-partner2.regional-domain.com).
 *
 * Saves on blur via the parent's onChange — falls into the existing
 * PlannerDashboard debounced /api/plan/save flow.
 */
export function CoupleNamesForm({ partner1Name, partner2Name, onChange }: Props) {
  const [p1, setP1] = useState(partner1Name ?? "");
  const [p2, setP2] = useState(partner2Name ?? "");

  function commitP1() {
    const next = p1.trim() || null;
    if (next !== (partner1Name ?? null)) onChange({ partner1Name: next });
  }
  function commitP2() {
    const next = p2.trim() || null;
    if (next !== (partner2Name ?? null)) onChange({ partner2Name: next });
  }

  return (
    <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
      <header className="mb-5">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          Step 1 · You &amp; your partner
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold text-charcoal">
          Who&rsquo;s getting married?
        </h2>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="partner1Name" className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
            Your name
          </label>
          <input
            id="partner1Name"
            type="text"
            value={p1}
            placeholder="e.g. Charlotte"
            onChange={(e) => setP1(e.target.value)}
            onBlur={commitP1}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            autoComplete="given-name"
            maxLength={100}
            className="mt-1 w-full rounded-pill border border-border bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          />
        </div>
        <div>
          <label htmlFor="partner2Name" className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
            Your partner&rsquo;s name
          </label>
          <input
            id="partner2Name"
            type="text"
            value={p2}
            placeholder="e.g. Francis"
            onChange={(e) => setP2(e.target.value)}
            onBlur={commitP2}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            autoComplete="given-name"
            maxLength={100}
            className="mt-1 w-full rounded-pill border border-border bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <p className="mt-3 text-[0.7rem] italic text-text-muted">
        Used to personalise your wedding website URL.
      </p>
    </section>
  );
}
