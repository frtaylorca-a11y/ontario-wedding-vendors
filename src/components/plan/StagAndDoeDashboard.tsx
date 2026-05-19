"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_STAG_AND_DOE,
  calculateStagTotals,
  type StagAndDoeState,
} from "@/lib/plan-state";

const LS_KEY = "owv_stag_state_v1";
const SAVE_DEBOUNCE_MS = 800;
const PIC_BOOTH_START_PRICE = 799;

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

type Props = {
  sessionId: string;
  initialState: StagAndDoeState | null;
};

export function StagAndDoeDashboard({ sessionId, initialState }: Props) {
  const [state, setState] = useState<StagAndDoeState>(() => ({
    ...DEFAULT_STAG_AND_DOE,
    ...(initialState ?? {}),
  }));

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  /* Hydrate from localStorage on first render if no DB state */
  useEffect(() => {
    if (initialState) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
  }, [initialState]);

  /* Persist on every change */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/plan/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stagAndDoe: state }),
        });
        setSaveStatus(res.ok ? "saved" : "error");
      } catch {
        setSaveStatus("error");
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const totals = useMemo(() => calculateStagTotals(state), [state]);

  function patch<K extends keyof StagAndDoeState>(key: K, value: StagAndDoeState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }
  function patchRevenue<K extends keyof StagAndDoeState["revenue"]>(key: K, value: number) {
    setState((s) => ({ ...s, revenue: { ...s.revenue, [key]: Math.max(0, value || 0) } }));
  }
  function patchExpenses<K extends keyof StagAndDoeState["expenses"]>(key: K, value: number) {
    setState((s) => ({ ...s, expenses: { ...s.expenses, [key]: Math.max(0, value || 0) } }));
  }
  function patchGames<K extends keyof StagAndDoeState["games"]>(key: K, value: boolean) {
    setState((s) => ({ ...s, games: { ...s.games, [key]: value } }));
  }

  function addTicketEntry() {
    setState((s) => ({
      ...s,
      ticketTracker: [
        ...s.ticketTracker,
        { id: crypto.randomUUID(), name: "", tickets: 1, paid: false },
      ],
    }));
  }
  function updateTicketEntry(id: string, patch: Partial<StagAndDoeState["ticketTracker"][number]>) {
    setState((s) => ({
      ...s,
      ticketTracker: s.ticketTracker.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }
  function removeTicketEntry(id: string) {
    setState((s) => ({
      ...s,
      ticketTracker: s.ticketTracker.filter((t) => t.id !== id),
    }));
  }

  const trackerTotalTickets = state.ticketTracker.reduce((sum, t) => sum + (t.paid ? t.tickets : 0), 0);
  const trackerTotalRevenue = trackerTotalTickets * state.ticketPrice;

  const gamesSelected = Object.values(state.games).filter(Boolean).length;
  const remaining = Math.max(0, state.goalAmount - totals.totalRevenue);

  return (
    <div className="space-y-6">
      {/* Save bar */}
      <div className="flex items-center justify-between rounded-pill bg-white px-4 py-2 text-xs text-text-mid shadow-[var(--shadow-card)]">
        <span>
          Plan saved automatically · session{" "}
          <code className="rounded bg-bg-soft px-1.5 py-0.5 text-[0.65rem]">
            {sessionId.slice(0, 8)}…
          </code>
        </span>
        <span
          className={
            saveStatus === "saving" ? "text-text-muted" :
            saveStatus === "saved" ? "text-green" :
            saveStatus === "error" ? "text-red-600" : "text-text-muted"
          }
        >
          {saveStatus === "saving" && "● Saving…"}
          {saveStatus === "saved" && "✓ All changes saved"}
          {saveStatus === "error" && "⚠ Save failed (local copy kept)"}
          {saveStatus === "idle" && "Ready"}
        </span>
      </div>

      {/* SECTION 1 — Event basics */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-6">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Section 1 · Basics
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
            Event basics
          </h2>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel label="Event name">
            <input
              type="text"
              value={state.eventName}
              onChange={(e) => patch("eventName", e.target.value)}
              placeholder='e.g. "Jack & Jill for Charlotte & Francis"'
              className="stag-input"
            />
          </FieldLabel>
          <FieldLabel label="Event date">
            <input
              type="date"
              value={state.eventDate ?? ""}
              onChange={(e) => patch("eventDate", e.target.value || null)}
              className="stag-input"
            />
          </FieldLabel>
          <FieldLabel label="Venue">
            <input
              type="text"
              value={state.venueName}
              onChange={(e) => patch("venueName", e.target.value)}
              placeholder="e.g. Legion Hall, Branch 24"
              className="stag-input"
            />
          </FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Ticket price">
              <MoneyInput
                value={state.ticketPrice}
                onChange={(v) => patch("ticketPrice", v)}
              />
            </FieldLabel>
            <FieldLabel label="Tickets available">
              <input
                type="number"
                min={0}
                value={state.ticketsAvailable || ""}
                onChange={(e) => patch("ticketsAvailable", Number(e.target.value) || 0)}
                className="stag-input"
              />
            </FieldLabel>
          </div>
          <FieldLabel label="Tickets sold so far">
            <input
              type="number"
              min={0}
              max={state.ticketsAvailable}
              value={state.ticketsSold || ""}
              onChange={(e) => patch("ticketsSold", Number(e.target.value) || 0)}
              className="stag-input"
            />
          </FieldLabel>
          <FieldLabel label="Goal amount" helper="What you need to raise for the wedding">
            <MoneyInput
              value={state.goalAmount}
              onChange={(v) => patch("goalAmount", v)}
            />
          </FieldLabel>
        </div>
      </section>

      {/* SECTION 2 — Revenue + progress */}
      <section className="rounded-card border-[1.5px] border-rose bg-rose-pale p-6 lg:p-8">
        <header className="mb-6">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Section 2 · Revenue
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
            Running revenue total
          </h2>
        </header>

        {/* Big progress */}
        <div className="rounded-card bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-display text-4xl font-semibold text-charcoal md:text-5xl">
                {formatMoney(totals.totalRevenue)}
              </div>
              <div className="text-sm text-text-mid">
                raised of {formatMoney(state.goalAmount)} goal
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-semibold text-rose">
                {totals.progressPct}%
              </div>
            </div>
          </div>

          <div className="mt-4 h-3 w-full overflow-hidden rounded-pill bg-rose-pale">
            <div
              className="h-full bg-rose transition-all duration-300"
              style={{ width: `${totals.progressPct}%` }}
              role="progressbar"
              aria-valuenow={totals.progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <p className="mt-3 text-sm text-text-mid">
            {remaining > 0
              ? <>You need <strong className="text-charcoal">{formatMoney(remaining)}</strong> more to hit your goal</>
              : <span className="font-medium text-green">🎉 Goal reached! Anything above is buffer for the wedding.</span>}
          </p>
        </div>

        {/* Revenue line items */}
        <div className="mt-6 space-y-3">
          <RevenueRow
            label="Ticket sales"
            valueDisplay={formatMoney(totals.ticketRevenue)}
            helper={`${state.ticketsSold || 0} × ${formatMoney(state.ticketPrice)} (auto-calculated)`}
            readOnly
          />
          <RevenueRow label="50/50 Draw"             value={state.revenue.fiftyFifty}    onChange={(v) => patchRevenue("fiftyFifty", v)} />
          <RevenueRow label="Heads or Tails"          value={state.revenue.headsOrTails}  onChange={(v) => patchRevenue("headsOrTails", v)} />
          <RevenueRow label="Loonie Jar / Auctions"   value={state.revenue.loonieJar}     onChange={(v) => patchRevenue("loonieJar", v)} />
          <RevenueRow label="Prize Table / Chinese Auction" value={state.revenue.prizeTable} onChange={(v) => patchRevenue("prizeTable", v)} />
          <RevenueRow label="Bar revenue"             value={state.revenue.bar}           onChange={(v) => patchRevenue("bar", v)} />
          <RevenueRow label="Other games"             value={state.revenue.otherGames}    onChange={(v) => patchRevenue("otherGames", v)} />
        </div>
      </section>

      {/* SECTION 3 — Expenses + net profit */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-6">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Section 3 · Expenses
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
            Event expenses
          </h2>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <ExpenseRow label="Venue"            value={state.expenses.venue}         onChange={(v) => patchExpenses("venue", v)} />
          <ExpenseRow label="DJ / Music"       value={state.expenses.djMusic}       onChange={(v) => patchExpenses("djMusic", v)} />
          <ExpenseRow label="Prizes"           value={state.expenses.prizes}        onChange={(v) => patchExpenses("prizes", v)} />
          <ExpenseRow label="Decorations"      value={state.expenses.decorations}   onChange={(v) => patchExpenses("decorations", v)} />
          <ExpenseRow label="Printing"         value={state.expenses.printing}      onChange={(v) => patchExpenses("printing", v)} helper="tickets, signs" />
          <ExpenseRow label="Photo Booth"      value={state.expenses.photoBooth}    onChange={(v) => patchExpenses("photoBooth", v)} />
          <ExpenseRow label="Liquor licence"   value={state.expenses.liquorLicence} onChange={(v) => patchExpenses("liquorLicence", v)} />
          <ExpenseRow label="Food"             value={state.expenses.food}          onChange={(v) => patchExpenses("food", v)} />
          <ExpenseRow label="Other"            value={state.expenses.other}         onChange={(v) => patchExpenses("other", v)} />
        </div>

        {/* Net profit */}
        <div
          className={`mt-6 rounded-card border-[2px] p-5 ${
            totals.netProfit > 0
              ? "border-green bg-[#EAF2EC]"
              : totals.netProfit < 0
                ? "border-red-500 bg-red-50"
                : "border-border bg-bg-soft"
          }`}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">Revenue</div>
              <div className="mt-1 font-display text-xl font-semibold text-charcoal">{formatMoney(totals.totalRevenue)}</div>
            </div>
            <div>
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">− Expenses</div>
              <div className="mt-1 font-display text-xl font-semibold text-charcoal">{formatMoney(totals.totalExpenses)}</div>
            </div>
            <div>
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">Net profit</div>
              <div
                className={`mt-1 font-display text-3xl font-semibold ${
                  totals.netProfit > 0 ? "text-green" :
                  totals.netProfit < 0 ? "text-red-600" : "text-charcoal"
                }`}
              >
                {formatMoney(totals.netProfit)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Games checklist */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Section 4 · Games
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
            Games &amp; activities
          </h2>
          <p className="mt-2 text-sm text-text-mid">
            <span className="font-semibold text-charcoal">{gamesSelected}</span> of 10 selected
          </p>
        </header>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GAME_LABELS.map((g) => (
            <label
              key={g.key}
              className={`flex cursor-pointer items-center gap-3 rounded-card border-[1.5px] px-4 py-3 transition-colors ${
                state.games[g.key]
                  ? "border-rose bg-rose-pale"
                  : "border-border bg-white hover:border-rose"
              }`}
            >
              <input
                type="checkbox"
                checked={state.games[g.key]}
                onChange={(e) => patchGames(g.key, e.target.checked)}
                className="h-4 w-4 accent-rose"
              />
              <span className={`text-sm ${state.games[g.key] ? "font-semibold text-charcoal" : "text-text-mid"}`}>
                {g.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* SECTION 5 — Pic Booth CTA */}
      <section className="overflow-hidden rounded-card border-[2px] border-rose bg-white">
        <div className="flex items-center gap-2 bg-rose px-5 py-2">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white">
            Featured Partner
          </span>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-7">
          <div>
            <h2 className="font-display text-2xl font-semibold leading-tight text-charcoal md:text-3xl">
              Make your Stag &amp; Doe{" "}
              <em className="italic text-rose">unforgettable</em>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-mid">
              Photo booth rental from{" "}
              <strong className="font-semibold text-charcoal">${PIC_BOOTH_START_PRICE}</strong>{" "}
              — unlimited prints, open-air sailcloth backdrop, props included.
              Stag-and-Doe packages are popular: guests leave with photos that
              double as souvenirs and ticket-table memories.
            </p>
          </div>
          <a
            href="https://picbooth.ca/?utm_source=owv&utm_medium=planner-cta&utm_campaign=stag-doe"
            target="_blank"
            rel="noopener"
            className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            Get a quote from Pic Booth
            <span aria-hidden>→</span>
          </a>
        </div>
        <div className="border-t border-border-light bg-bg-soft px-6 py-3 md:px-7">
          <p className="text-[0.7rem] leading-relaxed text-text-mid">
            <strong className="font-semibold text-charcoal">Disclosure:</strong>{" "}
            Pic Booth is operated by the same team that runs Ontario Wedding
            Vendors.
          </p>
        </div>
      </section>

      {/* SECTION 6 — Ticket tracker */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              Section 6 · Ticket tracker
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
              Who&rsquo;s coming
            </h2>
            <p className="mt-1 text-sm text-text-mid">
              Optional — track ticket sales by name. Paid totals shown below.
            </p>
          </div>
          <button
            type="button"
            onClick={addTicketEntry}
            className="rounded-pill bg-rose px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-colors hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            + Add entry
          </button>
        </header>

        {state.ticketTracker.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-bg-soft p-8 text-center text-sm text-text-muted">
            No entries yet. Add a name to start tracking.
          </div>
        ) : (
          <ul className="space-y-2">
            {state.ticketTracker.map((entry) => (
              <li
                key={entry.id}
                className="grid grid-cols-[1fr_90px_auto_auto] items-center gap-3 rounded-card border border-border-light bg-bg-soft px-3 py-2"
              >
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => updateTicketEntry(entry.id, { name: e.target.value })}
                  placeholder="Guest name"
                  className="stag-input bg-white"
                />
                <input
                  type="number"
                  min={1}
                  value={entry.tickets}
                  onChange={(e) => updateTicketEntry(entry.id, { tickets: Math.max(1, Number(e.target.value) || 1) })}
                  className="stag-input bg-white text-center"
                  aria-label="Tickets"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={entry.paid}
                    onChange={(e) => updateTicketEntry(entry.id, { paid: e.target.checked })}
                    className="h-4 w-4 accent-rose"
                  />
                  <span className={entry.paid ? "font-semibold text-green" : "text-text-mid"}>
                    {entry.paid ? "Paid" : "Unpaid"}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => removeTicketEntry(entry.id)}
                  aria-label={`Remove ${entry.name || "entry"}`}
                  className="rounded-pill p-1.5 text-text-muted transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
                >
                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </svg>
                </button>
              </li>
            ))}
            <li className="grid grid-cols-[1fr_90px_auto_auto] items-center gap-3 px-3 pt-3 text-sm font-semibold text-charcoal">
              <span>Paid total</span>
              <span className="text-center">{trackerTotalTickets}</span>
              <span className="whitespace-nowrap">{formatMoney(trackerTotalRevenue)}</span>
              <span></span>
            </li>
          </ul>
        )}
      </section>

      <style>{`
        .stag-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1.5px solid var(--color-border);
          border-radius: 10px;
          font-size: 0.875rem;
          color: var(--color-text);
          background: white;
        }
        .stag-input:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px white, 0 0 0 4px var(--color-rose);
        }
      `}</style>
    </div>
  );
}

const GAME_LABELS: { key: keyof StagAndDoeState["games"]; label: string }[] = [
  { key: "headsOrTails",      label: "Heads or Tails" },
  { key: "fiftyFiftyDraw",    label: "50/50 Draw" },
  { key: "loonieJar",         label: "Loonie Jar" },
  { key: "chineseAuction",    label: "Chinese Auction / Prize Table" },
  { key: "triviaGame",        label: "Trivia Game" },
  { key: "photoBooth",        label: "Photo Booth" },
  { key: "cornHole",          label: "Corn Hole / Lawn Games" },
  { key: "limboDance",        label: "Limbo / Dance Contest" },
  { key: "auctionItems",      label: "Auction Items" },
  { key: "signatureCocktail", label: "Signature Cocktail" },
];

function FieldLabel({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {helper && <span className="mt-1 block text-[0.7rem] text-text-muted">{helper}</span>}
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted"
      >
        $
      </span>
      <input
        type="number"
        min={0}
        step={1}
        value={value || ""}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="stag-input pl-7"
      />
    </div>
  );
}

function RevenueRow({
  label,
  value,
  onChange,
  helper,
  valueDisplay,
  readOnly,
}: {
  label: string;
  value?: number;
  onChange?: (v: number) => void;
  helper?: string;
  valueDisplay?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card bg-white px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-charcoal">{label}</div>
        {helper && <div className="text-[0.7rem] text-text-muted">{helper}</div>}
      </div>
      {readOnly ? (
        <span className="w-32 rounded-pill bg-rose-pale px-3 py-1.5 text-right text-sm font-semibold text-charcoal">
          {valueDisplay}
        </span>
      ) : (
        <div className="relative w-32">
          <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">$</span>
          <input
            type="number"
            min={0}
            step={1}
            value={value || ""}
            onChange={(e) => onChange?.(Math.max(0, Number(e.target.value) || 0))}
            className="stag-input pl-6 text-right"
          />
        </div>
      )}
    </div>
  );
}

function ExpenseRow({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  helper?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border-light bg-bg-soft px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-charcoal">{label}</div>
        {helper && <div className="text-[0.7rem] text-text-muted">{helper}</div>}
      </div>
      <div className="relative w-32">
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">$</span>
        <input
          type="number"
          min={0}
          step={1}
          value={value || ""}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="stag-input pl-6 text-right"
        />
      </div>
    </div>
  );
}
