"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PAGE_CONFIG,
  DRESS_CODE_STYLES,
  EVENT_AUDIENCE_LABELS,
  SECTION_ORDER,
  newId,
  type GeneratedCopy,
  type MultipleEvent,
  type RegistryLink,
  type ThingsToDoItem,
  type WeddingPageConfig,
  type WeddingPartyMember,
  type WeddingTheme,
} from "@/lib/wedding-website";
import { defaultThingsToDo } from "@/lib/things-to-do";
import { ThemePicker } from "./ThemePicker";
import { PalettePicker } from "./PalettePicker";
import { TypographyPicker } from "./TypographyPicker";
import { PremiumUpgradeModal } from "./PremiumUpgradeModal";
import { StylePicker } from "./StylePicker";
import { RegisterGate } from "@/components/auth/RegisterGate";
import type { WeddingPalette } from "@/lib/wedding-palettes";
import type { TypographyStyle } from "@/lib/wedding-typography";

type EditorState = {
  sessionId:              string;
  partner1Name:           string;
  partner2Name:           string;
  weddingDate:            string | null;
  venueLabel:             string | null;
  weddingSiteSlug:        string | null;
  weddingSiteDomain:      string | null;
  weddingTheme:           WeddingTheme;
  weddingPublished:       boolean;
  weddingHeroImage:       string;
  weddingHashtag:         string;
  weddingPassword:        string;
  weddingSiteShowVendors: boolean;
  weddingPageConfig:      WeddingPageConfig;
  ourStory:               string;
  travelCopy:             string;
  dressCodeStyle:         string;
  dressCodeDescription:   string;
  dressCodeImageUrl:      string;
  weddingParty:           WeddingPartyMember[];
  weddingRegistry:        RegistryLink[];
  thingsToDo:             ThingsToDoItem[];
  multipleEvents:         MultipleEvent[];
  photoGalleryUrls:       string[];
  weddingGeneratedCopy:   GeneratedCopy | null;
  region:                 string | null;
  /* Custom palette + typography */
  customColorPrimary:     string | null;
  customColorAccent:      string | null;
  customColorBg:          string | null;
  customColorText:        string | null;
  customPaletteId:        string | null;
  weddingTypographyStyle: string | null;
  /* Premium + AI generation tracking */
  tier:                   "free" | "premium";
  weddingGenerationCount: number;
};

const FREE_GENERATION_LIMIT = 3;
type UpgradeReason = "generation-limit" | "premium-theme" | "premium-palette";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 600;

