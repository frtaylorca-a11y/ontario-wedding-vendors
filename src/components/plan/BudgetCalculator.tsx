"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { BudgetCategoryIcon } from "./BudgetCategoryIcon";
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
  BUDGET_TO_VENDOR_SLOTS,
  CATERING_PER_GUEST,
  CATERING_TYPE_LABELS,
  PLANNER_REGIONS,
  PROTECTED_KEY,
  bookedBudgetCategories,
  calculateBudgetWithUnallocated,
  defaultBudgetCategoryStates,
  distributeUnallocated,
  getBudgetHealth,
  getVenueBundleType,
  getVenuePricingRange,
  normalizeCateringType,
  type BookedVendor,
  type BudgetCategoryStates,
  type BudgetCategoryToggle,
  type BudgetRow,
  type VendorCategoryKey,
} from "@/lib/plan-state";


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
  venueName?: string | null;
  venueType?: string | null;
  venueCapacityMax?: number | null;
  venueCatering?: string | null;
  budgetCategoryStates?: BudgetCategoryStates;
  bookedVendors?: Record<string, BookedVendor>;
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
  venueName,
  venueType,
  venueCapacityMax,
  venueCatering,
  budgetCategoryStates,
  bookedVendors,
  onChange,
}: Props) {
  const states = budgetCategoryStates ?? defaultBudgetCategoryStates();
  const { rows, unallocated } = useMemo(
    () => calculateBudgetWithUnallocated(totalBudget, states),
    [totalBudget, states],
  );

  function handleDistributeEvenly() {
    onChange({ budgetCategoryStates: distributeUnallocated(states, totalBudget) });
  }
  const bookedSet = useMemo(
    () => bookedBudgetCategories(bookedVendors ?? {}),
    [bookedVendors],
  );
  const bookedNamesByBudgetKey = useMemo(() => {
    const out: Partial<Record<VendorCategoryKey, string[]>> = {};
    for (const [bcKey, vendorCats] of Object.entries(BUDGET_TO_VENDOR_SLOTS) as [VendorCategoryKey, string[]][]) {
      const names = vendorCats
        .map((vc) => bookedVendors?.[vc]?.name)
        .filter((n): n is string => Boolean(n));
      if (names.length > 0) out[bcKey] = names;
    }
    return out;
  }, [bookedVendors]);

  const bundleType = getVenueBundleType(venueCatering);
  const venueBundleActive = bundleType === "in-house";

  /* When bundleType === "in-house", the venue_rental row's display label +
   * amount + pct absorb catering_bar's, and catering_bar renders greyed-out
   * with a "Catering included" note. Keys remain stable so user state +
   * drag logic still work. */
  const cateringRow = rows.find((r) => r.key === "catering_bar");
  const transformRow = (r: BudgetRow): BudgetRow & { greyedOut?: boolean; bundleNote?: string } => {
    if (!venueBundleActive) return r;
    if (r.key === "venue_rental") {
      const cateringAmount = cateringRow?.amount ?? 0;
      const cateringPct = cateringRow?.pct ?? 0;
      return {
        ...r,
        label: `Venue + Catering · ${venueName ?? "your venue"}`,
        amount: r.amount + cateringAmount,
        pct: r.pct + cateringPct,
      };
    }
    if (r.key === "catering_bar") {
      return { ...r, greyedOut: true, bundleNote: "Catering included in your venue package" };
    }
    return r;
  };

  const activeRows = rows.filter((r) => r.enabled).map(transformRow);
  const inactiveRows = rows.filter((r) => !r.enabled);

  const health = getBudgetHealth(totalBudget, guestCount, region);
  const healthBadge =
    health.status === "comfortable"
      ? { label: "🟢 Comfortable", className: "bg-emerald-100 text-emerald-700" }
      : health.status === "tight"
        ? { label: "🟡 Tight", className: "bg-amber-100 text-amber-700" }
        : { label: "🔴 Very tight", className: "bg-red-100 text-red-700" };

  const [activeId, setActiveId] = useState<VendorCategoryKey | null>(null);

  const venueRange = getVenuePricingRange(venueType, region);
  const cateringType = normalizeCateringType(venueCatering);
  const cateringRange = cateringType ? CATERING_PER_GUEST[cateringType] : null;
  const capacityWarning =
    venueCapacityMax != null && guestCount > venueCapacityMax
      ? `${venueName ?? "Your venue"} fits up to ${venueCapacityMax} guests — you have ${guestCount}.`
      : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Returns false when the user cancels the booking-removal confirm. */
  function confirmDisableIfBooked(key: VendorCategoryKey): boolean {
    if (!bookedSet.has(key)) return true;
    const names = bookedNamesByBudgetKey[key] ?? [];
    const cat = BUDGET_CATEGORIES.find((c) => c.key === key)?.label ?? key;
    const namesStr = names.join(" and ");
    return window.confirm(
      `Removing ${cat} will unbook ${namesStr}. Continue?`,
    );
  }

  function updateToggle(key: VendorCategoryKey, patch: Partial<BudgetCategoryToggle>) {
    if (patch.enabled === false && !confirmDisableIfBooked(key)) return;
    const next: BudgetCategoryStates = {
      ...states,
      toggles: {
        ...states.toggles,
        [key]: { ...states.toggles[key], ...patch },
      },
    };
    onChange({ budgetCategoryStates: next });
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as VendorCategoryKey);
  }

  /** Reorder within the active list only — add/remove between active and
   *  inactive happens via the per-row +/− buttons, not by dragging. */
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeKeys = activeRows.map((r) => r.key);
    const oldIdx = activeKeys.indexOf(active.id as VendorCategoryKey);
    const newIdx = activeKeys.indexOf(over.id as VendorCategoryKey);
    if (oldIdx === -1 || newIdx === -1) return;
    const reorderedActive = arrayMove(activeKeys, oldIdx, newIdx);
    const inactiveKeys = inactiveRows.map((r) => r.key);
    onChange({
      budgetCategoryStates: {
        ...states,
        order: [...reorderedActive, ...inactiveKeys],
      },
    });
  }

  /** Toggle a row off (− button on active) or on (+ button on inactive). */
  function toggleRow(key: VendorCategoryKey, nextEnabled: boolean) {
    if (!nextEnabled && !confirmDisableIfBooked(key)) return;
    onChange({
      budgetCategoryStates: {
        ...states,
        toggles: {
          ...states.toggles,
          [key]: { ...states.toggles[key], enabled: nextEnabled },
        },
      },
    });
  }

  const activeRowSet = useMemo(() => new Map(activeRows.map((r) => [r.key, r])), [activeRows]);
  const draggingRow = activeId ? activeRowSet.get(activeId) ?? inactiveRows.find((r) => r.key === activeId) : null;

  return (
    <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Step 1 · Budget
          </div>
          {venueName && venueRange && (
            <div className="inline-flex items-center gap-1.5 rounded-pill bg-rose-pale px-3 py-1 text-[0.7rem] font-bold text-rose">
              <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.39 4.84 5.34.78-3.87 3.77.91 5.32L12 14.27 7.23 16.7l.91-5.32L4.27 7.62l5.34-.78L12 2z" />
              </svg>
              Budget calibrated for {venueName}
            </div>
          )}
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
          Your wedding budget
        </h2>
        <p className="mt-2 text-sm text-text-mid">
          The eight essentials are active by default. Tap{" "}
          <span className="font-bold text-rose">+</span> on any greyed row to
          add it, or <span className="font-bold text-text-mid">−</span> on an
          active row to move it to the bottom.
        </p>
      </header>

      {capacityWarning && (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="font-semibold">Capacity check:</strong>{" "}
          {capacityWarning}
        </div>
      )}

      {/* Budget reality check — RBC / WeddingWire / WealthNorth envelope */}
      <div className="mb-6 rounded-card border border-border bg-bg-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-mid">
            Ontario couples with{" "}
            <strong className="font-semibold text-charcoal">{guestCount} guests</strong>{" "}
            typically spend{" "}
            <strong className="font-semibold text-charcoal">
              {formatMoney(health.minTotal)}–{formatMoney(health.maxTotal)}
            </strong>{" "}
            (median {formatMoney(health.midTotal)} · {health.regionLabel}).
          </p>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-pill px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] ${healthBadge.className}`}
          >
            {healthBadge.label}
          </span>
        </div>
        {health.status === "very_tight" && (
          <p className="mt-3 rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Your budget of <strong className="font-semibold">{formatMoney(totalBudget)}</strong>{" "}
            may be tight for {guestCount} guests in {health.regionLabel}. Ontario
            couples typically spend {formatMoney(health.midTotal)} for this guest count.
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Donut */}
          <div className="relative flex items-center justify-center">
            <div className="h-[280px] w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {(() => {
                    const segments: { key: string; label: string; amount: number; fill: string }[] = [
                      ...activeRows
                        .filter((r) => r.amount > 0)
                        .map((r) => ({
                          key:    r.key,
                          label:  r.label,
                          amount: r.amount,
                          fill:   SEGMENT_COLORS_BY_KEY[r.key],
                        })),
                    ];
                    if (unallocated > 0) {
                      segments.push({
                        key:    "__unallocated",
                        label:  "Unallocated · Available buffer",
                        amount: unallocated,
                        fill:   "#D1D5DB",
                      });
                    }
                    return (
                      <Pie
                        data={segments}
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
                        {segments.map((s) => (
                          <Cell key={s.key} fill={s.fill} />
                        ))}
                      </Pie>
                    );
                  })()}
                  <Tooltip
                    formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
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
              <div className="text-[0.65rem] uppercase tracking-[0.12em] text-text-muted">Total</div>
              <div className="font-display text-2xl font-semibold text-charcoal">{formatMoney(totalBudget)}</div>
              <div className="text-xs text-text-mid">
                ~{formatMoney(Math.round(totalBudget / Math.max(guestCount, 1)))} / guest
              </div>
            </div>
          </div>

          <div>
            {/* Active rows — sortable so the user can reorder priority */}
            <SortableContext items={activeRows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {activeRows.map((row) => (
                  <SortableRow
                    key={row.key}
                    row={row}
                    booked={bookedSet.has(row.key)}
                    perHeadHint={
                      row.key === "catering_bar" && row.locked && cateringType && guestCount > 0 && !venueBundleActive
                        ? `~${formatMoney(Math.round(row.amount / guestCount))}/guest · ${CATERING_TYPE_LABELS[cateringType]} · based on ${venueName ?? "your venue"}`
                        : null
                    }
                    cateringRangeHint={
                      row.key === "catering_bar" && cateringRange && !venueBundleActive
                        ? `Typically $${cateringRange.low}–$${cateringRange.high}/guest for ${CATERING_TYPE_LABELS[cateringType!]} in ${region}`
                        : null
                    }
                    greyedOut={row.greyedOut}
                    bundleNote={row.bundleNote}
                    onLock={(amount) => updateToggle(row.key, { lockedAmount: amount })}
                    onUnlock={() => updateToggle(row.key, { lockedAmount: null })}
                    onRemove={() => toggleRow(row.key, false)}
                  />
                ))}
              </ul>
            </SortableContext>

            {/* Inactive rows — compact, click + to add */}
            {inactiveRows.length > 0 && (
              <ul className="mt-2 space-y-1">
                {inactiveRows.map((row) => {
                  const togglePctForRow = states.toggles[row.key]?.pct
                    ?? BUDGET_CATEGORIES.find((c) => c.key === row.key)?.pct
                    ?? 0;
                  const estimatedAmount = Math.round(togglePctForRow * totalBudget);
                  return (
                    <InactiveRow
                      key={row.key}
                      row={row}
                      estimatedAmount={estimatedAmount}
                      onAdd={() => toggleRow(row.key, true)}
                    />
                  );
                })}
              </ul>
            )}

            {/* Unallocated — single grey line at the bottom */}
            {unallocated > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-light pt-3 text-[0.75rem] text-text-muted">
                <span>
                  <strong className="font-semibold text-charcoal">{formatMoney(unallocated)}</strong>{" "}
                  unallocated — add categories above or keep as a buffer.
                </span>
                <button
                  type="button"
                  onClick={handleDistributeEvenly}
                  className="rounded-pill border border-border bg-white px-2.5 py-0.5 text-[0.7rem] font-bold text-rose transition-colors hover:border-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                >
                  Distribute evenly
                </button>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {draggingRow ? <DragPreview row={draggingRow} /> : null}
        </DragOverlay>
      </DndContext>

      <p className="mt-6 border-t border-border-light pt-4 text-[0.65rem] leading-relaxed text-text-muted">
        Estimates based on RBC My Money Matters, WeddingWire Canada Global Wedding
        Report, and WealthNorth Ontario regional data.
      </p>
    </section>
  );
}

/* ─── Drag overlay preview ───────────────────────────────────────────── */

function DragPreview({ row }: { row: BudgetRow }) {
  return (
    <div className="pointer-events-none flex items-center gap-2 rounded-card border-[1.5px] border-rose bg-white px-3 py-2 shadow-[0_8px_24px_rgba(185,100,118,0.25)]">
      <span
        className="h-3 w-3 rounded-sm"
        style={{ background: SEGMENT_COLORS_BY_KEY[row.key] }}
        aria-hidden
      />
      <span className="text-sm font-medium text-charcoal">{row.label}</span>
      {row.enabled && (
        <span className="rounded-pill bg-rose-pale px-2 py-0.5 text-[0.65rem] font-bold text-rose">
          {formatMoney(row.amount)}
        </span>
      )}
    </div>
  );
}

/* ─── Sortable active row ────────────────────────────────────────────── */

function SortableRow({
  row,
  booked,
  perHeadHint,
  cateringRangeHint,
  greyedOut,
  bundleNote,
  onLock,
  onUnlock,
  onRemove,
}: {
  row: BudgetRow;
  booked: boolean;
  perHeadHint: string | null;
  cateringRangeHint: string | null;
  greyedOut?: boolean;
  bundleNote?: string;
  onLock: (amount: number) => void;
  onUnlock: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.key });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(row.amount));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : greyedOut ? 0.55 : 1,
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
      className="group rounded-card border border-border-light bg-bg-soft px-3 py-2"
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          type="button"
          aria-label={`Reorder ${row.label}`}
          {...attributes}
          {...listeners}
          className="flex h-6 w-4 flex-shrink-0 cursor-grab items-center justify-center text-text-muted opacity-40 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-sm group-hover:opacity-80 active:cursor-grabbing"
        >
          <svg aria-hidden viewBox="0 0 12 16" className="h-4 w-3 fill-current">
            <circle cx="3" cy="3"  r="1.2" />
            <circle cx="9" cy="3"  r="1.2" />
            <circle cx="3" cy="8"  r="1.2" />
            <circle cx="9" cy="8"  r="1.2" />
            <circle cx="3" cy="13" r="1.2" />
            <circle cx="9" cy="13" r="1.2" />
          </svg>
        </button>

        <BudgetCategoryIcon category={row.key} variant="active" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-sm text-charcoal">{row.label}</span>
            {booked && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-100 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-emerald-700">
                <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Booked
              </span>
            )}
          </div>
          {row.belowFloor && (
            <span className="block text-[0.65rem] leading-tight text-amber-700">
              Typical minimum for this category is {formatMoney(row.minFloor)}
            </span>
          )}
          {perHeadHint && !row.belowFloor && !bundleNote && (
            <span className="block text-[0.65rem] leading-tight text-text-muted">
              {perHeadHint}
            </span>
          )}
          {bundleNote && (
            <span className="block text-[0.65rem] leading-tight italic text-text-muted">
              {bundleNote}
            </span>
          )}
        </div>

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
              <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-rose" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            )}
            <span>{formatMoney(row.amount)}</span>
            {!row.locked && (
              <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-text-muted opacity-0 transition-opacity group-hover:opacity-100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            )}
          </button>
        )}

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

        <span className="rounded-pill bg-white px-2 py-0.5 text-[0.65rem] font-bold text-text-mid">
          {(row.pct * 100).toFixed(0)}%
        </span>
        <span
          className="hidden rounded-pill bg-bg-soft px-2 py-0.5 text-[0.6rem] font-medium text-text-muted sm:inline"
          title="Estimate based on Ontario industry averages"
        >
          Industry avg
        </span>

        {/* − remove button */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${row.label} from plan`}
          title="Remove from plan"
          className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {cateringRangeHint && (
        <div className="ml-9 mt-1 text-[0.65rem] text-text-muted">
          {cateringRangeHint}
        </div>
      )}
    </li>
  );
}

