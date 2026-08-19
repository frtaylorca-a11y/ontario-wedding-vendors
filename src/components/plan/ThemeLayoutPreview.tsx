"use client";

/**
 * Layout-specific mini previews for the six themes whose /weddings/[slug]
 * pages render via a dedicated Layout component
 * (Terracotta, Frosted Glass, Editorial, Minimal Romantic, Retro Charm,
 *  Bold Garden). Each preview reproduces the layout's signature
 * structural moves at thumbnail scale — the palette AND the geometry
 * couples will actually see once they apply the theme.
 *
 * Returns `null` for the 8 colour-only themes (romantic, classic,
 * rustic, modern, garden, coastal, boho, luxe) so ThemePicker can
 * fall back to its generic tokens-driven card body.
 *
 * Two size variants:
 *   - variant="card" — used inside the ~200×160 grid tile
 *   - variant="full" — used inside the ~380×460 right-column panel
 *
 * Colours are hard-coded per layout (matching the layout files'
 * internal palette constants) rather than pulled from tokens.ts,
 * because the layouts themselves use hard-coded palettes for anything
 * beyond the shared token shape (e.g. Frosted's gold, Bold Garden's
 * sage). Keeping preview colours in one place per layout is the
 * simplest way to keep them in sync.
 */
import type { WeddingTheme } from "@/lib/wedding-website";

const DEFAULT_NAMES  = "Charlotte & Francis";
const DEFAULT_DATE   = "Sep 12, 2026";
const DEFAULT_PLACE  = "Niagara";

type Variant = "card" | "full";
type CommonProps = { variant: Variant; names: string; date: string; place: string };

export function ThemeLayoutPreview({
  theme,
  variant,
  names = DEFAULT_NAMES,
  date  = DEFAULT_DATE,
  place = DEFAULT_PLACE,
}: {
  theme:   WeddingTheme;
  variant: Variant;
  names?:  string;
  date?:   string;
  place?:  string;
}) {
  const p: CommonProps = { variant, names, date, place };
  switch (theme) {
    case "terracotta":  return <TerracottaPreview  {...p} />;
    case "frosted":     return <FrostedPreview     {...p} />;
    case "editorial":   return <EditorialPreview   {...p} />;
    case "minimal":     return <MinimalPreview     {...p} />;
    case "retro":       return <RetroPreview       {...p} />;
    case "bold-garden": return <BoldGardenPreview  {...p} />;
    default:            return null;   /* colour-only themes → caller fallback */
  }
}

/* ─── Terracotta — warm wash hero + pill badges + botanical divider ── */
function TerracottaPreview({ variant, names, date, place }: CommonProps) {
  const s = sizes(variant);
  return (
    <div className="relative h-full w-full overflow-hidden"
         style={{ background: "linear-gradient(160deg, #C17A56 0%, #E9B392 60%, #F2EBE0 100%)" }}>
      <div className="flex h-full w-full flex-col items-center justify-center px-3 text-center">
        <div className="text-[0.5rem] font-medium uppercase tracking-[0.32em]"
             style={{ color: "rgba(250,246,240,0.9)", fontSize: s.eyebrow }}>
          The Wedding Of
        </div>
        <div className="mt-1.5 italic leading-[1.02]"
             style={{
               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
               color: "#FFFFFF",
               fontSize: s.title,
               textShadow: "0 2px 12px rgba(61,43,31,0.35)",
             }}>
          {names}
        </div>
        {/* Pill row — the Terracotta hero tell */}
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          <Pill fs={s.pill} bg="rgba(61,43,31,0.22)" fg="#FAF6F0">{date}</Pill>
          <Pill fs={s.pill} bg="rgba(61,43,31,0.22)" fg="#FAF6F0">{place}</Pill>
        </div>
        {variant === "full" && (
          <div className="mt-3 rounded-full border-2 px-4 py-1 text-[0.6rem] font-bold uppercase tracking-[0.28em]"
               style={{ borderColor: "rgba(250,246,240,0.9)", color: "#FAF6F0" }}>
            RSVP
          </div>
        )}
      </div>
      {/* Botanical divider — bottom edge */}
      {variant === "full" && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          <BotanicalDivider tint="#FAF6F0" />
        </div>
      )}
    </div>
  );
}

