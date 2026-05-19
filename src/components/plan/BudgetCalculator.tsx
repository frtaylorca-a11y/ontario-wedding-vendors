"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BUDGET_CATEGORIES,
  PLANNER_REGIONS,
  calculateBudgetWithState,
  defaultBudgetCategoryStates,
  type BudgetCategoryStates,
  type BudgetCategoryToggle,
  type BudgetRow,
  type VendorCategoryKey,
} from "@/lib/plan-state";

/* 20 brand-aligned colors — order maps to BUDGET_CATEGORIES default order;
 * the row's color stays with its key as items reorder. */
const SEGMENT_COLORS_BY_KEY: Record<VendorCategoryKey, string> = {
  venue_rental:    "#B96476",
  catering_bar:    "#C9A96E",
  photo_video:     "#8C7B6E",
  music_dj:        "#D4899A",
  flowers_decor:   "#4A7C59",
  cake:            "#E8B5C0",
  hair_makeup:     "#A5536A",
  officiant:       "#B0A299",
  stationery:      "#EFE0C0",
  transportation:  "#7CA0BC",
  attire_bride:    "#F7EEF1",
  attire_groom:    "#6FA084",
  lighting_sound:  "#547C9C",
  photo_booth:     "#D97706",
  wedding_rings:   "#9C5266",
  favors_gifts:    "#E89B6A",
  accommodation:   "#8FB098",
  rentals:         "#B89B5E",
  wedding_planner: "#5F4F45",
  miscellaneous:   "#6B6B6B",
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  totalBudget: number;
  guestCount: number;
  region: string;
  weddingDate: string | null;
  budgetCategoryStates?: BudgetCategoryStates;
  onChange: (next: {
    totalBudget?: number;
    guestCount?: number;
    region?: string;
    weddingDate?: string | null;
    budgetCategoryStates?: BudgetCategoryStates;
  }) => void;
};

