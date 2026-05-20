"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  generateChecklist,
  groupByBucket,
  DEFAULT_CHECKLIST_TASKS,
  type ChecklistTasksBlob,
} from "@/lib/checklist";
import type { BookedVendor } from "@/lib/plan-state";
import { trackEvent } from "@/lib/analytics";

const LOCAL_STORAGE_KEY = "owv_checklist_state_v1";
const SAVE_DEBOUNCE_MS = 800;

export type AlertChannel = "sms" | "email" | "both" | "none";

type Props = {
  sessionId: string;
  weddingDate: string | null;
  bookedVendors: Record<string, BookedVendor>;
  initialTasks: ChecklistTasksBlob | null;
  initialAlertPhone: string | null;
  initialAlertEmail: string | null;
  initialAlertChannel: AlertChannel | null;
};

function formatDueDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ChecklistDashboard({
  sessionId,
  weddingDate,
  bookedVendors,
  initialTasks,
  initialAlertPhone,
  initialAlertEmail,
  initialAlertChannel,
}: Props) {
  const [tasks, setTasks] = useState<ChecklistTasksBlob>(
    initialTasks ?? DEFAULT_CHECKLIST_TASKS,
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  /* Alert signup form state */
  const [alertPhone, setAlertPhone] = useState(initialAlertPhone ?? "");
  const [alertEmail, setAlertEmail] = useState(initialAlertEmail ?? "");
  const [alertChannel, setAlertChannel] = useState<AlertChannel>(initialAlertChannel ?? "email");
  const [alertSavedAt, setAlertSavedAt] = useState<string | null>(
    initialAlertChannel && initialAlertChannel !== "none" ? "loaded" : null,
  );
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  /* Hydrate from localStorage on first client render */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw && !initialTasks) {
        const local = JSON.parse(raw);
        setTasks(local);
      }
    } catch {
      /* ignore */
    }
  }, [initialTasks]);

  /* Persist on every change — localStorage immediately, DB debounced */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* ignore quota */
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/plan/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checklistTasks: tasks }),
        });
        setSaveStatus(res.ok ? "saved" : "error");
      } catch {
        setSaveStatus("error");
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [tasks]);

  const generated = useMemo(() => generateChecklist(weddingDate, tasks), [weddingDate, tasks]);
  const groups = useMemo(() => groupByBucket(generated), [generated]);

  const doneCount = generated.filter((t) => t.done).length;
  const totalCount = generated.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  async function submitAlertSignup() {
    setAlertError(null);
    /* Validate per chosen channel */
    const needsPhone = alertChannel === "sms" || alertChannel === "both";
    const needsEmail = alertChannel === "email" || alertChannel === "both";
    if (needsPhone && alertPhone.trim().length < 7) {
      setAlertError("Enter a valid phone number for SMS reminders.");
      return;
    }
    if (needsEmail && !/^\S+@\S+\.\S+$/.test(alertEmail.trim())) {
      setAlertError("Enter a valid email for email reminders.");
      return;
    }
    setAlertSubmitting(true);
    try {
      const res = await fetch("/api/plan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertPhone:   needsPhone ? alertPhone.trim() : null,
          alertEmail:   needsEmail ? alertEmail.trim() : null,
          alertChannel: alertChannel,
        }),
      });
      if (res.ok) {
        setAlertSavedAt(new Date().toISOString());
      } else {
        setAlertError("Couldn't save reminder preferences. Try again.");
      }
    } catch {
      setAlertError("Network error. Try again.");
    } finally {
      setAlertSubmitting(false);
    }
  }

  function toggleTask(key: string) {
    setTasks((s) => {
      const cur = s.states[key];
      const nextDone = !cur?.done;
      /* Fire only on false → true (completion), not un-checking */
      if (nextDone) trackEvent("checklist_task_completed", { task_key: key });
      return {
        ...s,
        states: {
          ...s.states,
          [key]: { key, done: nextDone, doneAt: nextDone ? new Date().toISOString() : null },
        },
      };
    });
  }

  /* No wedding date — prompt the user to set one */
  if (!weddingDate) {
    return (
      <div className="rounded-card border-[1.5px] border-dashed border-border bg-white p-12 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
          Step 1 · Set a date
        </div>
        <h2 className="mt-3 font-display text-3xl font-semibold text-charcoal">
          Set your wedding date to unlock the checklist
        </h2>
        <p className="mt-3 text-text-mid">
          The 14-bucket timeline runs backwards from your wedding date — book
          venue at 18 months, photographer at 16 months, all the way to OneQR
          on the day. Pick a date on the Wedding Planner tab and your tasks
          appear here with due dates calibrated to today.
        </p>
        <Link
          href={"/plan" as Route}
          className="mt-6 inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
        >
          Set wedding date →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save status */}
      <div className="flex items-center justify-between rounded-pill bg-white px-4 py-2 text-xs text-text-mid shadow-[var(--shadow-card)]">
        <span>
          Checklist saved automatically · session{" "}
          <code className="rounded bg-bg-soft px-1.5 py-0.5 text-[0.65rem]">
            {sessionId.slice(0, 8)}…
          </code>
        </span>
        <span
          className={
            saveStatus === "saving"   ? "text-text-muted" :
            saveStatus === "saved"    ? "text-green" :
            saveStatus === "error"    ? "text-red-600" :
            "text-text-muted"
          }
        >
          {saveStatus === "saving" && "● Saving…"}
          {saveStatus === "saved"  && "✓ All changes saved"}
          {saveStatus === "error"  && "⚠ Save failed (local copy kept)"}
          {saveStatus === "idle"   && "Ready"}
        </span>
      </div>

      {/* Progress header */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
              Checklist
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal">
              {doneCount === totalCount
                ? "All done. You're ready to celebrate."
                : `${doneCount} of ${totalCount} tasks complete`}
            </h2>
            <p className="mt-2 text-sm text-text-mid">
              Wedding date:{" "}
              <strong className="font-semibold text-charcoal">
                {formatDueDate(new Date(weddingDate))}
              </strong>
            </p>
          </div>
          <div className="font-display text-4xl font-semibold text-rose">
            {progressPct}%
          </div>
        </header>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-bg-soft">
          <div
            className="h-full bg-rose transition-all"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
      </section>

      {/* Grouped tasks */}
      {groups.map((group) => (
        <section key={group.bucket} className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
          <h3 className="font-display text-xl font-semibold text-charcoal">
            {group.label}
          </h3>
          <ul className="mt-4 divide-y divide-border-light">
            {group.tasks.map((task) => {
              const booked = task.vendorCategory ? bookedVendors[task.vendorCategory] : undefined;
              const vendorHref = task.vendorCategory
                ? `/vendors/${task.vendorCategory}`
                : null;
              return (
                <li key={task.key} className="flex items-start gap-3 py-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.done}
                    aria-label={`Mark "${task.title}" ${task.done ? "incomplete" : "complete"}`}
                    onClick={() => toggleTask(task.key)}
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-[1.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 ${
                      task.done
                        ? "border-green bg-green text-white"
                        : "border-border bg-white hover:border-rose"
                    }`}
                  >
                    {task.done && (
                      <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className={`text-sm ${task.done ? "text-text-muted line-through" : "text-charcoal"}`}>
                        {task.title}
                      </span>
                      {task.dueDate && (
                        <span className="text-[0.7rem] text-text-muted">
                          due {formatDueDate(task.dueDate)}
                        </span>
                      )}
                      {task.overdue && !task.done && (
                        <span className="rounded-pill bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-amber-700">
                          Overdue
                        </span>
                      )}
                      {task.done && (
                        <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-emerald-700">
                          <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Done
                        </span>
                      )}
                      {booked && (
                        <span className="rounded-pill bg-rose-pale px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-rose">
                          {booked.name}
                        </span>
                      )}
                      {task.partner && (
                        <a
                          href={task.partner.url}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 rounded-pill bg-rose-pale px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-rose transition-colors hover:bg-rose hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                          aria-label={`${task.partner.label} — opens in a new tab`}
                        >
                          {task.partner.label}
                          <svg aria-hidden viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 5h5v5" />
                            <path d="M19 5l-9 9" />
                            <path d="M19 14v5H5V5h5" />
                          </svg>
                        </a>
                      )}
                    </div>

                    {task.description && (
                      <p className="mt-1 text-[0.75rem] leading-relaxed text-text-mid">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      {!booked && vendorHref && !task.done && (
                        <Link
                          href={vendorHref as Route}
                          className="inline-flex items-center text-[0.7rem] font-semibold text-rose hover:underline"
                        >
                          Book now →
                        </Link>
                      )}
                      {task.partner?.cta && !task.done && (
                        <a
                          href={task.partner.url}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex items-center gap-1 rounded-pill bg-rose px-3 py-1 text-[0.7rem] font-bold text-white shadow-[0_2px_8px_rgba(185,100,118,0.25)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
                        >
                          {task.partner.cta}
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* Alert signup */}
      <section className="rounded-card border-[1.5px] border-border bg-white p-6 lg:p-8">
        <header className="mb-5">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose">
            Reminders
          </div>
          <h3 className="mt-2 font-display text-2xl font-semibold text-charcoal">
            Get reminders when tasks are due
          </h3>
          <p className="mt-2 text-sm text-text-mid">
            We&rsquo;ll nudge you two weeks and three days before each task
            deadline so nothing slips through.
          </p>
        </header>

        {/* Channel toggle */}
        <div role="radiogroup" aria-label="Reminder channel" className="mb-5 inline-flex rounded-pill border border-border bg-bg-soft p-1">
          {(["email", "sms", "both"] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              role="radio"
              aria-checked={alertChannel === ch}
              onClick={() => setAlertChannel(ch)}
              className={`rounded-pill px-4 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                alertChannel === ch
                  ? "bg-rose text-white"
                  : "text-text-mid hover:text-rose"
              }`}
            >
              {ch === "email" ? "Email" : ch === "sms" ? "SMS" : "Both"}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(alertChannel === "email" || alertChannel === "both") && (
            <div>
              <label htmlFor="alert-email" className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
                Email
              </label>
              <input
                id="alert-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-pill border border-border bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              />
            </div>
          )}
          {(alertChannel === "sms" || alertChannel === "both") && (
            <div>
              <label htmlFor="alert-phone" className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-text-muted">
                Phone (SMS)
              </label>
              <input
                id="alert-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={alertPhone}
                onChange={(e) => setAlertPhone(e.target.value)}
                placeholder="(905) 555-0142"
                className="mt-1 w-full rounded-pill border border-border bg-white px-4 py-2.5 text-sm text-charcoal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2"
              />
            </div>
          )}
        </div>

        {alertError && (
          <p className="mt-3 text-sm text-red-600">{alertError}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submitAlertSignup}
            disabled={alertSubmitting}
            className="inline-flex items-center gap-2 rounded-pill bg-rose px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {alertSubmitting ? "Saving…" : alertSavedAt ? "Update reminders" : "Start reminders"}
            <span aria-hidden>→</span>
          </button>
          {alertSavedAt && !alertError && !alertSubmitting && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-100 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-emerald-700">
              <svg aria-hidden viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Reminders active
            </span>
          )}
        </div>

        <p className="mt-4 text-[0.7rem] leading-relaxed text-text-muted">
          We&rsquo;ll remind you 2 weeks and 3 days before each task deadline.
          Standard messaging rates may apply.
        </p>
      </section>
    </div>
  );
}
