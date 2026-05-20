"use client";

import {
  PALETTE_GROUPS,
  PALETTES_FLAT,
  PALETTE_FREE_LIMIT,
  type WeddingPalette,
} from "@/lib/wedding-palettes";

/* Palette picker — renders the 23 wedding-specific palettes in 6
 * groups. Clicking a card applies the four hex colours + sets the
 * theme to "custom" so /weddings/[slug] renders the default layout
 * with these tokens. Premium palettes (anything past PALETTE_FREE_LIMIT
 * in display order) show a lock + open the upgrade modal on click.
 */
export function PalettePicker({
  activeId,
  isPremium,
  onApply,
  onLockedClick,
}: {
  activeId:      string | null;
  isPremium:     boolean;
  onApply:       (palette: WeddingPalette) => void;
  onLockedClick: () => void;
}) {
  return (
    <div className="space-y-6">
      {PALETTE_GROUPS.map((group) => (
        <div key={group.id}>
          <div className="mb-3 flex items-baseline gap-2">
            <div className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-rose">
              {group.label}
            </div>
            <span className="text-[0.65rem] text-text-muted">
              {group.palettes.length} {group.palettes.length === 1 ? "palette" : "palettes"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.palettes.map((p) => {
              const isLocked = !isPremium && PALETTES_FLAT.indexOf(p) >= PALETTE_FREE_LIMIT;
              const isActive = activeId === p.id;
              return (
                <PaletteCard
                  key={p.id}
                  palette={p}
                  isActive={isActive}
                  isLocked={isLocked}
                  onClick={() => (isLocked ? onLockedClick() : onApply(p))}
                />
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-[0.7rem] text-text-muted">
        {isPremium
          ? "All palettes unlocked. Click any card to apply it to your site."
          : `First ${PALETTE_FREE_LIMIT} palettes free. The rest unlock with Premium.`}
      </p>
    </div>
  );
}

function PaletteCard({
  palette, isActive, isLocked, onClick,
}: {
  palette:  WeddingPalette;
  isActive: boolean;
  isLocked: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${palette.name}${isLocked ? " (locked — Premium)" : ""}`}
      aria-pressed={isActive}
      className={`relative flex h-[140px] w-full flex-col justify-between overflow-hidden rounded-card border-2 p-3 text-left transition-all ${
        isActive
          ? "border-rose shadow-[0_8px_24px_rgba(185,100,118,0.18)]"
          : "border-border hover:border-rose/70"
      } ${isLocked ? "opacity-90" : ""}`}
      style={{ background: palette.bg }}
    >
      {/* Swatch row */}
      <div className="flex items-center gap-1.5">
        <Swatch color={palette.primary} title="primary" />
        <Swatch color={palette.accent}  title="accent" />
        <Swatch color={palette.bg}      title="bg" hasBorder />
      </div>

      {/* Sample type in the palette's actual colours */}
      <div className="mt-2 flex-1">
        <div
          className="text-[0.7rem] uppercase tracking-[0.14em]"
          style={{ color: palette.primary }}
        >
          The Wedding Of
        </div>
        <div
          className="mt-0.5 truncate font-display text-base italic"
          style={{ color: palette.text }}
        >
          Charlotte &amp; Francis
        </div>
      </div>

      {/* Name footer */}
      <div className="text-[0.7rem] font-bold uppercase tracking-[0.1em]"
           style={{ color: palette.text }}>
        {palette.name}
      </div>

      {/* Active checkmark */}
      {isActive && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current"
               strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal/80 text-white shadow-sm">
          <LockIcon />
        </div>
      )}
      {isLocked && (
        <div className="pointer-events-none absolute inset-0 bg-charcoal/10" aria-hidden />
      )}
    </button>
  );
}

function Swatch({ color, title, hasBorder }: { color: string; title: string; hasBorder?: boolean }) {
  return (
    <span
      title={title}
      aria-label={title}
      className="block h-4 w-4 rounded-full"
      style={{
        background: color,
        border:     hasBorder ? "1px solid rgba(0,0,0,0.12)" : "none",
        boxShadow:  hasBorder ? "none" : "0 0 0 1px rgba(0,0,0,0.08) inset",
      }}
    />
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
