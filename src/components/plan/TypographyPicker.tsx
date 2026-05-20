"use client";

import { TYPOGRAPHY_STYLES, type TypographyStyle } from "@/lib/wedding-typography";

/* Five typography "feels" — no font names exposed to the couple.
 * Each chip shows a one-line preview ("Charlotte & Francis · August
 * 15, 2026") rendered in the actual fonts at 14px. */
export function TypographyPicker({
  activeId,
  previewCoupleLabel,
  previewDateUpper,
  onApply,
}: {
  activeId:           string | null;
  previewCoupleLabel: string;
  previewDateUpper:   string | null;
  onApply:            (style: TypographyStyle) => void;
}) {
  return (
    <div className="space-y-3">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {TYPOGRAPHY_STYLES.map((t) => {
          const isActive = activeId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onApply(t)}
                aria-pressed={isActive}
                className={`flex w-full items-center gap-4 rounded-card border-2 px-4 py-3 text-left transition-all ${
                  isActive
                    ? "border-rose bg-rose-pale/30 shadow-[0_4px_14px_rgba(185,100,118,0.12)]"
                    : "border-border bg-white hover:border-rose/70"
                }`}
              >
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center rounded-pill border px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] ${
                      isActive ? "border-rose bg-rose text-white" : "border-border text-charcoal"
                    }`}
                  >
                    {t.label}
                  </span>
                </div>

                {/* Preview in the actual fonts */}
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[14px] leading-[1.3]"
                    style={{
                      fontFamily:   t.fontDisplay,
                      fontStyle:    t.displayStyle,
                      fontWeight:   t.displayWeight,
                      color:        "var(--charcoal, #2C2C2C)",
                    }}
                  >
                    {previewCoupleLabel}
                  </div>
                  {previewDateUpper && (
                    <div
                      className="mt-0.5 truncate text-[12px] uppercase tracking-[0.16em] opacity-70"
                      style={{ fontFamily: t.fontBody }}
                    >
                      {previewDateUpper}
                    </div>
                  )}
                </div>

                {/* Active checkmark */}
                {isActive && (
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current"
                         strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[0.65rem] text-text-muted">
        Claude uses the typography feel to match the tone of generated
        copy — it doesn&rsquo;t just change the look.
      </p>
    </div>
  );
}
