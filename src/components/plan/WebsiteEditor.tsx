"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PAGE_CONFIG,
  DRESS_CODE_STYLES,
  EVENT_AUDIENCE_LABELS,
  SECTION_ORDER,
  WEDDING_THEMES,
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
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 600;

export function WebsiteEditor({ initial }: { initial: EditorState }) {
  const [state, setState] = useState<EditorState>(initial);
  const [openSection, setOpenSection] = useState<keyof WeddingPageConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

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
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/wedding-website/generate", { method: "POST" });
      if (!res.ok) throw new Error(`generate ${res.status}`);
      const body = (await res.json()) as { generated: GeneratedCopy };
      const g = body.generated ?? {};
      const next: EditorState = {
        ...state,
        weddingGeneratedCopy: g,
        /* Apply suggestions only into fields the couple hasn't filled in. */
        ourStory:      state.ourStory             || g.ourStory      || state.ourStory,
        travelCopy:    state.travelCopy           || g.travelCopy    || state.travelCopy,
        dressCodeDescription: state.dressCodeDescription || g.dressCopyHint || state.dressCodeDescription,
        thingsToDo:    state.thingsToDo.length > 0 ? state.thingsToDo : (g.thingsToDo ?? []),
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
      {/* Save indicator */}
      <div className="flex items-center justify-between rounded-card border border-border bg-white p-4">
        <div className="text-sm text-text-mid">
          {publicUrl ? (
            <>
              Your site is at{" "}
              <a href={publicUrl} target="_blank" rel="noopener" className="font-medium text-rose hover:underline">
                {publicUrl.replace(/^https:\/\//, "")}
              </a>
            </>
          ) : (
            <>Pick a venue + couple names in the planner tab to mint your wedding URL.</>
          )}
        </div>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Theme picker */}
      <Section title="Choose a theme" description="Tap a theme to preview — saved automatically.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WEDDING_THEMES.map((t) => {
            const active = state.weddingTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ weddingTheme: t.id })}
                className={`text-left rounded-card border-2 p-4 transition-colors ${
                  active ? "border-rose bg-rose-pale" : "border-border bg-white hover:border-rose"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-semibold text-charcoal">{t.label}</span>
                  {active && <span className="rounded-pill bg-rose px-2 py-0.5 text-[0.6rem] font-bold uppercase text-white">Active</span>}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-mid">{t.description}</p>
                {t.id === "romantic" && (
                  <span className="mt-2 inline-block rounded-pill bg-emerald-100 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.08em] text-emerald-700">
                    Launch
                  </span>
                )}
              </button>
            );
          })}
        </div>
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

          <div className="flex flex-wrap items-center gap-3 rounded-card border border-rose-pale bg-rose-pale/40 p-4">
            <div className="flex-1 min-w-[240px]">
              <div className="font-display text-base font-semibold text-charcoal">
                Let Claude write your first draft
              </div>
              <p className="mt-0.5 text-xs text-text-mid">
                Generates your story, travel notes, dress-code hint, three things to do nearby,
                and five FAQ answers. Only fills empty fields — edits stay yours.
              </p>
            </div>
            <button
              type="button"
              onClick={generateCopy}
              disabled={generating}
              className="rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover disabled:opacity-60"
            >
              {generating ? "Generating…" : "Generate copy →"}
            </button>
          </div>
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

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-white p-6 lg:p-7">
      <header className="mb-4">
        <h2 className="font-display text-xl font-semibold text-charcoal">{title}</h2>
        {description && <p className="mt-1 text-sm text-text-mid">{description}</p>}
      </header>
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

/* Silence the "DEFAULT_PAGE_CONFIG unused" lint when the import survives
 * tree-shaking — it's used implicitly by mergePageConfig on the server.
 * Keep this here so future edits to the editor don't accidentally orphan
 * the import. */
void DEFAULT_PAGE_CONFIG;
