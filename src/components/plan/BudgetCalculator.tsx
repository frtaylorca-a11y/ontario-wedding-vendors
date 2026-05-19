"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { BUDGET_CATEGORIES, PLANNER_REGIONS, calculateBudget } from "@/lib/plan-state";

/* 14 brand-aligned colors for donut segments — rose family + warm neutrals + gold/green accents */
const SEGMENT_COLORS = [
  "#B96476", // venue_rental (primary rose)
  "#C9A96E", // catering_bar (gold)
  "#8C7B6E", // photo_video (taupe)
  "#D4899A", // music_dj (rose-mid)
  "#4A7C59", // flowers_decor (green)
  "#E8B5C0", // cake (rose-light)
  "#A5536A", // hair_makeup (rose-hover)
  "#B0A299", // officiant (warm-grey)
  "#EFE0C0", // stationery (gold-light)
  "#7CA0BC", // transportation (blue)
  "#F7EEF1", // attire_bride (rose-pale)
  "#6FA084", // attire_groom (green-light)
  "#547C9C", // lighting_sound (blue-deep)
  "#D97706", // photo_booth (amber)
];

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
  onChange: (next: {
    totalBudget?: number;
    guestCount?: number;
    region?: string;
    weddingDate?: string | null;
  }) => void;
};

export function BudgetCalculator({
  totalBudget,
  guestCount,
  region,
  weddingDate,
  onChange,
}: Props) {
  const rows = useMemo(() => calculateBudget(totalBudget), [totalBudget]);

  return (
    <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
      <header className="mb-6">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          Step 1 · Budget
        </div>
        <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
          Your wedding budget
        </h2>
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

      {/* Donut + category breakdown */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
        {/* Donut */}
        <div className="relative flex items-center justify-center">
          <div className="h-[280px] w-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="amount"
                  nameKey="label"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={1}
                  stroke="white"
                  strokeWidth={2}
                >
                  {rows.map((_, i) => (
                    <Cell key={i} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
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
          {/* Center label */}
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

        {/* 14-category breakdown */}
        <div>
          <ul className="space-y-2">
            {rows.map((r, i) => {
              const cat = BUDGET_CATEGORIES[i];
              return (
                <li
                  key={r.key}
                  className="flex items-center gap-3 rounded-card border border-border-light bg-bg-soft px-3 py-2"
                >
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-sm"
                    style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                    aria-hidden
                  />
                  <span className="flex-1 truncate text-sm text-charcoal">
                    {cat.label}
                  </span>
                  <span className="text-sm font-medium text-charcoal">
                    {formatMoney(r.amount)}
                  </span>
                  <span className="rounded-pill bg-white px-2 py-0.5 text-[0.65rem] font-bold text-text-mid">
                    {(r.pct * 100).toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[0.7rem] leading-relaxed text-text-muted">
            Allocations follow Ontario averages. Drag the sliders to see your
            personalized breakdown — these become your per-vendor budget caps
            in Step 3.
          </p>
        </div>
      </div>
    </section>
  );
}
