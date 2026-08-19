"use client";

import { useState } from "react";
import { getThemeTokens, themeStyle } from "@/lib/wedding-themes";
import { WEDDING_THEMES, type WeddingTheme } from "@/lib/wedding-website";
import { ThemeLayoutPreview } from "@/components/plan/ThemeLayoutPreview";

/* Theme picker for /plan/website.
 *
 * Left:  8 preview cards in a 2-up (mobile) / 4-up (desktop) grid.
 * Right: full preview panel — hero + Our Story + Event Details
 *        rendered in the previewed theme's actual CSS tokens.
 *
 * Two distinct states:
 *   - `previewed`  (local) — which card the user is hovering / clicked
 *   - `applied`    (prop)  — the theme saved to wedding_plans.weddingTheme
 *
 * Clicking a card only updates `previewed`. The "Apply this theme"
 * button (only enabled when previewed ≠ applied) hands off to the
 * editor via onApply(theme) which triggers the autosave path.
 */
export function ThemePicker({
  applied,
  tier,
  coupleLabel,
  weddingDateFormatted,
  venueLine,
  onApply,
  onLockedClick,
}: {
  applied:              WeddingTheme;
  tier:                 "free" | "premium";
  coupleLabel:          string;
  weddingDateFormatted: string | null;
  venueLine:            string | null;
  onApply:              (theme: WeddingTheme) => void;
  onLockedClick:        (theme: WeddingTheme) => void;
}) {
  const [previewed, setPreviewed] = useState<WeddingTheme>(applied);
  const tokens = getThemeTokens(previewed);

  /* Premium themes are tagged on WEDDING_THEMES — render a lock badge
   * when the couple is free-tier; clicking opens the upgrade modal. */
  const themeMeta = WEDDING_THEMES.find((t) => t.id === previewed);
  const isPreviewedLocked = !!themeMeta?.isPremium && tier !== "premium";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* ── Cards grid ────────────────────────────────────────────── */}
      <div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {WEDDING_THEMES.map((t) => {
            const locked = !!t.isPremium && tier !== "premium";
            return (
              <ThemeCard
                key={t.id}
                theme={t.id}
                label={t.label}
                isPreviewed={previewed === t.id}
                isApplied={applied === t.id}
                isLocked={locked}
                onClick={() => setPreviewed(t.id)}
              />
            );
          })}
        </div>
        <p className="mt-3 text-[0.7rem] text-text-muted">
          {tier === "premium"
            ? "All themes unlocked. Click a card to preview, then Apply."
            : "Premium themes (lock icon) unlock the layout variants — Terracotta and Frosted Glass."}
        </p>
      </div>

      {/* ── Full preview panel ───────────────────────────────────── */}
      <aside className="rounded-card border border-border bg-bg-soft p-3">
        <header className="mb-3 flex items-center justify-between px-2">
          <div>
            <div className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-text-muted">
              Previewing
            </div>
            <div className="font-display text-lg font-semibold text-charcoal">
              {WEDDING_THEMES.find((t) => t.id === previewed)?.label}
            </div>
          </div>
          {applied === previewed ? (
            <span className="rounded-pill bg-emerald-100 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-emerald-700">
              Currently applied
            </span>
          ) : (
            <span className="rounded-pill bg-rose-pale px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-rose">
              Preview only
            </span>
          )}
        </header>

        <FullPreview
          previewed={previewed}
          coupleLabel={coupleLabel}
          weddingDateFormatted={weddingDateFormatted}
          venueLine={venueLine}
        />

        <div className="mt-3 px-2">
          <button
            type="button"
            disabled={applied === previewed}
            onClick={() => isPreviewedLocked ? onLockedClick(previewed) : onApply(previewed)}
            className={`w-full rounded-pill px-5 py-3 text-sm font-bold shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
              isPreviewedLocked
                ? "bg-charcoal text-white hover:bg-charcoal/90"
                : "bg-rose text-white hover:bg-rose-hover"
            }`}
          >
            {applied === previewed
              ? "✓ Theme applied"
              : isPreviewedLocked
              ? "🔒 Unlock with Premium →"
              : "Apply this theme →"}
          </button>
          <p className="mt-2 text-center text-[0.65rem] text-text-muted">
            Fonts shown: {tokens.fontDisplayLabel} (headings) · {tokens.fontBodyLabel} (body)
          </p>
        </div>
      </aside>
    </div>
  );
}

/* ─── Mini preview card ────────────────────────────────────────────── */

