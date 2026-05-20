"use client";

import { useState } from "react";
import { getThemeTokens } from "@/lib/wedding-themes";
import type { WeddingTheme } from "@/lib/wedding-website";

/* Wizard Step 1 — visual style picker.
 *
 * Six reference designs as screenshot cards (2×3 desktop, 1-col
 * mobile). Click writes weddingTheme to the editor state. All six
 * are layout-variant themes, so all six are premium-locked for free
 * users — the lock badge + onClick → upgrade modal hooks into the
 * same path the existing ThemePicker already uses.
 */

const STYLES: Array<{
  id:           WeddingTheme;
  imageSlug:    string;   // /public/images/wedding-styles/<slug>.jpg
  name:         string;
  descriptor:   string;
}> = [
  { id: "editorial",   imageSlug: "editorial",     name: "Editorial",        descriptor: "Bold typography, collage photos" },
  { id: "minimal",     imageSlug: "minimal-blush", name: "Minimal Romantic", descriptor: "Clean, soft, timeless"           },
  { id: "terracotta",  imageSlug: "terracotta",    name: "Warm Terracotta",  descriptor: "Earthy tones, rustic warmth"     },
  { id: "retro",       imageSlug: "retro-charm",   name: "Retro Charm",      descriptor: "Playful, vintage, personality"   },
  { id: "bold-garden", imageSlug: "bold-garden",   name: "Bold & Colourful", descriptor: "Vibrant, editorial, modern"       },
  { id: "frosted",     imageSlug: "frosted-glass", name: "Frosted Glass",    descriptor: "Elegant, moody, dramatic"         },
];

export function StylePicker({
  applied,
  tier,
  onApply,
  onLockedClick,
  onBrowseAll,
}: {
  applied:        WeddingTheme;
  tier:           "free" | "premium";
  onApply:        (theme: WeddingTheme) => void;
  onLockedClick:  (theme: WeddingTheme) => void;
  onBrowseAll?:   () => void;
}) {
  return (
    <div>
      <header className="mb-6 text-center sm:text-left">
        <h3 className="font-display text-2xl font-semibold leading-tight text-charcoal sm:text-3xl">
          Which style speaks to you?
        </h3>
        <p className="mt-1 text-sm text-text-mid">
          Pick the one that feels most like your wedding. You can fine-tune
          colours and fonts below.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STYLES.map((s) => {
          const isLocked = tier !== "premium";
          const isApplied = applied === s.id;
          return (
            <li key={s.id}>
              <StyleCard
                style={s}
                isApplied={isApplied}
                isLocked={isLocked}
                onClick={() => (isLocked ? onLockedClick(s.id) : onApply(s.id))}
              />
            </li>
          );
        })}
      </ul>

      {/* Browse-all escape hatch — drops the couple into the existing
       * detailed ThemePicker which has all 14 themes + colour-only
       * options. */}
      <p className="mt-5 text-center text-sm text-text-mid">
        Want more options?{" "}
        <button
          type="button"
          onClick={onBrowseAll}
          className="font-bold text-rose hover:underline"
        >
          Browse all 14 themes →
        </button>
      </p>
    </div>
  );
}

function StyleCard({
  style, isApplied, isLocked, onClick,
}: {
  style:     (typeof STYLES)[number];
  isApplied: boolean;
  isLocked:  boolean;
  onClick:   () => void;
}) {
  const tokens = getThemeTokens(style.id);
  /* Image lives at /public/images/wedding-styles/<slug>.jpg. Until
   * the JPG is dropped in we hide the broken <img> and fall through
   * to the theme-coloured gradient placeholder. */
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isApplied}
      aria-label={`Pick ${style.name} style${isLocked ? " — Premium" : ""}`}
      className={`group relative block w-full overflow-hidden rounded-card border-2 bg-white text-left transition-all ${
        isApplied
          ? "border-rose shadow-[0_8px_24px_rgba(185,100,118,0.18)]"
          : "border-border hover:border-rose/70 hover:shadow-md"
      }`}
    >
      {/* 16:9 thumbnail */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {/* Always-on theme-coloured gradient — provides the visual
         * even when the JPG hasn't been dropped in yet. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${tokens.accent} 0%, ${tokens.accentSoft} 50%, ${tokens.pageBg} 100%)`,
          }}
        />

        {/* Screenshot — hides itself on 404 so the gradient shows through. */}
        {!imgFailed && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/images/wedding-styles/${style.imageSlug}.jpg`}
            alt=""
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}

        {/* If image failed, show the style name large over the gradient. */}
        {imgFailed && (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <span
              className="px-4 text-2xl font-semibold sm:text-3xl"
              style={{
                fontFamily: tokens.fontDisplay,
                fontStyle:  tokens.displayItalic,
                color:      tokens.accentInk,
                textShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
            >
              {style.name}
            </span>
          </div>
        )}

        {/* Subtle bottom gradient for legibility behind the bottom-row badges */}
        {!imgFailed && (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-12"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%)" }}
          />
        )}

        {/* Applied checkmark */}
        {isApplied && (
          <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current"
                 strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        {/* Lock badge */}
        {isLocked && (
          <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-charcoal/85 text-white shadow-md">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
        )}
      </div>

      {/* Below thumbnail: name (Cormorant italic) + descriptor (Inter) */}
      <div className="px-5 py-4">
        <div
          className="text-xl"
          style={{
            fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
            fontStyle:  "italic",
            color:      "var(--charcoal, #2C2C2C)",
          }}
        >
          {style.name}
        </div>
        <p className="mt-1 text-sm text-text-mid">{style.descriptor}</p>
      </div>
    </button>
  );
}
