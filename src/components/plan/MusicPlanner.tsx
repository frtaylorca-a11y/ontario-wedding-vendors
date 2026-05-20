"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Route } from "next";
import {
  DEFAULT_MUSIC_SELECTIONS,
  type CeremonyVibe,
  type MusicSelections,
  type ReceptionVibe,
  type SongPick,
} from "@/lib/plan-state";

const LOCAL_STORAGE_KEY = "owv_music_state_v1";
const SAVE_DEBOUNCE_MS = 800;

const CEREMONY_VIBES: CeremonyVibe[] = ["Classical", "Acoustic", "Religious", "Modern", "Custom"];
const RECEPTION_VIBES: ReceptionVibe[] = ["Top 40", "R&B", "Country", "Rock", "Latin", "Mixed", "Custom"];

const KEY_SONGS: Array<{ key: keyof Pick<MusicSelections, "firstDance" | "fatherDaughter" | "motherSon" | "grandEntrance" | "lastSong">; label: string }> = [
  { key: "firstDance",     label: "First dance" },
  { key: "fatherDaughter", label: "Father–daughter dance" },
  { key: "motherSon",      label: "Mother–son dance" },
  { key: "grandEntrance",  label: "Grand entrance" },
  { key: "lastSong",       label: "Last song of the night" },
];

type Props = {
  sessionId: string;
  initial: MusicSelections | null;
};

export function MusicPlanner({ sessionId, initial }: Props) {
  const [state, setState] = useState<MusicSelections>(initial ?? DEFAULT_MUSIC_SELECTIONS);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  /* Hydrate from localStorage on first render — DB wins when present */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw && !initial) {
        setState(JSON.parse(raw));
      }
    } catch {
      /* ignore */
    }
  }, [initial]);

  /* Persist on every change */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/plan/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ musicSelections: state }),
        });
        setSaveStatus(res.ok ? "saved" : "error");
      } catch {
        setSaveStatus("error");
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  function setSong(key: keyof MusicSelections, pick: SongPick) {
    setState((s) => ({ ...s, [key]: pick }));
  }
  function setCeremonyVibe(v: CeremonyVibe) {
    setState((s) => ({ ...s, ceremonyVibe: s.ceremonyVibe === v ? null : v }));
  }
  function setReceptionVibe(v: ReceptionVibe) {
    setState((s) => ({ ...s, receptionVibe: s.receptionVibe === v ? null : v }));
  }

  return (
    <div className="space-y-6">
      {/* Save status */}
      <div className="flex items-center justify-between rounded-pill bg-white px-4 py-2 text-xs text-text-mid shadow-[var(--shadow-card)]">
        <span>
          Music preferences saved automatically · session{" "}
          <code className="rounded bg-bg-soft px-1.5 py-0.5 text-[0.65rem]">{sessionId.slice(0, 8)}…</code>
        </span>
        <span
          className={
            saveStatus === "saving" ? "text-text-muted" :
            saveStatus === "saved"  ? "text-green" :
            saveStatus === "error"  ? "text-red-600" : "text-text-muted"
          }
        >
          {saveStatus === "saving" && "● Saving…"}
          {saveStatus === "saved"  && "✓ All changes saved"}
          {saveStatus === "error"  && "⚠ Save failed (local copy kept)"}
          {saveStatus === "idle"   && "Ready"}
        </span>
      </div>

      {/* 1 — Key songs */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-5">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Section 1 · Key songs
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-charcoal">
            The five moments your DJ has to nail
          </h2>
          <p className="mt-1 text-sm text-text-mid">
            Just the title and artist for each — full library exploration happens
            in your OneQR DJ portal once activated.
          </p>
        </header>

        <div className="space-y-4">
          {KEY_SONGS.map(({ key, label }) => {
            const value = state[key] as SongPick;
            return (
              <div key={key} className="grid items-start gap-3 sm:grid-cols-[180px_1fr_1fr]">
                <div className="pt-2 text-sm font-semibold text-charcoal">{label}</div>
                <input
                  type="text"
                  placeholder="Song title"
                  value={value.title}
                  onChange={(e) => setSong(key, { ...value, title: e.target.value })}
                  className="rounded-pill border border-border bg-white px-4 py-2 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                />
                <input
                  type="text"
                  placeholder="Artist"
                  value={value.artist}
                  onChange={(e) => setSong(key, { ...value, artist: e.target.value })}
                  className="rounded-pill border border-border bg-white px-4 py-2 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 2 — General vibe */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-5">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Section 2 · General vibe
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-charcoal">
            Set the tone — your DJ tunes the rest
          </h2>
        </header>

        <div className="space-y-5">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
              Ceremony vibe
            </div>
            <div className="flex flex-wrap gap-2">
              {CEREMONY_VIBES.map((v) => {
                const isActive = state.ceremonyVibe === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCeremonyVibe(v)}
                    aria-pressed={isActive}
                    className={`rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 ${
                      isActive
                        ? "border-rose bg-rose text-white"
                        : "border-border bg-white text-text-mid hover:border-rose hover:text-rose"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
              Reception vibe
            </div>
            <div className="flex flex-wrap gap-2">
              {RECEPTION_VIBES.map((v) => {
                const isActive = state.receptionVibe === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setReceptionVibe(v)}
                    aria-pressed={isActive}
                    className={`rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 ${
                      isActive
                        ? "border-rose bg-rose text-white"
                        : "border-border bg-white text-text-mid hover:border-rose hover:text-rose"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3 — Do not play */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-3">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Section 3 · Do not play
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-charcoal">
            Songs or genres to avoid
          </h2>
          <p className="mt-1 text-sm text-text-mid">
            One per line works fine — your DJ gets this verbatim.
          </p>
        </header>
        <textarea
          rows={5}
          value={state.doNotPlay}
          onChange={(e) => setState((s) => ({ ...s, doNotPlay: e.target.value }))}
          placeholder="e.g. Chicken Dance · YMCA · anything by [artist]"
          className="w-full rounded-card border border-border bg-white px-4 py-3 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
        />
      </section>

      {/* OneQR pointer */}
      <section className="rounded-card border border-dashed border-rose bg-rose-pale p-6 lg:p-8">
        <p className="text-sm text-text-mid">
          Your DJ will have access to <strong className="font-semibold text-charcoal">16,000+ songs</strong>{" "}
          and your full music preferences through the OneQR DJ portal —
          activated with one click on the planner home.
        </p>
        <Link
          href={"/plan" as Route}
          className="mt-3 inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
        >
          Set up OneQR →
        </Link>
      </section>
    </div>
  );
}