/* ─── Compact inactive row ───────────────────────────────────────────── */

function InactiveRow({
  row,
  estimatedAmount,
  onAdd,
}: {
  row: BudgetRow;
  estimatedAmount: number;
  onAdd: () => void;
}) {
  const isFeatured = row.key === PROTECTED_KEY;
  return (
    <li className="flex h-9 items-center gap-2 rounded-card border border-border-light bg-white px-2 py-1 transition-all duration-150 ease-out hover:bg-bg-soft">
      <BudgetCategoryIcon category={row.key} variant="compact" />
      <span className="truncate text-[0.8rem] font-medium text-gray-500">
        {row.label}
      </span>
      {isFeatured && (
        <span className="inline-flex items-center gap-0.5 rounded-pill bg-rose-pale px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-rose">
          <svg aria-hidden viewBox="0 0 24 24" className="h-2 w-2 fill-current">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Featured
        </span>
      )}
      <span className="ml-auto rounded-pill bg-gray-50 px-2 py-0.5 text-[0.7rem] font-medium text-gray-400">
        ~{formatMoney(estimatedAmount)}
      </span>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add ${row.label} to plan`}
        title={
          isFeatured
            ? "Photo booths are the #1 guest favourite at Ontario weddings"
            : "Add to plan"
        }
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white shadow-[0_2px_8px_rgba(185,100,118,0.25)] transition-all hover:bg-rose-hover hover:shadow-[0_4px_12px_rgba(185,100,118,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 ${
          isFeatured ? "bg-rose" : "bg-rose"
        }`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5"  x2="12" y2="19" />
          <line x1="5"  y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </li>
  );
}
