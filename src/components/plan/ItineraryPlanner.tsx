"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { defaultItineraryFromCeremony, type ItineraryEntry } from "@/lib/plan-state";

const LOCAL_STORAGE_KEY = "owv_itinerary_state_v1";
const SAVE_DEBOUNCE_MS = 800;

const VENDOR_TAG_OPTIONS = [
  { value: "",                label: "—" },
  { value: "officiant",       label: "Officiant" },
  { value: "photographer",    label: "Photographer" },
  { value: "videographer",    label: "Videographer" },
  { value: "dj",              label: "DJ" },
  { value: "catering",        label: "Catering" },
  { value: "florist",         label: "Florist" },
  { value: "cake",            label: "Cake" },
  { value: "hair_makeup",     label: "Hair & Makeup" },
  { value: "photo_booth",     label: "Photo Booth" },
  { value: "limo",            label: "Transportation" },
  { value: "lighting_decor",  label: "Lighting & Decor" },
  { value: "wedding_planner", label: "Planner" },
];

function newId(): string {
  return `itin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  sessionId: string;
  initial: ItineraryEntry[];
};

export function ItineraryPlanner({ sessionId, initial }: Props) {
  const [items, setItems] = useState<ItineraryEntry[]>(initial);
  const [ceremonyTime, setCeremonyTime] = useState("16:00");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  /* Hydrate from localStorage on first render */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw && initial.length === 0) {
        const local = JSON.parse(raw) as ItineraryEntry[];
        if (Array.isArray(local)) setItems(local);
      }
    } catch { /* ignore */ }
  }, [initial.length]);

  /* Persist on every change */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore */ }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/plan/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itinerary: items }),
        });
        setSaveStatus(res.ok ? "saved" : "error");
      } catch {
        setSaveStatus("error");
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [items]);

  function generateFromCeremony() {
    const next = defaultItineraryFromCeremony(ceremonyTime);
    if (next.length === 0) {
      alert("Enter a valid ceremony time (HH:MM).");
      return;
    }
    if (items.length > 0) {
      const ok = window.confirm(
        "This replaces your existing itinerary. Continue?",
      );
      if (!ok) return;
    }
    setItems(next);
  }

  function addRow() {
    setItems((arr) => [
      ...arr,
      { id: newId(), time: "12:00", title: "New event", guestVisible: false, notes: "", vendorTag: null },
    ]);
  }

  function updateRow(id: string, patch: Partial<ItineraryEntry>) {
    setItems((arr) => arr.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeRow(id: string) {
    setItems((arr) => arr.filter((e) => e.id !== id));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((arr) => {
      const ids = arr.map((r) => r.id);
      const oldIdx = ids.indexOf(active.id as string);
      const newIdx = ids.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return arr;
      return arrayMove(arr, oldIdx, newIdx);
    });
  }

  return (
    <div className="space-y-6">
      {/* Save status */}
      <div className="flex items-center justify-between rounded-pill bg-white px-4 py-2 text-xs text-text-mid shadow-[var(--shadow-card)]">
        <span>
          Itinerary saved automatically · session{" "}
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

      {/* Ceremony anchor */}
      {items.length === 0 && (
        <section className="rounded-card border-[1.5px] border-dashed border-rose bg-rose-pale p-6 lg:p-8">
          <h2 className="font-display text-2xl font-semibold text-charcoal">
            Start with your ceremony time
          </h2>
          <p className="mt-2 text-sm text-text-mid">
            Tell us when the ceremony begins. We&rsquo;ll generate a sensible
            14-event Ontario timeline anchored on that moment — hair &amp; makeup
            starts 4 hours before, last song lands 8.5 hours after.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
              Ceremony at
            </label>
            <input
              type="time"
              value={ceremonyTime}
              onChange={(e) => setCeremonyTime(e.target.value)}
              className="rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            />
            <button
              type="button"
              onClick={generateFromCeremony}
              className="inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              Generate timeline
              <span aria-hidden>→</span>
            </button>
          </div>
        </section>
      )}

      {/* Regen + add row controls */}
      {items.length > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border-[1.5px] border-border bg-white px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-mid">
            <span>Anchor on ceremony at</span>
            <input
              type="time"
              value={ceremonyTime}
              onChange={(e) => setCeremonyTime(e.target.value)}
              className="rounded-pill border border-border bg-white px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            />
            <button
              type="button"
              onClick={generateFromCeremony}
              className="rounded-pill border border-rose bg-white px-3 py-1 text-xs font-bold text-rose transition-colors hover:bg-rose hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              Regenerate
            </button>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="rounded-pill border border-border bg-white px-4 py-1.5 text-xs font-bold text-charcoal transition-colors hover:border-rose hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
          >
            + Add event
          </button>
        </section>
      )}

      {/* Sortable list */}
      {items.length > 0 && (
        <section className="rounded-card border-[1.5px] border-border bg-white p-4 lg:p-5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {items.map((entry) => (
                  <SortableEvent
                    key={entry.id}
                    entry={entry}
                    onChange={(patch) => updateRow(entry.id, patch)}
                    onRemove={() => removeRow(entry.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </section>
      )}
    </div>
  );
}

function SortableEvent({
  entry,
  onChange,
  onRemove,
}: {
  entry: ItineraryEntry;
  onChange: (patch: Partial<ItineraryEntry>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  } as React.CSSProperties;

  return (
    <li ref={setNodeRef} style={style} className="group rounded-card border border-border-light bg-bg-soft p-3">
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Reorder ${entry.title}`}
          {...attributes}
          {...listeners}
          className="mt-1 flex h-6 w-4 flex-shrink-0 cursor-grab items-center justify-center text-text-muted opacity-40 transition-opacity hover:opacity-100 active:cursor-grabbing"
        >
          <svg aria-hidden viewBox="0 0 12 16" className="h-4 w-3 fill-current">
            <circle cx="3" cy="3"  r="1.2" />
            <circle cx="9" cy="3"  r="1.2" />
            <circle cx="3" cy="8"  r="1.2" />
            <circle cx="9" cy="8"  r="1.2" />
            <circle cx="3" cy="13" r="1.2" />
            <circle cx="9" cy="13" r="1.2" />
          </svg>
        </button>

        <div className="flex-1 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[110px_1fr_auto]">
            <input
              type="time"
              value={entry.time}
              onChange={(e) => onChange({ time: e.target.value })}
              className="rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            />
            <input
              type="text"
              value={entry.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Event"
              className="rounded-pill border border-border bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            />
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove event"
              title="Remove event"
              className="justify-self-end rounded-full px-2 py-1 text-xs font-medium text-text-muted opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Remove
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto] sm:items-center">
            <input
              type="text"
              value={entry.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Notes (optional)"
              className="rounded-pill border border-border bg-white px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            />
            <select
              value={entry.vendorTag ?? ""}
              onChange={(e) => onChange({ vendorTag: e.target.value || null })}
              className="rounded-pill border border-border bg-white px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
            >
              {VENDOR_TAG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-xs text-charcoal">
              <input
                type="checkbox"
                checked={entry.guestVisible}
                onChange={(e) => onChange({ guestVisible: e.target.checked })}
                className="h-4 w-4 accent-rose"
              />
              Guest-visible
            </label>
          </div>
        </div>
      </div>
    </li>
  );
}
