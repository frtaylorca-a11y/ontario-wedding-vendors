"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StylePicker } from "./StylePicker";
import { PremiumUpgradeModal } from "./PremiumUpgradeModal";
import { getThemeTokens } from "@/lib/wedding-themes";
import type { WeddingTheme } from "@/lib/wedding-website";

/* Wizard for /plan/website — shown ONLY when the couple hasn't
 * published AND hasn't completed the wizard before. Three steps:
 *
 *   1. Pick a style       (StylePicker — 6 screenshot cards)
 *   2. Tell your story    (rawStory textarea + Generate)
 *   3. Hero photo         (upload | default | skip) + Publish
 *
 * After step 3 the row's wedding_published flips to true and the page
 * server-component re-renders into the existing full editor for any
 * future fine-tuning. wizardCompleted=true is set on the boundary
 * between step 2 and 3 so a couple who bails post-generation doesn't
 * see the wizard again — their generated copy is already saved and
 * they should land in the advanced editor on return.
 */

type WizardState = {
  sessionId:              string;
  partner1Name:           string;
  partner2Name:           string;
  venueLabel:             string | null;
  weddingSiteSlug:        string | null;
  weddingSiteDomain:      string | null;
  weddingTheme:           WeddingTheme;
  weddingHeroImage:       string;
  rawStory:               string;
  tier:                   "free" | "premium";
  weddingGenerationCount: number;
};

const FREE_GENERATION_LIMIT = 3;
type UpgradeReason = "generation-limit" | "premium-theme" | "premium-palette";

export function WebsiteWizard({ initial }: { initial: WizardState }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [state, setState] = useState<WizardState>(initial);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const persist = useCallback(async (patch: Record<string, unknown>) => {
    try {
      await fetch("/api/plan/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(patch),
      });
    } catch (err) {
      console.error("[website-wizard] save failed", err);
    }
  }, []);

  /* ── Step 1 ────────────────────────────────────────────────────── */

  function pickStyle(theme: WeddingTheme) {
    setState((p) => ({ ...p, weddingTheme: theme }));
    persist({ weddingTheme: theme });
    setStep(2);
  }
  function handleLockedTheme(theme: WeddingTheme) {
    if (state.tier === "premium") {
      pickStyle(theme);
      return;
    }
    setUpgradeReason("premium-theme");
  }

  /* ── Step 2 ────────────────────────────────────────────────────── */

  async function generate() {
    if (state.tier !== "premium" && state.weddingGenerationCount >= FREE_GENERATION_LIMIT) {
      setUpgradeReason("generation-limit");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      /* Stash the seed paragraph first — the generate route reads it
       * directly from the row, not from this POST body. */
      await persist({ rawStory: state.rawStory || null });
      const res = await fetch("/api/wedding-website/generate", { method: "POST" });
      if (res.status === 402) {
        setUpgradeReason("generation-limit");
        return;
      }
      if (!res.ok) throw new Error(`generate ${res.status}`);
      /* Bump the local counter so the limit check above stays in
       * sync with the row without a second fetch. */
      setState((p) => ({ ...p, weddingGenerationCount: p.weddingGenerationCount + 1 }));
      /* Mark wizard complete on the boundary into step 3 — see the
       * commentary at the top of the file. */
      await persist({ wizardCompleted: true });
      setStep(3);
    } catch (err) {
      console.error("[website-wizard] generate failed", err);
      setGenerateError("Couldn't generate copy — try again in a moment.");
    } finally {
      setGenerating(false);
    }
  }

  /* ── Step 3 ────────────────────────────────────────────────────── */

  async function setHeroImage(url: string) {
    setState((p) => ({ ...p, weddingHeroImage: url }));
    await persist({ weddingHeroImage: url || null });
  }

  async function publish() {
    await persist({ weddingPublished: true });
    /* Server-component re-render swaps the wizard out for the editor. */
    router.refresh();
  }

  async function skipPublish() {
    /* Same as publish but without the published flag — couple gets
     * the editor to keep tweaking before flipping it live. */
    router.refresh();
  }

  /* ── Render ────────────────────────────────────────────────────── */

  const tokens = useMemo(() => getThemeTokens(state.weddingTheme), [state.weddingTheme]);

  return (
    <div className="space-y-6">
      <PremiumUpgradeModal
        reason={upgradeReason}
        onClose={() => setUpgradeReason(null)}
        onUpgraded={() => setState((p) => ({ ...p, tier: "premium" }))}
      />

      <ProgressBar step={step} />

      {step === 1 && (
        <WizardCard>
          <StylePicker
            applied={state.weddingTheme}
            tier={state.tier}
            onApply={pickStyle}
            onLockedClick={handleLockedTheme}
            onBrowseAll={() => {
              /* Drop into the full editor's all-themes picker. We mark
               * wizardCompleted=true so a return visit goes straight
               * there — the couple has signalled they want the
               * advanced view. */
              persist({ wizardCompleted: true }).then(() => router.refresh());
            }}
          />
        </WizardCard>
      )}

      {step === 2 && (
        <WizardCard>
          <StoryStep
            value={state.rawStory}
            onChange={(v) => setState((p) => ({ ...p, rawStory: v }))}
            onGenerate={generate}
            onBack={() => setStep(1)}
            generating={generating}
            tier={state.tier}
            used={state.weddingGenerationCount}
            limit={FREE_GENERATION_LIMIT}
            onUpgradeClick={() => setUpgradeReason("generation-limit")}
            errorMsg={generateError}
          />
        </WizardCard>
      )}

      {step === 3 && (
        <WizardCard>
          <PhotoStep
            slug={state.weddingSiteSlug}
            heroImage={state.weddingHeroImage}
            tokens={tokens}
            onPickUrl={setHeroImage}
            onPublish={publish}
            onSkipPublish={skipPublish}
            onBack={() => setStep(2)}
          />
        </WizardCard>
      )}
    </div>
  );
}