/* ─── Frosted Glass — dark navy + centered blurred glass panel ────── */
function FrostedPreview({ variant, names, date }: CommonProps) {
  const s = sizes(variant);
  return (
    <div className="relative h-full w-full overflow-hidden"
         style={{
           background:
             "radial-gradient(circle at 30% 30%, rgba(201,169,110,0.18) 0%, #1A1F2E 55%), linear-gradient(180deg, #1A1F2E 0%, #242938 100%)",
         }}>
      {/* Centered frosted glass rectangle */}
      <div className="absolute inset-x-4 inset-y-3 flex items-center justify-center">
        <div
          className="w-full rounded-sm px-3 py-3 text-center"
          style={{
            background: "rgba(255,255,255,0.11)",
            border:     "1px solid rgba(255,255,255,0.16)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow:  "0 10px 30px -12px rgba(0,0,0,0.5)",
          }}
        >
          <div className="text-[0.5rem] font-medium uppercase tracking-[0.32em]"
               style={{ color: "#C9A96E", fontSize: s.eyebrow }}>
            The Wedding Of
          </div>
          <div className="mt-1 italic leading-[1.02]"
               style={{
                 fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                 color: "#F0F4F8",
                 fontSize: s.title,
               }}>
            {names}
          </div>
          <div aria-hidden className="mx-auto mt-1.5 h-px w-8" style={{ background: "#C9A96E" }} />
          <div className="mt-1.5 text-[0.5rem] font-medium uppercase tracking-[0.28em]"
               style={{ color: "#94A3B8", fontSize: s.tiny }}>
            {date}
          </div>
          {variant === "full" && (
            <div className="mt-2 flex justify-center gap-1">
              {["07","14","32"].map((v, i) => (
                <div key={i} className="rounded-sm px-2 py-1"
                     style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)" }}>
                  <div className="text-[0.65rem] font-bold" style={{ color: "#F0F4F8" }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Editorial — 50/50 split (photo left, dark panel right) ──────── */
function EditorialPreview({ variant, names, date }: CommonProps) {
  const s = sizes(variant);
  return (
    <div className="grid h-full w-full grid-cols-2">
      {/* Left — photo-like gradient */}
      <div className="relative overflow-hidden"
           style={{ background: "linear-gradient(160deg, #E8DDD0 0%, #C9B49E 100%)" }}>
        <div className="absolute left-1.5 top-1.5 text-[0.42rem] font-medium uppercase tracking-[0.36em]"
             style={{ color: "#FAFAFA", mixBlendMode: "difference" }}>
          Vol. I
        </div>
      </div>
      {/* Right — dark panel */}
      <div className="flex flex-col justify-center px-3 py-3"
           style={{ background: "#1A1A1A", color: "#FAFAFA" }}>
        <div className="text-[0.5rem] font-medium uppercase tracking-[0.36em]"
             style={{ color: "#B96476", fontSize: s.eyebrow }}>
          The Wedding Of
        </div>
        <div className="mt-1.5 leading-[0.95]"
             style={{
               fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
               fontWeight: 700,
               color: "#FAFAFA",
               fontSize: s.title,
               letterSpacing: "-0.02em",
             }}>
          {names}
        </div>
        <div aria-hidden className="mt-2 h-[2px] w-6" style={{ background: "#B96476" }} />
        <div className="mt-2 text-[0.5rem] font-medium uppercase tracking-[0.4em]"
             style={{ color: "#FAFAFA", fontSize: s.tiny }}>
          {date.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

/* ─── Minimal Romantic — narrow sidebar + main scrolling area ─────── */
function MinimalPreview({ variant, names, date }: CommonProps) {
  const s = sizes(variant);
  return (
    <div className="grid h-full w-full"
         style={{ gridTemplateColumns: "38% 62%", background: "#FBF3F3" }}>
      {/* Sidebar */}
      <aside className="flex flex-col justify-between border-r px-2 py-3"
             style={{ borderColor: "#E8D8D8" }}>
        <div>
          <div className="text-[0.45rem] font-medium uppercase tracking-[0.32em]"
               style={{ color: "#D4A0A0", fontSize: s.eyebrow }}>
            Wedding Of
          </div>
          <div className="mt-1 italic leading-[1.05]"
               style={{
                 fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                 color: "#1A1A1A",
                 fontSize: s.title,
               }}>
            {names}
          </div>
          <div aria-hidden className="mt-1.5 h-px w-4" style={{ background: "#D4A0A0", opacity: 0.7 }} />
          <div className="mt-1.5 text-[0.5rem] uppercase tracking-[0.32em]"
               style={{ color: "#6B6B6B", fontSize: s.tiny }}>
            {date}
          </div>
          {variant === "full" && (
            <ul className="mt-3 space-y-1">
              {["The Day","RSVP","Our Story","Travel"].map((label) => (
                <li key={label} className="text-[0.5rem] uppercase tracking-[0.28em]"
                    style={{ color: "#6B6B6B" }}>
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
      {/* Main — full-bleed photo */}
      <div style={{ background: "linear-gradient(160deg, #F2DCDC 0%, #FBF3F3 55%, #F5F5F3 100%)" }}>
        {/* Intentionally empty — the layout hero is photo-only, names live in sidebar */}
      </div>
    </div>
  );
}

/* ─── Retro Charm — cream bg + double gold frame + corner flourishes */
function RetroPreview({ variant, names, date }: CommonProps) {
  const s = sizes(variant);
  return (
    <div className="relative flex h-full w-full items-center justify-center"
         style={{ background: "#FDF8F0" }}>
      <div
        className="relative w-[92%] px-2 py-3 text-center"
        style={{
          background: "#FEFCF8",
          outline:    "1px solid #D8C9A0",
          boxShadow:  "inset 0 0 0 3px #FEFCF8, inset 0 0 0 4px #D8C9A0",
        }}
      >
        {(["tl","tr","bl","br"] as const).map((pos) => <CornerFlourish key={pos} position={pos} />)}

        <div className="text-[0.48rem] font-medium uppercase tracking-[0.42em]"
             style={{
               color: "#6B1F2A",
               fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
               fontSize: s.eyebrow,
             }}>
          The Marriage Of
        </div>
        <div className="mt-1 italic leading-[1.04]"
             style={{
               fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
               color: "#2E1216",
               fontSize: s.title,
             }}>
          {names}
        </div>
        <div className="mx-auto mt-1.5 flex items-center justify-center gap-1">
          <span className="h-px w-4" style={{ background: "#D8C9A0" }} />
          <svg viewBox="0 0 12 12" width="6" height="6" fill="#6B1F2A"><polygon points="6,0 12,6 6,12 0,6" /></svg>
          <span className="h-px w-4" style={{ background: "#D8C9A0" }} />
        </div>
        <div className="mt-1 text-[0.5rem] uppercase tracking-[0.32em]"
             style={{
               color: "#2E1216",
               fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
               fontSize: s.tiny,
             }}>
          {date.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

/* ─── Bold Garden — split hero (sage photo + pink panel) + tiny band  */
function BoldGardenPreview({ variant, names }: CommonProps) {
  const s = sizes(variant);
  return (
    <div className="flex h-full w-full flex-col">
      {/* Top: split hero */}
      <div className="grid flex-1 grid-cols-2">
        <div style={{
          background: "linear-gradient(160deg, #A8B89A 0%, #7C9A7E 100%)",
          filter:     "saturate(0.9)",
        }} />
        <div className="flex flex-col items-center justify-center px-2 py-2 text-center"
             style={{ background: "#D4789A", color: "#FFFFFF" }}>
          <div className="text-[0.45rem] font-medium uppercase tracking-[0.32em]"
               style={{ fontSize: s.eyebrow, opacity: 0.9 }}>
            Wedding Of
          </div>
          <div className="mt-1 italic leading-[0.98]"
               style={{
                 fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                 fontSize: s.title,
               }}>
            {names}
          </div>
          <div aria-hidden className="mt-1.5 h-1 w-6" style={{ background: "#7C9A7E" }} />
        </div>
      </div>
      {/* Bottom band: shows alternating stripe logic — SplitTitle two-tone */}
      {variant === "full" && (
        <div className="flex-shrink-0 px-3 py-2 text-center" style={{ background: "#7C9A7E", color: "#FFFFFF" }}>
          <span className="italic"
                style={{
                  fontFamily: "var(--font-display), 'Cormorant Garamond', Georgia, serif",
                  fontSize: s.tiny,
                }}>
            <span>Say </span>
            <span style={{ color: "#F4D4DF" }}>yes.</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Small helpers ─────────────────────────────────────────────── */

function Pill({ children, bg, fg, fs }: {
  children: React.ReactNode; bg: string; fg: string; fs: string;
}) {
  return (
    <span className="rounded-full border px-2 py-[1px] font-medium uppercase tracking-[0.14em]"
          style={{
            borderColor: "rgba(250,246,240,0.5)",
            background:  bg,
            color:       fg,
            fontSize:    fs,
            backdropFilter: "blur(4px)",
          }}>
      {children}
    </span>
  );
}

function BotanicalDivider({ tint }: { tint: string }) {
  return (
    <svg viewBox="0 0 120 12" width="80" height="8"
         fill="none" stroke={tint} strokeWidth="0.8"
         strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="110" y2="6" />
      <circle cx="60" cy="6" r="1.2" fill={tint} />
      <path d="M45 6 Q42 4 39 5 Q42 7 45 6" />
      <path d="M35 6 Q32 4 29 5 Q32 7 35 6" />
      <path d="M75 6 Q78 4 81 5 Q78 7 75 6" />
      <path d="M85 6 Q88 4 91 5 Q88 7 85 6" />
    </svg>
  );
}

function CornerFlourish({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const cls = {
    tl: "left-1 top-1",
    tr: "right-1 top-1 -scale-x-100",
    bl: "left-1 bottom-1 -scale-y-100",
    br: "right-1 bottom-1 -scale-x-100 -scale-y-100",
  }[position];
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="10" height="10"
         className={`pointer-events-none absolute ${cls}`}
         fill="none" stroke="#D8C9A0" strokeWidth="1.4"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20 L4 8 Q4 4 8 4 L20 4" />
    </svg>
  );
}

/* Sizes for the two variants. Kept as an object so per-preview
 * font-size math is centralised — swap once, whole file updates. */
function sizes(variant: Variant) {
  if (variant === "full") {
    return { eyebrow: "0.6rem", title: "1.3rem", pill: "0.55rem", tiny: "0.55rem" };
  }
  return   { eyebrow: "0.5rem", title: "0.85rem", pill: "0.5rem",  tiny: "0.5rem"  };
}