export function WebsiteEditor({ initial }: { initial: EditorState }) {
  const [state, setState] = useState<EditorState>(initial);
  const [openSection, setOpenSection] = useState<keyof WeddingPageConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);

  /* ── Debounced autosave ────────────────────────────────────────── */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (next: EditorState) => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/plan/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingTheme:           next.weddingTheme,
          weddingPublished:       next.weddingPublished,
          weddingHeroImage:       next.weddingHeroImage || null,
          weddingHashtag:         next.weddingHashtag || null,
          weddingPassword:        next.weddingPassword || null,
          weddingSiteShowVendors: next.weddingSiteShowVendors,
          weddingPageConfig:      next.weddingPageConfig,
          ourStory:               next.ourStory || null,
          travelCopy:             next.travelCopy || null,
          dressCodeStyle:         next.dressCodeStyle || null,
          dressCodeDescription:   next.dressCodeDescription || null,
          dressCodeImageUrl:      next.dressCodeImageUrl || null,
          weddingParty:           next.weddingParty,
          weddingRegistry:        next.weddingRegistry,
          thingsToDo:             next.thingsToDo,
          multipleEvents:         next.multipleEvents,
          photoGalleryUrls:       next.photoGalleryUrls,
          customColorPrimary:     next.customColorPrimary,
          customColorAccent:      next.customColorAccent,
          customColorBg:          next.customColorBg,
          customColorText:        next.customColorText,
          customPaletteId:        next.customPaletteId,
          weddingTypographyStyle: next.weddingTypographyStyle,
        }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 1500);
    } catch (err) {
      console.error("[website-editor] save failed", err);
      setSaveStatus("error");
    }
  }, []);

  const update = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next), SAVE_DEBOUNCE_MS);
      return next;
    });
  }, [persist]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  /* ── Helpers for section visibility ───────────────────────────── */

  const toggleSection = (key: keyof WeddingPageConfig) => {
    /* hero + eventDetails are pinned on. */
    if (key === "hero" || key === "eventDetails") return;
    const cfg = { ...state.weddingPageConfig, [key]: !state.weddingPageConfig[key] } as WeddingPageConfig;
    update({ weddingPageConfig: cfg });
    /* If a section was just turned on and is empty, seed it. */
    if (cfg[key]) seedSection(key);
  };

  const seedSection = (key: keyof WeddingPageConfig) => {
    if (key === "thingsToDo" && state.thingsToDo.length === 0) {
      update({ thingsToDo: defaultThingsToDo(state.region) });
    }
  };

  /* ── AI copy generation ───────────────────────────────────────── */

  async function generateCopy() {
    /* Client-side pre-check — quick UX feedback. The server enforces
     * the same limit regardless. */
    if (state.tier !== "premium" && state.weddingGenerationCount >= FREE_GENERATION_LIMIT) {
      setUpgradeReason("generation-limit");
      return;
    }

    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/wedding-website/generate", { method: "POST" });
      if (res.status === 402) {
        setUpgradeReason("generation-limit");
        return;
      }
      if (!res.ok) throw new Error(`generate ${res.status}`);
      const body = (await res.json()) as { generated: GeneratedCopy; remaining: number | null; tier: string };
      const g = body.generated ?? {};
      const next: EditorState = {
        ...state,
        weddingGeneratedCopy: g,
        /* Apply suggestions only into fields the couple hasn't filled in. */
        ourStory:              state.ourStory             || g.ourStory      || state.ourStory,
        travelCopy:            state.travelCopy           || g.travelCopy    || state.travelCopy,
        dressCodeDescription:  state.dressCodeDescription || g.dressCopyHint || state.dressCodeDescription,
        thingsToDo:            state.thingsToDo.length > 0 ? state.thingsToDo : (g.thingsToDo ?? []),
        weddingGenerationCount: state.weddingGenerationCount + 1,
      };
      setState(next);
      persist(next);
    } catch (err) {
      console.error("[website-editor] generate failed", err);
      setGenerateError("Couldn't generate copy — try again in a moment.");
    } finally {
      setGenerating(false);
    }
  }

  /* ── Palette + typography apply ───────────────────────────────── */

  function applyPalette(p: WeddingPalette) {
    update({
      weddingTheme:       "custom",
      customColorPrimary: p.primary,
      customColorAccent:  p.accent,
      customColorBg:      p.bg,
      customColorText:    p.text,
      customPaletteId:    p.id,
    });
  }

  function applyTypography(t: TypographyStyle) {
    update({ weddingTypographyStyle: t.id });
  }

  /* ── Premium upgrade handler ──────────────────────────────────── */

  function handleUpgraded() {
    /* Server already updated; just reflect locally so locks lift. */
    setState((prev) => ({ ...prev, tier: "premium" }));
  }

  function handleLockedTheme(theme: WeddingTheme) {
    if (state.tier === "premium") {
      update({ weddingTheme: theme });
      return;
    }
    setUpgradeReason("premium-theme");
  }

  /* ── Section content updaters ─────────────────────────────────── */

  const addPartyMember = () => update({
    weddingParty: [...state.weddingParty, { id: newId(), name: "", role: "Bridesmaid" }],
  });
  const updatePartyMember = (id: string, patch: Partial<WeddingPartyMember>) => update({
    weddingParty: state.weddingParty.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  });
  const removePartyMember = (id: string) => update({
    weddingParty: state.weddingParty.filter((m) => m.id !== id),
  });

  const addRegistry = () => update({
    weddingRegistry: [...state.weddingRegistry, { id: newId(), label: "", url: "" }],
  });
  const updateRegistry = (id: string, patch: Partial<RegistryLink>) => update({
    weddingRegistry: state.weddingRegistry.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  });
  const removeRegistry = (id: string) => update({
    weddingRegistry: state.weddingRegistry.filter((r) => r.id !== id),
  });

  const addThing = () => update({
    thingsToDo: [...state.thingsToDo, { id: newId(), name: "", description: "" }],
  });
  const updateThing = (id: string, patch: Partial<ThingsToDoItem>) => update({
    thingsToDo: state.thingsToDo.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  });
  const removeThing = (id: string) => update({
    thingsToDo: state.thingsToDo.filter((t) => t.id !== id),
  });

  const addEvent = () => update({
    multipleEvents: [...state.multipleEvents, { id: newId(), name: "", audience: "everyone" }],
  });
  const updateEvent = (id: string, patch: Partial<MultipleEvent>) => update({
    multipleEvents: state.multipleEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  });
  const removeEvent = (id: string) => update({
    multipleEvents: state.multipleEvents.filter((e) => e.id !== id),
  });

  /* ── Public URL preview ───────────────────────────────────────── */

  const publicUrl = useMemo(() => {
    if (!state.weddingSiteSlug || !state.weddingSiteDomain) return null;
    return `https://${state.weddingSiteSlug}.${state.weddingSiteDomain}`;
  }, [state.weddingSiteSlug, state.weddingSiteDomain]);

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Upgrade modal — global, rendered above the editor */}
      <PremiumUpgradeModal
        reason={upgradeReason}
        onClose={() => setUpgradeReason(null)}
        onUpgraded={handleUpgraded}
      />

      {/* Sticky publish bar — URL on the left, actions on the right.
       *
       * Sticky to the viewport top so it stays visible while the
       * couple scrolls the (often very long) editor. Includes the
       * SaveIndicator so the user always knows whether their last
       * edit landed. */}
      <PublishBar
        publicUrl={publicUrl}
        slug={state.weddingSiteSlug}
        published={state.weddingPublished}
        saveStatus={saveStatus}
        onPublish={() => update({ weddingPublished: true })}
        onUnpublish={() => update({ weddingPublished: false })}
      />

      {/* Premium-tier badge */}
      <div className="flex items-center justify-between rounded-card border border-border bg-white px-5 py-3 text-sm">
        <div>
          <span className="font-medium text-charcoal">Plan: </span>
          {state.tier === "premium" ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-100 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-emerald-700">
              ✓ Premium
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-bg-soft px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-text-muted">
              Free
            </span>
          )}
        </div>
        {state.tier !== "premium" && (
          <button
            type="button"
            onClick={() => setUpgradeReason("premium-theme")}
            className="text-xs font-bold text-rose hover:underline"
          >
            Upgrade to unlock everything →
          </button>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
       * WIZARD — the first two sections are framed as Step 1 +
       * Step 2 so a first-time couple can generate a full website
       * with just a style pick + a story paragraph. Everything
       * below (palette, typography, sections, detailed pickers) is
       * fine-tuning.
       * ────────────────────────────────────────────────────────── */}

      {/* Step 1 — visual style picker (6 screenshot cards) */}
      <Section eyebrow="Step 1" title="" description="">
        <StylePicker
          applied={state.weddingTheme}
          tier={state.tier}
          onApply={(theme) => update({ weddingTheme: theme })}
          onLockedClick={(theme) => handleLockedTheme(theme)}
          onBrowseAll={() => {
            const el = document.getElementById("theme-picker");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </Section>

      {/* Step 2 — Story + Generate */}
      <Section eyebrow="Step 2" title="" description="">
        <StoryStep
          value={state.ourStory}
          onChange={(v) => update({ ourStory: v })}
          onGenerate={generateCopy}
          generating={generating}
          tier={state.tier}
          used={state.weddingGenerationCount}
          limit={FREE_GENERATION_LIMIT}
          onUpgradeClick={() => setUpgradeReason("generation-limit")}
        />
      </Section>

      {/* Detailed theme picker — all 14 themes with live preview panel */}
      <div id="theme-picker">
        <Section
          title="All themes (detailed)"
          description="Tap a card to preview. The full preview panel on the right shows the theme rendered in its real fonts and colours."
        >
          <ThemePicker
            applied={state.weddingTheme}
            tier={state.tier}
            coupleLabel={
              [state.partner1Name, state.partner2Name].filter(Boolean).join(" & ") || "Charlotte & Francis"
            }
            weddingDateFormatted={
              state.weddingDate
                ? new Date(state.weddingDate).toLocaleDateString("en-CA", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })
                : "Saturday, September 12, 2026"
            }
            venueLine={state.venueLabel}
            onApply={(theme) => update({ weddingTheme: theme })}
            onLockedClick={(theme) => handleLockedTheme(theme)}
          />
        </Section>
      </div>

      {/* Colour palette picker */}
      <Section
        title="Colour palette"
        description="Pick a hand-tuned palette. Applies as a custom theme — the four colours flow into every section of your site."
      >
        <PalettePicker
          activeId={state.customPaletteId}
          isPremium={state.tier === "premium"}
          onApply={applyPalette}
          onLockedClick={() => setUpgradeReason("premium-palette")}
        />
      </Section>

      {/* Typography style chips */}
      <Section
        title="Typography feel"
        description="The tone of your site — and the tone of the AI-generated copy. No font names; just pick the vibe."
      >
        <TypographyPicker
          activeId={state.weddingTypographyStyle}
          previewCoupleLabel={
            [state.partner1Name, state.partner2Name].filter(Boolean).join(" & ") || "Charlotte & Francis"
          }
          previewDateUpper={
            state.weddingDate
              ? new Date(`${state.weddingDate.slice(0,10)}T12:00:00`).toLocaleDateString("en-CA", {
                  year: "numeric", month: "long", day: "numeric",
                }).toUpperCase()
              : "AUGUST 15, 2026"
          }
          onApply={applyTypography}
        />
      </Section>

      {/* Top-of-site basics: hashtag + password + AI generate */}
      <Section
        title="Site basics"
        description="Optional finishing touches and the AI copywriter button."
      >
        <div className="space-y-4">
          <Field label="Wedding hashtag" hint="Shown in the hero + footer.">
            <input
              type="text"
              value={state.weddingHashtag}
              onChange={(e) => update({ weddingHashtag: e.target.value })}
              placeholder="#CharlotteAndFrancis2026"
              className="w-full rounded-pill border border-border bg-white px-4 py-2 text-sm placeholder:text-text-muted focus:border-rose focus:outline-none"
            />
          </Field>

          <Field label="Password protect my website" hint="Optional. Guests enter this before seeing the site. Leave empty for public.">
            <input
              type="text"
              value={state.weddingPassword}
              onChange={(e) => update({ weddingPassword: e.target.value })}
              placeholder="love2026"
              className="w-full rounded-pill border border-border bg-white px-4 py-2 text-sm placeholder:text-text-muted focus:border-rose focus:outline-none"
            />
          </Field>

          <Field label="Hero image URL" hint="Paste a URL to a high-res engagement photo (image upload is coming later).">
            <input
              type="url"
              value={state.weddingHeroImage}
              onChange={(e) => update({ weddingHeroImage: e.target.value })}
              placeholder="https://…"
              className="w-full rounded-pill border border-border bg-white px-4 py-2 text-sm placeholder:text-text-muted focus:border-rose focus:outline-none"
            />
          </Field>

          <p className="text-xs italic text-text-muted">
            Tip: kick off your first draft with the <strong>Step 2 — Tell us
            your story</strong> panel above. It generates copy across every
            section in one go.
          </p>

          {generateError && (
            <p className="text-sm text-red-600">{generateError}</p>
          )}
        </div>
      </Section>

      {/* Section list (toggle + edit) */}
      <Section
        title="Sections"
        description="Toggle a section on or off. Click Edit to open the inline editor."
      >
        <ul className="divide-y divide-border-light">
          {SECTION_ORDER.map((s) => {
            const isOn = state.weddingPageConfig[s.key];
            const isOpen = openSection === s.key;
            return (
              <li key={s.key} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-base font-semibold text-charcoal">
                      {s.label}
                      {s.alwaysOn && (
                        <span className="ml-2 rounded-pill bg-charcoal/10 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.08em] text-charcoal">
                          Always on
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-mid">{s.description}</p>
                  </div>

                  <ToggleSwitch
                    on={isOn === true}
                    disabled={s.alwaysOn ?? false}
                    onChange={() => toggleSection(s.key)}
                  />

                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? null : s.key)}
                    disabled={!isOn && !s.alwaysOn}
                    className="rounded-pill border border-border bg-white px-3 py-1.5 text-xs font-bold text-charcoal hover:border-rose hover:text-rose disabled:opacity-50"
                  >
                    {isOpen ? "Close" : "Edit"}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 rounded-card border border-border bg-bg-warm p-4">
                    {renderEditor(s.key, state, {
                      update,
                      addPartyMember, updatePartyMember, removePartyMember,
                      addRegistry, updateRegistry, removeRegistry,
                      addThing, updateThing, removeThing,
                      addEvent, updateEvent, removeEvent,
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

type Handlers = {
  update: (patch: Partial<EditorState>) => void;
  addPartyMember:    () => void;
  updatePartyMember: (id: string, patch: Partial<WeddingPartyMember>) => void;
  removePartyMember: (id: string) => void;
  addRegistry:       () => void;
  updateRegistry:    (id: string, patch: Partial<RegistryLink>) => void;
  removeRegistry:    (id: string) => void;
  addThing:          () => void;
  updateThing:       (id: string, patch: Partial<ThingsToDoItem>) => void;
  removeThing:       (id: string) => void;
  addEvent:          () => void;
  updateEvent:       (id: string, patch: Partial<MultipleEvent>) => void;
  removeEvent:       (id: string) => void;
};

function renderEditor(
  key: keyof WeddingPageConfig,
  state: EditorState,
  h: Handlers,
): React.ReactNode {
  switch (key) {
    case "hero":
      return (
        <p className="text-sm text-text-mid">
          The hero uses your names ({state.partner1Name || "—"} &amp; {state.partner2Name || "—"})
          and wedding date from the planner tab. Want to change those?
          Update them in the main planner — they sync everywhere.
        </p>
      );

    case "eventDetails":
      return (
        <div className="space-y-3">
          <p className="text-sm text-text-mid">
            Ceremony + reception details come from your venue
            ({state.venueLabel ?? "no venue picked yet"}). Add extra events below.
          </p>
          <div className="space-y-3">
            {state.multipleEvents.map((ev) => (
              <div key={ev.id} className="rounded-card border border-border bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
                  <input
                    type="text"
                    value={ev.name}
                    onChange={(e) => h.updateEvent(ev.id, { name: e.target.value })}
                    placeholder="Welcome dinner"
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={ev.date ?? ""}
                    onChange={(e) => h.updateEvent(ev.id, { date: e.target.value || undefined })}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={ev.time ?? ""}
                    onChange={(e) => h.updateEvent(ev.id, { time: e.target.value || undefined })}
                    placeholder="6:30 PM"
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={ev.location ?? ""}
                  onChange={(e) => h.updateEvent(ev.id, { location: e.target.value || undefined })}
                  placeholder="Location"
                  className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
                />
                <textarea
                  value={ev.description ?? ""}
                  onChange={(e) => h.updateEvent(ev.id, { description: e.target.value || undefined })}
                  placeholder="Short description (optional)"
                  className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
                  rows={2}
                />
                <div className="mt-2 flex items-center justify-between">
                  <select
                    value={ev.audience}
                    onChange={(e) => h.updateEvent(ev.id, { audience: e.target.value as MultipleEvent["audience"] })}
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-xs"
                  >
                    {Object.entries(EVENT_AUDIENCE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => h.removeEvent(ev.id)}
                          className="text-xs font-medium text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={h.addEvent}
                    className="rounded-pill border-2 border-dashed border-border px-4 py-2 text-sm font-medium text-text-mid hover:border-rose hover:text-rose">
              + Add an event
            </button>
          </div>
        </div>
      );

    case "ourStory":
      return (
        <Field label="Our story" hint="A paragraph or two in your own voice.">
          <textarea
            value={state.ourStory}
            onChange={(e) => h.update({ ourStory: e.target.value })}
            rows={8}
            placeholder="How you met, the proposal, why this venue…"
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-rose focus:outline-none"
          />
          {state.weddingGeneratedCopy?.ourStory && state.ourStory !== state.weddingGeneratedCopy.ourStory && (
            <GeneratedSuggestion
              text={state.weddingGeneratedCopy.ourStory}
              onAccept={() => h.update({ ourStory: state.weddingGeneratedCopy?.ourStory ?? "" })}
            />
          )}
        </Field>
      );

    case "rsvp":
      return (
        <p className="text-sm text-text-mid">
          The RSVP button on your site links to your OneQR portal. Activate
          OneQR from the main planner tab — it&rsquo;s free until 30 days
          before the wedding date.
        </p>
      );

    case "travel":
      return (
        <Field label="Travel & accommodation" hint="Hotel block, parking, shuttle, airport tips.">
          <textarea
            value={state.travelCopy}
            onChange={(e) => h.update({ travelCopy: e.target.value })}
            rows={6}
            placeholder="If you're staying overnight, we have a hotel block at…"
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-rose focus:outline-none"
          />
          {state.weddingGeneratedCopy?.travelCopy && state.travelCopy !== state.weddingGeneratedCopy.travelCopy && (
            <GeneratedSuggestion
              text={state.weddingGeneratedCopy.travelCopy}
              onAccept={() => h.update({ travelCopy: state.weddingGeneratedCopy?.travelCopy ?? "" })}
            />
          )}
        </Field>
      );

    case "weddingParty":
      return (
        <div className="space-y-3">
          {state.weddingParty.map((m) => (
            <div key={m.id} className="rounded-card border border-border bg-white p-3">
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                <input type="text" value={m.name}
                       onChange={(e) => h.updatePartyMember(m.id, { name: e.target.value })}
                       placeholder="Name"
                       className="rounded-md border border-border px-3 py-2 text-sm" />
                <input type="text" value={m.role}
                       onChange={(e) => h.updatePartyMember(m.id, { role: e.target.value })}
                       placeholder="Role"
                       className="rounded-md border border-border px-3 py-2 text-sm" />
              </div>
              <textarea value={m.bio ?? ""}
                        onChange={(e) => h.updatePartyMember(m.id, { bio: e.target.value })}
                        placeholder="Short bio (optional)"
                        className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
                        rows={2} />
              <div className="mt-2 text-right">
                <button type="button" onClick={() => h.removePartyMember(m.id)}
                        className="text-xs font-medium text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={h.addPartyMember}
                  className="rounded-pill border-2 border-dashed border-border px-4 py-2 text-sm font-medium text-text-mid hover:border-rose hover:text-rose">
            + Add a person
          </button>
        </div>
      );

    case "photoGallery":
      return (
        <div className="space-y-2">
          {state.photoGalleryUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="url" value={url}
                     onChange={(e) => {
                       const next = state.photoGalleryUrls.slice();
                       next[i] = e.target.value;
                       h.update({ photoGalleryUrls: next });
                     }}
                     placeholder="https://… (full image URL)"
                     className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm" />
              <button type="button"
                      onClick={() => h.update({ photoGalleryUrls: state.photoGalleryUrls.filter((_, j) => j !== i) })}
                      className="text-xs font-medium text-red-600 hover:underline">
                Remove
              </button>
            </div>
          ))}
          <button type="button"
                  onClick={() => h.update({ photoGalleryUrls: [...state.photoGalleryUrls, ""] })}
                  className="rounded-pill border-2 border-dashed border-border px-4 py-2 text-sm font-medium text-text-mid hover:border-rose hover:text-rose">
            + Add a photo URL
          </button>
        </div>
      );

    case "dressCode":
      return (
        <div className="space-y-3">
          <Field label="Style" hint="Pick the closest match.">
            <div className="flex flex-wrap gap-2">
              {DRESS_CODE_STYLES.map((s) => {
                const active = state.dressCodeStyle === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => h.update({ dressCodeStyle: active ? "" : s })}
                    className={`rounded-pill border px-3 py-1 text-xs font-medium ${
                      active
                        ? "border-rose bg-rose text-white"
                        : "border-border bg-white text-charcoal hover:border-rose hover:text-rose"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Description" hint="Optional notes — outdoor portion, footwear, season.">
            <textarea
              value={state.dressCodeDescription}
              onChange={(e) => h.update({ dressCodeDescription: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            />
            {state.weddingGeneratedCopy?.dressCopyHint && state.dressCodeDescription !== state.weddingGeneratedCopy.dressCopyHint && (
              <GeneratedSuggestion
                text={state.weddingGeneratedCopy.dressCopyHint}
                onAccept={() => h.update({ dressCodeDescription: state.weddingGeneratedCopy?.dressCopyHint ?? "" })}
              />
            )}
          </Field>
          <Field label="Inspiration image URL" hint="Optional.">
            <input
              type="url"
              value={state.dressCodeImageUrl}
              onChange={(e) => h.update({ dressCodeImageUrl: e.target.value })}
              placeholder="https://…"
              className="w-full rounded-pill border border-border bg-white px-4 py-2 text-sm"
            />
          </Field>
        </div>
      );

    case "thingsToDo":
      return (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            We&rsquo;ve seeded suggestions for {state.region ?? "your region"}. Edit, remove,
            or add your own — these show up on your site as a numbered list.
          </p>
          {state.thingsToDo.map((t) => (
            <div key={t.id} className="rounded-card border border-border bg-white p-3">
              <input type="text" value={t.name}
                     onChange={(e) => h.updateThing(t.id, { name: e.target.value })}
                     placeholder="Activity name"
                     className="w-full rounded-md border border-border px-3 py-2 text-sm" />
              <textarea value={t.description}
                        onChange={(e) => h.updateThing(t.id, { description: e.target.value })}
                        rows={2}
                        placeholder="What guests should know"
                        className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm" />
              <input type="url" value={t.url ?? ""}
                     onChange={(e) => h.updateThing(t.id, { url: e.target.value || undefined })}
                     placeholder="Optional link"
                     className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm" />
              <div className="mt-2 text-right">
                <button type="button" onClick={() => h.removeThing(t.id)}
                        className="text-xs font-medium text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={h.addThing}
                  className="rounded-pill border-2 border-dashed border-border px-4 py-2 text-sm font-medium text-text-mid hover:border-rose hover:text-rose">
            + Add an item
          </button>
        </div>
      );

    case "registry":
      return (
        <div className="space-y-3">
          {state.weddingRegistry.map((r) => (
            <div key={r.id} className="rounded-card border border-border bg-white p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                <input type="text" value={r.label}
                       onChange={(e) => h.updateRegistry(r.id, { label: e.target.value })}
                       placeholder="Crate & Barrel"
                       className="rounded-md border border-border px-3 py-2 text-sm" />
                <input type="url" value={r.url}
                       onChange={(e) => h.updateRegistry(r.id, { url: e.target.value })}
                       placeholder="https://…"
                       className="rounded-md border border-border px-3 py-2 text-sm" />
              </div>
              <div className="mt-2 text-right">
                <button type="button" onClick={() => h.removeRegistry(r.id)}
                        className="text-xs font-medium text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={h.addRegistry}
                  className="rounded-pill border-2 border-dashed border-border px-4 py-2 text-sm font-medium text-text-mid hover:border-rose hover:text-rose">
            + Add a registry
          </button>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-2">
          <p className="text-sm text-text-mid">
            The FAQ is generated by Claude. Click <strong>Generate copy</strong> above
            to produce five starter questions and answers.
          </p>
          {state.weddingGeneratedCopy?.faqItems && state.weddingGeneratedCopy.faqItems.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {state.weddingGeneratedCopy.faqItems.map((f) => (
                <li key={f.id} className="rounded-card border border-border bg-white p-3">
                  <div className="text-sm font-bold text-charcoal">{f.question}</div>
                  <div className="mt-1 text-sm text-text-mid">{f.answer}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted">
              No FAQ generated yet — click Generate copy to create some.
            </p>
          )}
        </div>
      );

    case "vendorCredits":
      return (
        <div className="space-y-2">
          <p className="text-sm text-text-mid">
            Your booked vendors + venue appear in a credit roll at the bottom
            of your wedding site. This is a courtesy to them — and a great way
            to send referrals their way.
          </p>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={state.weddingSiteShowVendors}
              onChange={(e) => h.update({ weddingSiteShowVendors: e.target.checked })}
              className="h-4 w-4 accent-rose"
            />
            Show the &ldquo;Our Venue &amp; Vendors&rdquo; section on my site
          </label>
        </div>
      );

    default:
      return <p className="text-sm text-text-mid">Coming soon.</p>;
  }
}

/* ─── Small UI atoms ──────────────────────────────────────────────── */

function Section({ title, description, eyebrow, children }: {
  title:        string;
  description?: string;
  eyebrow?:     string;
  children:     React.ReactNode;
}) {
  /* Show the header only when there's actual heading content — wizard
   * steps that have their own internal H3 pass title="" to suppress
   * the section's H2 and keep visual hierarchy clean. */
  const hasHeader = !!(title || description || eyebrow);
  return (
    <section className="rounded-card border border-border bg-white p-6 lg:p-7">
      {hasHeader && (title || description || eyebrow) && (
        <header className="mb-4">
          {eyebrow && (
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-rose">
              {eyebrow}
            </div>
          )}
          {title && (
            <h2 className="mt-1 font-display text-xl font-semibold text-charcoal">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-text-mid">{description}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

function Field({ label, hint, children }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-bold uppercase tracking-[0.08em] text-charcoal">{label}</div>
      {hint && <p className="mt-0.5 text-[0.7rem] text-text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function ToggleSwitch({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-pressed={on}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors ${
        on ? "border-rose bg-rose" : "border-border bg-bg-soft"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const cls = "rounded-pill px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em]";
  switch (status) {
    case "saving": return <span className={`${cls} bg-amber-100 text-amber-700`}>Saving…</span>;
    case "saved":  return <span className={`${cls} bg-emerald-100 text-emerald-700`}>Saved ✓</span>;
    case "error":  return <span className={`${cls} bg-red-100 text-red-700`}>Save failed</span>;
    default:       return <span className={`${cls} bg-bg-soft text-text-muted`}>Autosave on</span>;
  }
}

function GeneratedSuggestion({ text, onAccept }: { text: string; onAccept: () => void }) {
  return (
    <div className="mt-2 rounded-card border border-dashed border-rose bg-rose-pale/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-rose">
          AI suggestion
        </span>
        <button type="button" onClick={onAccept}
                className="rounded-pill bg-rose px-3 py-1 text-[0.65rem] font-bold text-white hover:bg-rose-hover">
          Use this →
        </button>
      </div>
      <p className="mt-2 text-sm text-text-mid">{text}</p>
    </div>
  );
}

function StoryStep({
  value, onChange, onGenerate, generating, tier, used, limit, onUpgradeClick,
}: {
  value:          string;
  onChange:       (s: string) => void;
  onGenerate:     () => void;
  generating:     boolean;
  tier:           "free" | "premium";
  used:           number;
  limit:          number;
  onUpgradeClick: () => void;
}) {
  const MAX = 500;
  /* Truncate aggressively on paste so the textarea state never grows
   * past the limit. Counter then shows the live char total. */
  const remaining = Math.max(0, limit - used);
  const outOfGenerations = tier === "free" && remaining === 0;

  return (
    <div>
      <header className="mb-5 text-center sm:text-left">
        <h3 className="font-display text-2xl font-semibold leading-tight text-charcoal sm:text-3xl">
          Tell us your story{" "}
          <span className="text-base font-normal italic text-text-muted">
            (optional)
          </span>
        </h3>
        <p className="mt-1 text-sm text-text-mid">
          A line or two on how you met, the proposal, why this venue — Claude
          uses it as the seed for your &ldquo;Our Story&rdquo;, plus your
          travel notes, dress code, things-to-do, and FAQ.
        </p>
      </header>

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

      <button
        type="button"
        onClick={outOfGenerations ? onUpgradeClick : onGenerate}
        disabled={generating}
        className="mt-5 w-full rounded-pill bg-rose px-6 py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(185,100,118,0.32)] transition-all hover:bg-rose-hover disabled:opacity-60"
      >
        {generating
          ? "Generating…"
          : outOfGenerations
          ? "🔒 Upgrade to keep generating →"
          : "Generate my website →"}
      </button>
      <p className="mt-3 text-center text-[0.7rem] text-text-muted">
        Generation takes ~15 seconds. The copy fills empty fields only —
        anything you&rsquo;ve already written stays put.
      </p>
    </div>
  );
}

function PublishBar({
  publicUrl, slug, published, saveStatus, onPublish, onUnpublish,
}: {
  publicUrl:   string | null;
  slug:        string | null;
  published:   boolean;
  saveStatus:  SaveStatus;
  onPublish:   () => void;
  onUnpublish: () => void;
}) {
  /* The container's parent uses `space-y-6` which would push the bar
   * down off the viewport top. -mt-* + a self-contained padding pulls
   * it back to the top edge of the page area so sticky works flush. */
  return (
    <div className="sticky top-0 z-40 -mx-6 -mt-6 border-b border-border bg-white/95 px-6 py-3 shadow-[0_2px_8px_rgba(44,44,44,0.06)] backdrop-blur sm:-mx-0 sm:rounded-card sm:border sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left — URL pill or empty-state copy */}
        <div className="min-w-0 flex-1">
          {publicUrl ? (
            <CopyablePill url={publicUrl} />
          ) : (
            <div className="text-xs text-text-muted">
              Pick a venue + couple names in the planner tab to mint
              your wedding URL.
            </div>
          )}
        </div>

        {/* Right — save chip + action buttons */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <SaveIndicator status={saveStatus} />
          {slug && (
            <>
              {published ? (
                <>
                  <a
                    href={publicUrl ?? `/weddings/${slug}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-charcoal transition-colors hover:border-rose hover:text-rose"
                  >
                    View live site →
                  </a>
                  <button
                    type="button"
                    onClick={onUnpublish}
                    className="inline-flex items-center gap-1.5 rounded-pill border border-charcoal bg-white px-3.5 py-1.5 text-xs font-bold text-charcoal transition-colors hover:bg-charcoal hover:text-white"
                  >
                    Unpublish
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={`/weddings/${slug}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-charcoal transition-colors hover:border-rose hover:text-rose"
                  >
                    Preview →
                  </a>
                  <RegisterGate
                    active={true}
                    intent="publish-website"
                    headline="Create a free account to publish your wedding website"
                    subhead="Couples need a free account before going live — it secures your custom URL and lets you edit your site from any device."
                    callbackUrl="/plan/website"
                  >
                    <button
                      type="button"
                      onClick={onPublish}
                      className="inline-flex items-center gap-1.5 rounded-pill bg-rose px-4 py-1.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover"
                    >
                      Publish website
                    </button>
                  </RegisterGate>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Live URL line — only shown once published, just below the bar.
       * Helps the couple confirm where to send guests. */}
      {published && publicUrl && (
        <div className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-emerald-700">
          ✓ Live at <span className="font-bold normal-case tracking-normal">{publicUrl.replace(/^https?:\/\//, "")}</span>
        </div>
      )}
    </div>
  );
}

function CopyablePill({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Older browsers — fall back to a select-all hint. */
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "URL copied" : "Copy URL"}
      className="group inline-flex max-w-full items-center gap-2 rounded-pill border-2 border-rose bg-rose-pale px-4 py-2 text-sm font-bold text-rose transition-colors hover:bg-rose hover:text-white"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 flex-shrink-0 fill-none stroke-current"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
      <span
        className={`flex-shrink-0 rounded-pill px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] ${
          copied
            ? "bg-emerald-100 text-emerald-700 group-hover:bg-white"
            : "bg-white/70 text-rose group-hover:bg-white group-hover:text-rose"
        }`}
      >
        {copied ? "✓ Copied" : "Copy"}
      </span>
    </button>
  );
}

function GenerationCounter({
  tier, used, limit, onUpgradeClick,
}: {
  tier:           "free" | "premium";
  used:           number;
  limit:          number;
  onUpgradeClick: () => void;
}) {
  if (tier === "premium") {
    return (
      <p className="mt-1 inline-flex items-center gap-1.5 rounded-pill bg-emerald-100 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-emerald-700">
        ✓ Unlimited generations
      </p>
    );
  }
  const remaining = Math.max(0, limit - used);
  if (remaining === 0) {
    return (
      <button
        type="button"
        onClick={onUpgradeClick}
        className="mt-1 inline-flex items-center gap-1.5 rounded-pill bg-rose-pale px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-rose hover:bg-rose-pale/70"
      >
        0 generations — upgrade to continue →
      </button>
    );
  }
  const cls =
    remaining === 1
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";
  return (
    <p className={`mt-1 inline-flex rounded-pill px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] ${cls}`}>
      {remaining} {remaining === 1 ? "generation" : "generations"} remaining
    </p>
  );
}

/* Silence the "DEFAULT_PAGE_CONFIG unused" lint when the import survives
 * tree-shaking — it's used implicitly by mergePageConfig on the server.
 * Keep this here so future edits to the editor don't accidentally orphan
 * the import. */
void DEFAULT_PAGE_CONFIG;