export function BudgetCalculator({
  totalBudget,
  guestCount,
  region,
  weddingDate,
  budgetCategoryStates,
  onChange,
}: Props) {
  const states = budgetCategoryStates ?? defaultBudgetCategoryStates();
  const rows = useMemo(() => calculateBudgetWithState(totalBudget, states), [totalBudget, states]);

  const enabledRows = rows.filter((r) => r.enabled);
  const excludedRows = rows.filter((r) => !r.enabled);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateToggle(key: VendorCategoryKey, patch: Partial<BudgetCategoryToggle>) {
    const next: BudgetCategoryStates = {
      ...states,
      toggles: {
        ...states.toggles,
        [key]: { ...states.toggles[key], ...patch },
      },
    };
    onChange({ budgetCategoryStates: next });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const enabledKeys = enabledRows.map((r) => r.key);
    const oldIdx = enabledKeys.indexOf(active.id as VendorCategoryKey);
    const newIdx = enabledKeys.indexOf(over.id as VendorCategoryKey);
    if (oldIdx === -1 || newIdx === -1) return;

    const reorderedEnabled = arrayMove(enabledKeys, oldIdx, newIdx);
    const excludedKeys = excludedRows.map((r) => r.key);
    /* Final order: enabled (user-reordered) first, then excluded (preserved) */
    const nextOrder: VendorCategoryKey[] = [...reorderedEnabled, ...excludedKeys];

    onChange({ budgetCategoryStates: { ...states, order: nextOrder } });
  }

  return (
    <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
      <header className="mb-6">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          Step 1 · Budget
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
          Your wedding budget
        </h2>
        <p className="mt-2 text-sm text-text-mid">
          Drag categories to set priority. Toggle off anything you&rsquo;re not
          paying for. Click the pencil to lock a category at a specific amount.
        </p>
      </header>

      {/* Inputs row */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Total budget slider */}
        <div className="lg:col-span-2">
          <label className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
            Total budget
          </label>
          <div className="mt-1 font-display text-3xl font-semibold text-charcoal">
            {formatMoney(totalBudget)}
          </div>
          <input
            type="range"
            min={5000}
            max={150000}
            step={1000}
            value={totalBudget}
            onChange={(e) => onChange({ totalBudget: Number(e.target.value) })}
            className="mt-2 w-full accent-rose"
            aria-label="Total wedding budget"
          />
          <div className="mt-1 flex justify-between text-[0.65rem] text-text-muted">
            <span>$5K</span>
            <span>$150K</span>
          </div>
        </div>

        {/* Guest count slider */}
        <div>
          <label className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
            Guest count
          </label>
          <div className="mt-1 font-display text-3xl font-semibold text-charcoal">
            {guestCount}
          </div>
          <input
            type="range"
            min={10}
            max={300}
            step={10}
            value={guestCount}
            onChange={(e) => onChange({ guestCount: Number(e.target.value) })}
            className="mt-2 w-full accent-rose"
            aria-label="Number of guests"
          />
          <div className="mt-1 flex justify-between text-[0.65rem] text-text-muted">
            <span>10</span>
            <span>300</span>
          </div>
        </div>

        {/* Region + date stacked */}
        <div className="space-y-4">
          <div>
            <label className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => onChange({ region: e.target.value })}
              className="mt-1 w-full rounded-pill border border-border bg-white px-3 py-2 text-sm font-medium text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              {PLANNER_REGIONS.map((r) => (
                <option key={r.slug} value={r.slug}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
              Wedding date
            </label>
            <input
              type="date"
              value={weddingDate ?? ""}
              onChange={(e) => onChange({ weddingDate: e.target.value || null })}
              className="mt-1 w-full rounded-pill border border-border bg-white px-3 py-2 text-sm font-medium text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            />
          </div>
        </div>
      </div>

      {/* Donut + interactive breakdown */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
        {/* Donut — enabled categories only */}
        <div className="relative flex items-center justify-center">
          <div className="h-[280px] w-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enabledRows.filter((r) => r.amount > 0)}
                  dataKey="amount"
                  nameKey="label"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  stroke="white"
                  strokeWidth={2}
                  label={false}
                  labelLine={false}
                >
                  {enabledRows.filter((r) => r.amount > 0).map((r) => (
                    <Cell key={r.key} fill={SEGMENT_COLORS_BY_KEY[r.key]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    formatMoney(Number(value)),
                    String(name),
                  ]}
                  contentStyle={{
                    background: "white",
                    border: "1.5px solid #E8E4E0",
                    borderRadius: 12,
                    fontSize: "0.85rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[0.65rem] uppercase tracking-[0.12em] text-text-muted">
              Total
            </div>
            <div className="font-display text-2xl font-semibold text-charcoal">
              {formatMoney(totalBudget)}
            </div>
            <div className="text-xs text-text-mid">
              ~{formatMoney(Math.round(totalBudget / Math.max(guestCount, 1)))} / guest
            </div>
          </div>
        </div>

        {/* Sortable list of enabled categories */}
        <div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={enabledRows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {enabledRows.map((row) => (
                  <SortableRow
                    key={row.key}
                    row={row}
                    onToggle={(enabled) => updateToggle(row.key, { enabled })}
                    onLock={(amount) => updateToggle(row.key, { lockedAmount: amount })}
                    onUnlock={() => updateToggle(row.key, { lockedAmount: null })}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {/* Excluded — collapsed "Not including" section */}
          {excludedRows.length > 0 && (
            <div className="mt-5 rounded-card border border-dashed border-border bg-bg-soft p-4">
              <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-text-muted">
                Not including
              </div>
              <ul className="mt-2 space-y-1">
                {excludedRows.map((row) => (
                  <li key={row.key} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] text-text-muted line-through">
                      {row.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateToggle(row.key, { enabled: true })}
                      className="text-[10px] font-semibold text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
                    >
                      + Add back
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-[0.7rem] leading-relaxed text-text-muted">
            Drag rows to set priority — higher categories get vendor suggestions
            first in Step 3. Toggle categories off if you&rsquo;re skipping them.
            Lock any amount to keep it fixed while you adjust the total.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Sortable row ────────────────────────────────────────────────────── */

function SortableRow({
  row,
  onToggle,
  onLock,
  onUnlock,
}: {
  row: BudgetRow;
  onToggle: (enabled: boolean) => void;
  onLock: (amount: number) => void;
  onUnlock: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.key });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(row.amount));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  } as React.CSSProperties;

  function commitDraft() {
    const parsed = Number(draft.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      onLock(Math.round(parsed));
    }
    setEditing(false);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-card border border-border-light bg-bg-soft px-3 py-2"
    >
      {/* Drag handle — 6-dot grid, appears stronger on hover */}
      <button
        type="button"
        aria-label={`Reorder ${row.label}`}
        {...attributes}
        {...listeners}
        className="flex h-6 w-4 flex-shrink-0 cursor-grab items-center justify-center text-text-muted opacity-40 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm group-hover:opacity-80 active:cursor-grabbing"
      >
        <svg
          aria-hidden
          viewBox="0 0 12 16"
          className="h-4 w-3 fill-current"
        >
          <circle cx="3" cy="3" r="1.2" />
          <circle cx="9" cy="3" r="1.2" />
          <circle cx="3" cy="8" r="1.2" />
          <circle cx="9" cy="8" r="1.2" />
          <circle cx="3" cy="13" r="1.2" />
          <circle cx="9" cy="13" r="1.2" />
        </svg>
      </button>

      {/* Toggle — rose when ON, grey when OFF */}
      <button
        type="button"
        role="switch"
        aria-checked={row.enabled}
        aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.label}`}
        onClick={() => onToggle(!row.enabled)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 ${
          row.enabled ? "bg-rose" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            row.enabled ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>

      {/* Color swatch */}
      <span
        className="h-3 w-3 flex-shrink-0 rounded-sm"
        style={{ background: SEGMENT_COLORS_BY_KEY[row.key] }}
        aria-hidden
      />

      {/* Label + below-floor warning */}
      <div className="flex-1 min-w-0">
        <span className="block truncate text-sm text-charcoal">{row.label}</span>
        {row.belowFloor && (
          <span className="block text-[0.65rem] leading-tight text-amber-700">
            Typical minimum for this category is {formatMoney(row.minFloor)}
          </span>
        )}
      </div>

      {/* Amount — view / edit / locked */}
      {editing ? (
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDraft();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-24 rounded-pill border border-rose bg-white px-2 py-1 text-right text-sm font-medium text-charcoal focus-visible:outline-none"
          aria-label={`Custom amount for ${row.label}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(String(row.amount));
            setEditing(true);
          }}
          className="inline-flex items-center gap-1 rounded-pill px-2 py-1 text-sm font-medium text-charcoal hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          aria-label={`Edit amount for ${row.label}`}
        >
          {row.locked && (
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-3 w-3 fill-none stroke-rose"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          )}
          <span>{formatMoney(row.amount)}</span>
          {!row.locked && (
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-3 w-3 fill-none stroke-text-muted opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          )}
        </button>
      )}

      {/* Unlock button — only when locked */}
      {row.locked && !editing && (
        <button
          type="button"
          onClick={onUnlock}
          className="text-[0.65rem] font-semibold text-rose hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm"
          aria-label={`Unlock ${row.label}`}
        >
          unlock
        </button>
      )}

      {/* Percent pill */}
      <span className="rounded-pill bg-white px-2 py-0.5 text-[0.65rem] font-bold text-text-mid">
        {(row.pct * 100).toFixed(0)}%
      </span>
    </li>
  );
}
