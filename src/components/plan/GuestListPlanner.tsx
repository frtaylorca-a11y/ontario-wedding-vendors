"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dietary, GuestEntry, Rsvp } from "@/lib/plan-state";

const LOCAL_STORAGE_KEY = "owv_guests_state_v1";
const SAVE_DEBOUNCE_MS = 800;

const RSVP_OPTIONS: { value: Rsvp; label: string }[] = [
  { value: "invited",   label: "Invited" },
  { value: "confirmed", label: "Confirmed" },
  { value: "declined",  label: "Declined" },
  { value: "maybe",     label: "Maybe" },
];

const DIETARY_OPTIONS: { value: Dietary; label: string }[] = [
  { value: "none",        label: "None" },
  { value: "vegetarian",  label: "Vegetarian" },
  { value: "vegan",       label: "Vegan" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "halal",       label: "Halal" },
  { value: "kosher",      label: "Kosher" },
  { value: "other",       label: "Other" },
];

function newId(): string {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyGuest(): GuestEntry {
  return {
    id: newId(),
    firstName: "",
    lastName: "",
    rsvp: "invited",
    dietary: "none",
    tableNumber: null,
    plusOne: false,
  };
}

type Props = {
  sessionId: string;
  initial: GuestEntry[];
};

export function GuestListPlanner({ sessionId, initial }: Props) {
  const [guests, setGuests] = useState<GuestEntry[]>(initial);
  const [bulk, setBulk] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  /* Hydrate from localStorage on first render */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw && initial.length === 0) {
        const local = JSON.parse(raw) as GuestEntry[];
        if (Array.isArray(local)) setGuests(local);
      }
    } catch { /* ignore */ }
  }, [initial.length]);

  /* Persist on every change */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(guests));
    } catch { /* ignore */ }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/plan/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestList: guests }),
        });
        setSaveStatus(res.ok ? "saved" : "error");
      } catch {
        setSaveStatus("error");
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [guests]);

  const summary = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => g.rsvp === "confirmed").length;
    const declined  = guests.filter((g) => g.rsvp === "declined").length;
    const awaiting  = guests.filter((g) => g.rsvp === "invited" || g.rsvp === "maybe").length;
    const dietary   = guests.filter((g) => g.dietary !== "none").length;
    const plusOnes  = guests.filter((g) => g.plusOne).length;
    return { total, confirmed, declined, awaiting, dietary, plusOnes };
  }, [guests]);

  function addGuest() {
    setGuests((g) => [...g, emptyGuest()]);
  }

  function updateGuest(id: string, patch: Partial<GuestEntry>) {
    setGuests((arr) => arr.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function removeGuest(id: string) {
    setGuests((arr) => arr.filter((g) => g.id !== id));
  }

  function bulkAdd() {
    const lines = bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const newGuests: GuestEntry[] = lines.map((line) => {
      const parts = line.split(/\s+/);
      const [firstName = "", ...rest] = parts;
      return { ...emptyGuest(), firstName, lastName: rest.join(" ") };
    });
    setGuests((g) => [...g, ...newGuests]);
    setBulk("");
  }

  function exportCsv() {
    const rows: string[][] = [[
      "First Name", "Last Name", "RSVP", "Dietary", "Dietary Note",
      "Table", "Plus One", "Plus One Name", "Notes",
    ]];
    for (const g of guests) {
      rows.push([
        g.firstName, g.lastName, g.rsvp, g.dietary, g.dietaryNote ?? "",
        g.tableNumber != null ? String(g.tableNumber) : "",
        g.plusOne ? "Yes" : "No",
        g.plusOneName ?? "",
        g.notes ?? "",
      ]);
    }
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const needsQuoting = /[",\n]/.test(cell);
            const escaped = cell.replace(/"/g, '""');
            return needsQuoting ? `"${escaped}"` : escaped;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wedding-guests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copyForCaterer() {
    /* Concise text summary the caterer can paste straight into an email */
    const lines: string[] = [];
    lines.push(`Confirmed: ${summary.confirmed}`);
    lines.push(`Plus ones: ${summary.plusOnes}`);
    lines.push(`Total head count: ${summary.confirmed + summary.plusOnes}`);
    lines.push("");
    lines.push("Dietary needs:");
    const buckets = new Map<string, string[]>();
    for (const g of guests) {
      if (g.dietary === "none") continue;
      const key = g.dietary === "other" && g.dietaryNote ? `Other (${g.dietaryNote})` : g.dietary;
      const list = buckets.get(key) ?? [];
      list.push(`${g.firstName} ${g.lastName}`.trim());
      buckets.set(key, list);
    }
    if (buckets.size === 0) lines.push("  (none on file)");
    for (const [need, names] of buckets) {
      lines.push(`  • ${need}: ${names.length} (${names.join(", ")})`);
    }
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Caterer summary copied to clipboard.");
    } catch {
      alert(text);
    }
  }

  return (
    <div className="space-y-6">
      {/* Save status */}
      <div className="flex items-center justify-between rounded-pill bg-white px-4 py-2 text-xs text-text-mid shadow-[var(--shadow-card)]">
        <span>
          Guest list saved automatically · session{" "}
          <code className="rounded bg-bg-soft px-1.5 py-0.5 text-[0.65rem]">{sessionId.slice(0, 8)}…</code>
        </span>
        <span
          className={
            saveStatus === "saving" ? "text-text-muted" :
            saveStatus === "saved"  ? "text-green" :
            saveStatus === "error"  ? "text-red-600" : "text-text-muted"
          }
        >
          {saveStatus === "saving" && "● Saving…"}
          {saveStatus === "saved"  && "✓ All changes saved"}
          {saveStatus === "error"  && "⚠ Save failed (local copy kept)"}
          {saveStatus === "idle"   && "Ready"}
        </span>
      </div>

      {/* Summary bar */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-5 lg:p-6">
        <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-5">
          <Stat label="Total"      value={summary.total}     />
          <Stat label="Confirmed"  value={summary.confirmed} accent="text-emerald-600" />
          <Stat label="Declined"   value={summary.declined}  accent="text-red-600" />
          <Stat label="Awaiting"   value={summary.awaiting}  accent="text-amber-600" />
          <Stat label="Dietary"    value={summary.dietary}   />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border-light pt-4">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-pill border border-border bg-white px-4 py-1.5 text-xs font-bold text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={copyForCaterer}
            className="rounded-pill border border-border bg-white px-4 py-1.5 text-xs font-bold text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            Copy for caterer
          </button>
        </div>
      </section>

      {/* Bulk add */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-3">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">Bulk add</div>
          <h2 className="mt-2 font-display text-xl font-semibold text-charcoal">
            Paste names, one per line
          </h2>
        </header>
        <textarea
          rows={5}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={"Alice Carter\nBob Smith\nCharlie Wong"}
          className="w-full rounded-card border border-border bg-white px-4 py-3 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
        />
        <button
          type="button"
          onClick={bulkAdd}
          disabled={!bulk.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 disabled:opacity-50"
        >
          Add {bulk.split(/\r?\n/).filter((l) => l.trim()).length || 0} guest{bulk.split(/\r?\n/).filter((l) => l.trim()).length === 1 ? "" : "s"}
          <span aria-hidden>→</span>
        </button>
      </section>

      {/* Guest rows */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-charcoal">
            Guests <span className="text-base text-text-muted">({guests.length})</span>
          </h2>
          <button
            type="button"
            onClick={addGuest}
            className="rounded-pill border border-rose bg-white px-4 py-1.5 text-xs font-bold text-rose transition-colors hover:bg-rose hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            + Add guest
          </button>
        </header>

        {guests.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-bg-soft p-6 text-center text-sm text-text-muted">
            No guests yet. Use bulk add above, or click <strong className="font-semibold">Add guest</strong> for one at a time.
          </p>
        ) : (
          <ul className="space-y-3">
            {guests.map((g) => (
              <li key={g.id} className="rounded-card border border-border-light bg-bg-soft p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                  <input
                    type="text"
                    placeholder="First name"
                    value={g.firstName}
                    onChange={(e) => updateGuest(g.id, { firstName: e.target.value })}
                    className="rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={g.lastName}
                    onChange={(e) => updateGuest(g.id, { lastName: e.target.value })}
                    className="rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeGuest(g.id)}
                    aria-label="Remove guest"
                    title="Remove guest"
                    className="justify-self-end rounded-full px-2 py-1 text-xs font-medium text-text-muted hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <select
                    value={g.rsvp}
                    onChange={(e) => updateGuest(g.id, { rsvp: e.target.value as Rsvp })}
                    className="rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  >
                    {RSVP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <select
                    value={g.dietary}
                    onChange={(e) => updateGuest(g.id, { dietary: e.target.value as Dietary })}
                    className="rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  >
                    {DIETARY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Table #"
                    min={1}
                    value={g.tableNumber ?? ""}
                    onChange={(e) => updateGuest(g.id, {
                      tableNumber: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                    })}
                    className="rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  />
                  <label className="inline-flex items-center gap-2 px-2 py-1.5 text-sm text-charcoal">
                    <input
                      type="checkbox"
                      checked={g.plusOne}
                      onChange={(e) => updateGuest(g.id, { plusOne: e.target.checked })}
                      className="h-4 w-4 accent-rose"
                    />
                    Plus one
                  </label>
                </div>
                {g.dietary === "other" && (
                  <input
                    type="text"
                    placeholder="Specify dietary note"
                    value={g.dietaryNote ?? ""}
                    onChange={(e) => updateGuest(g.id, { dietaryNote: e.target.value })}
                    className="mt-2 w-full rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  />
                )}
                {g.plusOne && (
                  <input
                    type="text"
                    placeholder="Plus-one name"
                    value={g.plusOneName ?? ""}
                    onChange={(e) => updateGuest(g.id, { plusOneName: e.target.value })}
                    className="mt-2 w-full rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                  />
                )}
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={g.notes ?? ""}
                  onChange={(e) => updateGuest(g.id, { notes: e.target.value })}
                  className="mt-2 w-full rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <div className={`font-display text-2xl font-semibold ${accent ?? "text-charcoal"}`}>
        {value}
      </div>
      <div className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-text-muted">
        {label}
      </div>
    </div>
  );
}