/* ─── Wizard chrome ───────────────────────────────────────────────── */

function WizardCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-white p-6 lg:p-8">
      {children}
    </section>
  );
}

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const STEPS: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "Style"   },
    { n: 2, label: "Story"   },
    { n: 3, label: "Publish" },
  ];
  return (
    <ol className="flex items-center justify-between gap-2 rounded-card border border-border bg-white px-5 py-3 text-xs sm:gap-4 sm:px-6 sm:text-sm">
      {STEPS.map((s, i) => {
        const isDone   = s.n < step;
        const isActive = s.n === step;
        return (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-bold ${
                isDone
                  ? "bg-emerald-500 text-white"
                  : isActive
                  ? "bg-rose text-white"
                  : "bg-bg-soft text-text-muted"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              {isDone ? (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current"
                     strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                s.n
              )}
            </span>
            <span
              className={`hidden font-bold uppercase tracking-[0.12em] sm:inline ${
                isActive ? "text-charcoal" : "text-text-muted"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`ml-1 hidden h-px flex-1 sm:block ${isDone ? "bg-emerald-300" : "bg-border"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ─── Step 2 ─────────────────────────────────────────────────────── */

function StoryStep({
  value, onChange, onGenerate, onBack, generating, tier, used, limit, onUpgradeClick, errorMsg,
}: {
  value:          string;
  onChange:       (s: string) => void;
  onGenerate:     () => void;
  onBack:         () => void;
  generating:     boolean;
  tier:           "free" | "premium";
  used:           number;
  limit:          number;
  onUpgradeClick: () => void;
  errorMsg:       string | null;
}) {
  const MAX = 500;
  const remaining = Math.max(0, limit - used);
  const outOfGenerations = tier === "free" && remaining === 0;

  return (
    <div>
      <div className="mb-6 text-center sm:text-left">
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-rose">
          Step 2 of 3
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-charcoal sm:text-3xl">
          Tell us your story{" "}
          <span className="text-base font-normal italic text-text-muted">
            (optional)
          </span>
        </h2>
        <p className="mt-2 text-sm text-text-mid">
          AI will turn this into beautiful website copy — &ldquo;Our Story&rdquo;,
          travel notes, dress-code hint, things to do, and FAQ.
        </p>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX))}
        rows={5}
        maxLength={MAX}
        placeholder="We met on a Wednesday-night architecture studio in 2019. The proposal was at the end of a wine tour, exactly five years later…"
        className="w-full rounded-card border border-border bg-white px-4 py-3 text-base leading-relaxed focus:border-rose focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between text-[0.65rem] text-text-muted">
        <span>{value.length}/{MAX} characters</span>
        {tier === "premium" ? (
          <span className="font-bold uppercase tracking-[0.16em] text-emerald-700">
            ✓ Unlimited generations
          </span>
        ) : (
          <span
            className={`font-bold uppercase tracking-[0.16em] ${
              remaining === 0 ? "text-rose" : remaining === 1 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {remaining} {remaining === 1 ? "generation" : "generations"} remaining
          </span>
        )}
      </div>

      {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-pill border border-border bg-white px-4 py-2 text-sm font-bold text-charcoal hover:border-rose hover:text-rose"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={outOfGenerations ? onUpgradeClick : onGenerate}
          disabled={generating}
          className="rounded-pill bg-rose px-6 py-3 text-base font-bold text-white shadow-[0_8px_24px_rgba(185,100,118,0.32)] transition-all hover:bg-rose-hover disabled:opacity-60"
        >
          {generating
            ? "Generating…"
            : outOfGenerations
            ? "🔒 Upgrade to keep generating →"
            : "Generate my website →"}
        </button>
      </div>
      <p className="mt-3 text-center text-[0.7rem] text-text-muted">
        Generation takes ~15 seconds. You can edit anything afterwards.
      </p>
    </div>
  );
}

/* ─── Step 3 ─────────────────────────────────────────────────────── */

type ThemeTokens = ReturnType<typeof getThemeTokens>;

function PhotoStep({
  slug, heroImage, tokens, onPickUrl, onPublish, onSkipPublish, onBack,
}: {
  slug:          string | null;
  heroImage:     string;
  tokens:        ThemeTokens;
  onPickUrl:     (url: string) => void;
  onPublish:     () => void;
  onSkipPublish: () => void;
  onBack:        () => void;
}) {
  const [mode, setMode] = useState<"upload" | "default" | "skip">(
    heroImage ? "upload" : "skip",
  );

  return (
    <div>
      <div className="mb-6 text-center sm:text-left">
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-rose">
          Step 3 of 3
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-charcoal sm:text-3xl">
          Pick a hero photo
        </h2>
        <p className="mt-2 text-sm text-text-mid">
          The big image at the top of your site. You can change it any time
          from the editor.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ModeCard
          title="Upload your own"
          description="JPG, PNG, or WebP. Max 8 MB."
          active={mode === "upload"}
          onClick={() => setMode("upload")}
        />
        <ModeCard
          title="Pick a default"
          description="20 curated hero images."
          active={mode === "default"}
          onClick={() => setMode("default")}
        />
        <ModeCard
          title="Skip for now"
          description="Use a gradient based on your style."
          active={mode === "skip"}
          onClick={() => { setMode("skip"); onPickUrl(""); }}
        />
      </div>

      <div className="mt-6">
        {mode === "upload"  && <UploadPanel slug={slug} onUploaded={onPickUrl} heroImage={heroImage} />}
        {mode === "default" && <DefaultHeroGrid onPick={onPickUrl} current={heroImage} />}
        {mode === "skip"    && <GradientPreview tokens={tokens} />}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-pill border border-border bg-white px-4 py-2 text-sm font-bold text-charcoal hover:border-rose hover:text-rose"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkipPublish}
            className="rounded-pill border border-border bg-white px-4 py-2 text-sm font-bold text-charcoal hover:border-rose hover:text-rose"
          >
            Edit sections first
          </button>
          <button
            type="button"
            onClick={onPublish}
            className="rounded-pill bg-rose px-6 py-3 text-base font-bold text-white shadow-[0_8px_24px_rgba(185,100,118,0.32)] transition-all hover:bg-rose-hover"
          >
            Publish website →
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  title, description, active, onClick,
}: {
  title:       string;
  description: string;
  active:      boolean;
  onClick:     () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group rounded-card border-2 bg-white p-5 text-left transition-all ${
        active
          ? "border-rose shadow-[0_8px_24px_rgba(185,100,118,0.18)]"
          : "border-border hover:border-rose/70 hover:shadow-md"
      }`}
    >
      <div className="font-display text-lg font-semibold text-charcoal">{title}</div>
      <p className="mt-1 text-sm text-text-mid">{description}</p>
    </button>
  );
}

function UploadPanel({
  slug, heroImage, onUploaded,
}: {
  slug:        string | null;
  heroImage:   string;
  onUploaded:  (url: string) => void;
}) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/wedding-website/upload-hero", {
        method: "POST",
        body:   fd,
      });
      const body = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? `upload ${res.status}`);
      }
      onUploaded(body.url);
    } catch (err) {
      console.error("[upload-hero] failed", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (!slug) {
    return (
      <p className="rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Your wedding URL hasn&rsquo;t been minted yet. Add a venue + your
        names in the planner tab — your URL gets minted automatically and
        you can come back here to upload.
      </p>
    );
  }

  return (
    <div>
      <label className="block">
        <span className="sr-only">Upload hero photo</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          disabled={busy}
          className="block w-full cursor-pointer rounded-card border-2 border-dashed border-border bg-white p-6 text-sm text-text-mid file:mr-4 file:rounded-pill file:border-0 file:bg-rose file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:border-rose"
        />
      </label>
      {busy  && <p className="mt-2 text-sm text-text-mid">Uploading…</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {heroImage && !busy && (
        <div className="mt-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-emerald-700">
            ✓ Uploaded
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt="Hero preview"
            className="mt-2 aspect-[16/9] w-full rounded-card object-cover"
          />
        </div>
      )}
    </div>
  );
}

function DefaultHeroGrid({
  onPick, current,
}: {
  onPick:  (url: string) => void;
  current: string;
}) {
  /* Stub grid — placeholder gradient tiles for now, real images get
   * dropped into /public/images/wedding-heroes/[1..20].jpg later and
   * picked up automatically. */
  const HEROES = Array.from({ length: 20 }, (_, i) => i + 1);
  return (
    <div>
      <p className="mb-3 text-xs italic text-text-muted">
        Pick one — real curated images are coming. Today these are
        placeholder tiles so the flow works.
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {HEROES.map((n) => {
          const url = `/images/wedding-heroes/${n}.jpg`;
          const isPicked = current === url;
          /* Deterministic per-tile gradient so the grid reads as
           * distinct cards even before real photography ships. */
          const hue = (n * 37) % 360;
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => onPick(url)}
                aria-pressed={isPicked}
                className={`group block aspect-[16/9] w-full overflow-hidden rounded-card border-2 transition-all ${
                  isPicked ? "border-rose shadow-md" : "border-border hover:border-rose/70"
                }`}
                style={{
                  background: `linear-gradient(135deg, hsl(${hue}, 45%, 78%) 0%, hsl(${(hue + 40) % 360}, 60%, 88%) 100%)`,
                }}
              >
                <span className="sr-only">Hero {n}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GradientPreview({ tokens }: { tokens: ThemeTokens }) {
  return (
    <div
      className="flex aspect-[16/9] w-full items-center justify-center rounded-card"
      style={{
        background: `linear-gradient(135deg, ${tokens.accent} 0%, ${tokens.accentSoft} 50%, ${tokens.pageBg} 100%)`,
      }}
    >
      <span
        className="px-6 text-3xl"
        style={{
          fontFamily: tokens.fontDisplay,
          fontStyle:  tokens.displayItalic,
          color:      tokens.accentInk,
          textShadow: "0 2px 12px rgba(0,0,0,0.2)",
        }}
      >
        Your wedding hero
      </span>
    </div>
  );
}
