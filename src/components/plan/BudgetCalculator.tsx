"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
  CATERING_PER_GUEST,
  CATERING_TYPE_LABELS,
  PLANNER_REGIONS,
  PROTECTED_KEY,
  calculateBudgetWithState,
  defaultBudgetCategoryStates,
  getVenuePricingRange,
  normalizeCateringType,
  type BudgetCategoryStates,
  type BudgetCategoryToggle,
  type BudgetRow,
  type VendorCategoryKey,
} from "@/lib/plan-state";

const ACTIVE_CONTAINER_ID = "__active_container__";
const DRAWER_CONTAINER_ID = "__drawer_container__";

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
  onChange,
}: Props) {
  const states = budgetCategoryStates ?? defaultBudgetCategoryStates();
  const rows = useMemo(() => calculateBudgetWithState(totalBudget, states), [totalBudget, states]);

  const activeRows = rows.filter((r) => r.enabled);
  const drawerRows = rows.filter((r) => !r.enabled);

  const [drawerOpen, setDrawerOpen] = useState(false);
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

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as VendorCategoryKey);
    /* Open the drawer when grabbing an active row so cross-zone drop is reachable. */
    if (states.toggles[e.active.id as VendorCategoryKey]?.enabled) {
      setDrawerOpen(true);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const dragKey = active.id as VendorCategoryKey;
    const overId = over.id;
    const dragFromActive = states.toggles[dragKey].enabled;

    /* Figure out the destination container + index. */
    let dropIntoActive: boolean;
    let dropIndex: number;

    if (overId === ACTIVE_CONTAINER_ID) {
      dropIntoActive = true;
      dropIndex = activeRows.length;
    } else if (overId === DRAWER_CONTAINER_ID) {
      dropIntoActive = false;
      dropIndex = drawerRows.length;
    } else {
      const overKey = overId as VendorCategoryKey;
      if (overKey === dragKey) return;
      dropIntoActive = states.toggles[overKey].enabled;
      const list = dropIntoActive ? activeRows : drawerRows;
      dropIndex = list.findIndex((r) => r.key === overKey);
      if (dropIndex === -1) dropIndex = list.length;
    }

    const activeKeys = activeRows.map((r) => r.key);
    const drawerKeys = drawerRows.map((r) => r.key);
    const nextToggles = { ...states.toggles };

    let nextActive: VendorCategoryKey[];
    let nextDrawer: VendorCategoryKey[];

    if (dragFromActive && dropIntoActive) {
      const oldIdx = activeKeys.indexOf(dragKey);
      nextActive = arrayMove(activeKeys, oldIdx, dropIndex);
      nextDrawer = drawerKeys;
    } else if (!dragFromActive && !dropIntoActive) {
      const oldIdx = drawerKeys.indexOf(dragKey);
      nextActive = activeKeys;
      nextDrawer = arrayMove(drawerKeys, oldIdx, dropIndex);
    } else if (dragFromActive && !dropIntoActive) {
      /* active → drawer */
      nextToggles[dragKey] = { ...nextToggles[dragKey], enabled: false };
      nextActive = activeKeys.filter((k) => k !== dragKey);
      nextDrawer = [...drawerKeys];
      nextDrawer.splice(dropIndex, 0, dragKey);
    } else {
      /* drawer → active */
      nextToggles[dragKey] = { ...nextToggles[dragKey], enabled: true };
      nextDrawer = drawerKeys.filter((k) => k !== dragKey);
      nextActive = [...activeKeys];
      nextActive.splice(dropIndex, 0, dragKey);
    }

    const nextOrder: VendorCategoryKey[] = [...nextActive, ...nextDrawer];
    onChange({ budgetCategoryStates: { order: nextOrder, toggles: nextToggles } });
  }

  const activeRowSet = useMemo(() => new Map(activeRows.map((r) => [r.key, r])), [activeRows]);
  const draggingRow = activeId ? activeRowSet.get(activeId) ?? drawerRows.find((r) => r.key === activeId) : null;

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
          The eight essentials are active by default. Drag rows between the
          active list and the drawer, or click the pencil to lock an amount.
        </p>
      </header>

      {capacityWarning && (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="font-semibold">Capacity check:</strong>{" "}
          {capacityWarning}
        </div>
      )}

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
                  <Pie
                    data={activeRows.filter((r) => r.amount > 0)}
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
                    {activeRows.filter((r) => r.amount > 0).map((r) => (
                      <Cell key={r.key} fill={SEGMENT_COLORS_BY_KEY[r.key]} />
                    ))}
                  </Pie>
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
            <ActiveDropZone>
              <SortableContext items={activeRows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {activeRows.map((row) => (
                    <SortableRow
                      key={row.key}
                      row={row}
                      perHeadHint={
                        row.key === "catering_bar" && row.locked && cateringType && guestCount > 0
                          ? `~${formatMoney(Math.round(row.amount / guestCount))}/guest · ${CATERING_TYPE_LABELS[cateringType]} · based on ${venueName ?? "your venue"}`
                          : null
                      }
                      cateringRangeHint={
                        row.key === "catering_bar" && cateringRange
                          ? `Typically $${cateringRange.low}–$${cateringRange.high}/guest for ${CATERING_TYPE_LABELS[cateringType!]} in ${region}`
                          : null
                      }
                      onLock={(amount) => updateToggle(row.key, { lockedAmount: amount })}
                      onUnlock={() => updateToggle(row.key, { lockedAmount: null })}
                    />
                  ))}
                  {activeRows.length === 0 && (
                    <li className="rounded-card border border-dashed border-border bg-bg-soft p-6 text-center text-sm text-text-muted">
                      Drag categories up from the drawer to start your budget.
                    </li>
                  )}
                </ul>
              </SortableContext>
            </ActiveDropZone>

            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              className="mt-5 inline-flex items-center gap-2 rounded-pill border border-dashed border-rose bg-white px-4 py-2 text-sm font-bold text-rose hover:bg-rose-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              aria-expanded={drawerOpen}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className={`h-3.5 w-3.5 fill-none stroke-current transition-transform ${drawerOpen ? "rotate-45" : ""}`}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5"  x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
              {drawerOpen
                ? `Hide categories drawer (${drawerRows.length})`
                : `Add more categories (${drawerRows.length} available)`}
            </button>

            {drawerOpen && (
              <DrawerDropZone>
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-text-muted">
                  Drag chips up into your list, or tap to add to the bottom
                </div>
                <SortableContext items={drawerRows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {drawerRows.length === 0 && (
                      <p className="text-xs text-text-muted">
                        All categories are in your active list. Drag any item down here to remove it.
                      </p>
                    )}
                    {drawerRows.map((row) => (
                      <DrawerChip
                        key={row.key}
                        row={row}
                        onAdd={() => updateToggle(row.key, { enabled: true })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DrawerDropZone>
            )}

            <p className="mt-4 text-[0.7rem] leading-relaxed text-text-muted">
              Drag rows to reorder, between zones to move them, or use the
              × button on a row. Photo Booth is featured — it can move to the
              drawer but stays available as the #1 guest favourite at Ontario weddings.
            </p>
          </div>
        </div>

        <DragOverlay>
          {draggingRow ? <DragPreview row={draggingRow} /> : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

/* ─── Droppable containers ───────────────────────────────────────────── */

function ActiveDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: ACTIVE_CONTAINER_ID });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-card transition-colors ${isOver ? "ring-2 ring-rose ring-offset-2" : ""}`}
    >
      {children}
    </div>
  );
}

function DrawerDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: DRAWER_CONTAINER_ID });
  return (
    <div
      ref={setNodeRef}
      className={`mt-3 rounded-card border border-dashed bg-bg-soft p-4 transition-colors ${
        isOver ? "border-rose bg-rose-pale ring-2 ring-rose ring-offset-2" : "border-border"
      }`}
    >
      {children}
    </div>
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
  perHeadHint,
  cateringRangeHint,
  onLock,
  onUnlock,
}: {
  row: BudgetRow;
  perHeadHint: string | null;
  cateringRangeHint: string | null;
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
    opacity: isDragging ? 0.3 : 1,
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

        <span
          className="h-3 w-3 flex-shrink-0 rounded-sm"
          style={{ background: SEGMENT_COLORS_BY_KEY[row.key] }}
          aria-hidden
        />

        <div className="flex-1 min-w-0">
          <span className="block truncate text-sm text-charcoal">{row.label}</span>
          {row.belowFloor && (
            <span className="block text-[0.65rem] leading-tight text-amber-700">
              Typical minimum for this category is {formatMoney(row.minFloor)}
            </span>
          )}
          {perHeadHint && !row.belowFloor && (
            <span className="block text-[0.65rem] leading-tight text-text-muted">
              {perHeadHint}
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
      </div>

      {cateringRangeHint && (
        <div className="ml-9 mt-1 text-[0.65rem] text-text-muted">
          {cateringRangeHint}
        </div>
      )}
    </li>
  );
}

/* ─── Sortable drawer chip ───────────────────────────────────────────── */

function DrawerChip({
  row,
  onAdd,
}: {
  row: BudgetRow;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.key });

  const isFeatured = row.key === PROTECTED_KEY;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group inline-flex items-center gap-2 rounded-pill bg-white px-3 py-1.5 text-xs font-medium text-charcoal transition-all hover:-translate-y-0.5 hover:shadow-sm ${
        isFeatured ? "border-[1.5px] border-rose" : "border border-border"
      }`}
    >
      {/* Drag affordance covers most of the chip; tap fires onAdd */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-5 w-3 cursor-grab items-center justify-center text-text-muted opacity-40 transition-opacity group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 active:cursor-grabbing"
        aria-label={`Drag ${row.label}`}
      >
        <svg aria-hidden viewBox="0 0 12 16" className="h-3.5 w-2.5 fill-current">
          <circle cx="3" cy="4"  r="1" />
          <circle cx="9" cy="4"  r="1" />
          <circle cx="3" cy="8"  r="1" />
          <circle cx="9" cy="8"  r="1" />
          <circle cx="3" cy="12" r="1" />
          <circle cx="9" cy="12" r="1" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onAdd}
        title={
          isFeatured
            ? "Photo booths are the #1 guest favourite at Ontario weddings"
            : `Add ${row.label} to your active list`
        }
        className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 focus-visible:rounded-pill"
      >
        <span
          className="h-2 w-2 rounded-sm"
          style={{ background: SEGMENT_COLORS_BY_KEY[row.key] }}
          aria-hidden
        />
        <span>{row.label}</span>
        {isFeatured && (
          <span className="rounded-pill bg-rose px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.06em] text-white">
            Featured
          </span>
        )}
        <span className="text-rose opacity-60 transition-opacity group-hover:opacity-100" aria-hidden>+</span>
      </button>
    </div>
  );
}