function ThemeCard({
  theme, label, isPreviewed, isApplied, isLocked, onClick,
}: {
  theme:       WeddingTheme;
  label:       string;
  isPreviewed: boolean;
  isApplied:   boolean;
  isLocked:    boolean;
  onClick:     () => void;
}) {
  const t = getThemeTokens(theme);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Preview ${label} theme`}
      className={`group relative flex h-[220px] w-full flex-col overflow-hidden rounded-card border-2 bg-white text-left transition-all ${
        isPreviewed
          ? "border-rose shadow-[0_8px_24px_rgba(185,100,118,0.18)]"
          : "border-border hover:border-rose/60"
      }`}
    >
      {/* Color bar — 8px top accent */}
      <div className="h-2 w-full flex-shrink-0" style={{ background: t.accent }} aria-hidden />

      {/* Mini preview — layout-specific for the 6 layout variants,
       * generic tokens-driven mockup for the 8 colour-only themes. */}
      <LayoutOrGeneric theme={theme} tokens={t} variant="card" />

      {/* Font name — always shown below the preview */}
      <div
        className="border-t px-2 py-1.5 text-center"
        style={{ borderColor: t.border, background: t.pageBg }}
      >
        <span
          className="text-[0.58rem]"
          style={{ fontFamily: t.fontDisplay, color: t.inkMuted, fontStyle: t.displayItalic }}
        >
          {t.fontDisplayLabel}
        </span>
      </div>

      {/* Theme name footer */}
      <div
        className="border-t px-3 py-2 text-center"
        style={{ borderColor: t.border, background: t.surface }}
      >
        <span
          className="text-xs font-bold uppercase tracking-[0.1em]"
          style={{ color: t.ink }}
        >
          {label}
        </span>
        {t.isDark && (
          <span className="ml-1.5 rounded-pill bg-amber-100 px-1.5 py-px text-[0.5rem] font-bold uppercase tracking-[0.08em] text-amber-700">
            Dark
          </span>
        )}
      </div>

      {/* Applied checkmark */}
      {isApplied && (
        <div className="absolute right-2 top-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current"
               strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Lock badge (premium-only themes) */}
      {isLocked && (
        <div className="absolute right-2 top-3.5 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal/80 text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
      )}
    </button>
  );
}

/* Swap-in helper: for the 6 themes with their own <Layout> component
 * we render a structurally-faithful mini mockup that reproduces the
 * actual layout's signature move (Frosted's glass panel, Editorial's
 * split, Minimal's sidebar, Retro's double frame, Bold Garden's
 * split bands, Terracotta's warm pill hero). For the 8 colour-only
 * themes we fall back to a generic tokens-driven mockup so couples
 * still see the palette + fonts at a glance. */
function LayoutOrGeneric({
  theme, tokens, variant,
}: {
  theme:   WeddingTheme;
  tokens:  ReturnType<typeof getThemeTokens>;
  variant: "card" | "full";
}) {
  const layoutPreview = <ThemeLayoutPreview theme={theme} variant={variant} />;
  const isLayoutVariant = WEDDING_THEMES.find((t) => t.id === theme)?.isLayoutVariant;

  if (isLayoutVariant) {
    return (
      <div className={variant === "card" ? "h-[140px] w-full" : "h-[280px] w-full"}>
        {layoutPreview}
      </div>
    );
  }

  /* Generic tokens-driven mockup — kept for the 8 colour-only themes.
   * The 6 layout variants get the layout-specific preview above. */
  return (
    <div
      className={`flex flex-col items-center justify-center px-3 py-4 text-center ${
        variant === "card" ? "h-[140px]" : "h-[280px]"
      }`}
      style={{ background: tokens.pageBg, color: tokens.ink }}
    >
      <div className="text-[0.55rem] font-bold uppercase tracking-[0.16em]"
           style={{ color: tokens.accent }}>
        Save the date
      </div>
      <div className={`mt-1 leading-tight ${variant === "card" ? "text-base" : "text-2xl"}`}
           style={{
             fontFamily: tokens.fontDisplay,
             fontStyle:  tokens.displayItalic,
             color:      tokens.ink,
           }}>
        Charlotte &amp; Francis
      </div>
      <div className="mt-0.5 text-[0.6rem]"
           style={{ color: tokens.inkMuted, fontFamily: tokens.fontBody }}>
        Sep 12, 2026 · Niagara
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <Swatch color={tokens.accent}     title="primary" />
        <Swatch color={tokens.pageBg}     title="bg" />
        <Swatch color={tokens.accentSoft} title="accent" />
      </div>
    </div>
  );
}

function Swatch({ color, title }: { color: string; title: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      className="block h-3 w-3 rounded-full border"
      style={{ background: color, borderColor: "rgba(0,0,0,0.12)" }}
    />
  );
}

/* ─── Full preview panel — real fonts + real tokens ─────────────────
 *
 * For the 6 layout variants the top block renders a bigger version of
 * the same layout-specific mockup used in the grid cards. The Our
 * Story + Event Details blocks below stay generic tokens-driven —
 * couples pick a theme largely by hero (that's what a preview
 * screenshot would show them anyway), and rendering the exact
 * asymmetric grids of Editorial / Bold Garden at panel scale would
 * be hard to read. Hero is the identity; body is the palette. */

function FullPreview({
  previewed, coupleLabel, weddingDateFormatted, venueLine,
}: {
  previewed:             WeddingTheme;
  coupleLabel:           string;
  weddingDateFormatted:  string | null;
  venueLine:             string | null;
}) {
  const t = getThemeTokens(previewed);
  const isLayoutVariant = WEDDING_THEMES.find((th) => th.id === previewed)?.isLayoutVariant;

  return (
    <div
      style={themeStyle(previewed)}
      className="overflow-hidden rounded-card border"
    >
      {/* Hero — layout-specific for the 6 variants, generic otherwise */}
      {isLayoutVariant ? (
        <div className="h-[240px] w-full">
          <ThemeLayoutPreview
            theme={previewed}
            variant="full"
            names={coupleLabel}
            date={weddingDateFormatted ?? "Save the date"}
            place={venueLine ?? "Ontario"}
          />
        </div>
      ) : (
        <div className="px-6 py-9 text-center" style={{ background: t.pageBg }}>
          <div className="text-[0.6rem] font-bold uppercase tracking-[0.16em]"
               style={{ color: t.accent }}>
            Save the date
          </div>
          <div
            className="mt-2 text-2xl leading-tight"
            style={{
              fontFamily: t.fontDisplay,
              fontStyle:  t.displayItalic,
              color:      t.ink,
            }}
          >
            {coupleLabel}
          </div>
          {weddingDateFormatted && (
            <div
              className="mt-2 text-sm italic"
              style={{ fontFamily: t.fontDisplay, color: t.accent }}
            >
              {weddingDateFormatted}
            </div>
          )}
          {venueLine && (
            <div className="mt-1 text-xs" style={{ color: t.inkMuted, fontFamily: t.fontBody }}>
              {venueLine}
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <span
              className="inline-flex items-center rounded-full px-4 py-1.5 text-[0.65rem] font-bold"
              style={{ background: t.accent, color: t.accentInk }}
            >
              RSVP &amp; details →
            </span>
          </div>
        </div>
      )}

      {/* Our story — kept generic across all themes so couples can read
       * the body copy in the theme's actual body font. */}
      <div className="border-t px-6 py-7" style={{ borderColor: t.border, background: t.pageBg }}>
        <h3 className="text-center text-lg"
            style={{
              fontFamily: t.fontDisplay,
              fontStyle:  t.displayItalic,
              color:      t.ink,
            }}>
          Our story
        </h3>
        <p className="mt-3 text-center text-[0.78rem] leading-relaxed"
           style={{ color: t.inkMuted, fontFamily: t.fontBody }}>
          We met during a Wednesday-night studio in 2019, both quiet at the
          back of the room arguing the same point. The proposal was at the
          end of a wine tour on a rainy October afternoon, five years later.
        </p>
      </div>

      {/* Event details card */}
      <div className="border-t px-6 py-7" style={{ borderColor: t.border, background: t.pageBg }}>
        <h3 className="text-center text-lg"
            style={{
              fontFamily: t.fontDisplay,
              fontStyle:  t.displayItalic,
              color:      t.ink,
            }}>
          Event details
        </h3>
        <div
          className="mx-auto mt-3 rounded-2xl border p-4 text-center"
          style={{ background: t.surface, borderColor: t.border }}
        >
          <div className="text-[0.6rem] font-bold uppercase tracking-[0.12em]"
               style={{ color: t.accent }}>
            All guests
          </div>
          <div className="mt-1 text-base"
               style={{
                 fontFamily: t.fontDisplay,
                 fontStyle:  t.displayItalic,
                 color:      t.ink,
               }}>
            Ceremony &amp; reception
          </div>
          {weddingDateFormatted && (
            <div className="mt-1 text-xs" style={{ color: t.inkMuted, fontFamily: t.fontBody }}>
              {weddingDateFormatted}
            </div>
          )}
          {venueLine && (
            <div className="mt-0.5 text-xs" style={{ color: t.inkMuted, fontFamily: t.fontBody }}>
              {venueLine}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
