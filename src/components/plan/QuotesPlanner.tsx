"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/* /plan/quotes — 3-step UI:
 *
 *   1. Shortlist (grouped by saved category)
 *   2. Email preview (AI-generated 3-part template, editable)
 *   3. Send batch (per-vendor personalised dispatch)
 *
 * Each step lives in its own collapsing card so a couple can step
 * back and forth without losing selection state. State lifted to the
 * top of the component so step navigation never resets it.
 */

export type ShortlistVendor = {
  id:            number;
  slug:          string;
  name:          string;
  email:         string | null;
  category:      string;
  city:          string | null;
  googleRating:  number | null;
  reviewCount:   number | null;
  startingFrom:  string | null;
  lastContacted: string | null;   /* ISO timestamp */
};

type Template = {
  opening:            string;
  categoryParagraphs: Record<string, string>;
  closing:            string;
  signoff:            string;
  generatedAt?:       string;
};

const DEDUPE_DAYS = 30;

const CATEGORY_META: Record<string, { label: string; plural: string; icon: React.ReactNode }> = {
  photographer:    { label: "Photographer",     plural: "Photographers",       icon: iconPhoto() },
  videographer:    { label: "Videographer",     plural: "Videographers",       icon: iconVideo() },
  dj:              { label: "DJ",               plural: "DJs",                 icon: iconDj() },
  florist:         { label: "Florist",          plural: "Florists",            icon: iconFlorist() },
  catering:        { label: "Caterer",          plural: "Caterers",            icon: iconCatering() },
  cake:            { label: "Cake designer",    plural: "Cake designers",      icon: iconCake() },
  hair_makeup:     { label: "Hair & makeup",    plural: "Hair & makeup",       icon: iconHair() },
  officiant:       { label: "Officiant",        plural: "Officiants",          icon: iconOfficiant() },
  limo:            { label: "Limo / transport", plural: "Limo services",       icon: iconLimo() },
  photo_booth:     { label: "Photo booth",      plural: "Photo booths",        icon: iconPhoto() },
  lighting_decor:  { label: "Lighting & decor", plural: "Lighting & decor",    icon: iconBulb() },
  wedding_planner: { label: "Planner",          plural: "Wedding planners",    icon: iconChecklist() },
};

function categoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? { label: cat, plural: cat, icon: iconChecklist() };
}

export function QuotesPlanner({
  shortlist,
  partner1Name,
  partner2Name,
  weddingDate,
  venueLabel,
  region: _region,
  guestCount: _guestCount,
  coupleEmail: initialCoupleEmail,
  publicUrl,
  quotesSentAt: _quotesSentAt,
  cachedTemplate,
  comingSoon = false,
}: {
  shortlist:    ShortlistVendor[];
  partner1Name: string;
  partner2Name: string;
  weddingDate:  string | null;
  venueLabel:   string | null;
  region:       string | null;
  guestCount:   number | null;
  coupleEmail:  string;
  publicUrl:    string | null;
  quotesSentAt: string | null;
  cachedTemplate: string | null;
  /** When true, the shortlist + selection UI still renders, but the
   *  Generate / Send / Preview blocks are replaced with a "Quote
   *  requests coming soon" banner. Used while vendors.email is empty
   *  across the directory and there's nobody to send to. */
  comingSoon?:  boolean;
}) {
  /* ── Selection state ───────────────────────────────────────────── */
  /* Pre-check vendors that (a) have an email, (b) aren't already in
   * the 30-day dedupe window. Stale rows still show, just unchecked. */
  const [selected, setSelected] = useState<Set<number>>(() => {
    const out = new Set<number>();
    for (const v of shortlist) {
      if (!v.email) continue;
      if (recentlyContacted(v.lastContacted)) continue;
      out.add(v.id);
    }
    return out;
  });

  /* ── Step state ────────────────────────────────────────────────── */
  const [step, setStep] = useState<1 | 2 | 3>(1);

  /* ── Template state ────────────────────────────────────────────── */
  const [template, setTemplate] = useState<Template | null>(() => {
    if (!cachedTemplate) return null;
    try { return JSON.parse(cachedTemplate) as Template; } catch { return null; }
  });
  const [generating, setGenerating]   = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  /* ── Send state ────────────────────────────────────────────────── */
  const [coupleEmail, setCoupleEmail] = useState(initialCoupleEmail);
  const [sending, setSending]         = useState(false);
  const [sendResult, setSendResult]   = useState<SendResult | null>(null);
  const [sendError, setSendError]     = useState<string | null>(null);

  /* ── Derived ──────────────────────────────────────────────────── */
  const grouped = useMemo(() => groupByCategory(shortlist), [shortlist]);
  const categoriesInSelection = useMemo(() => {
    const out = new Set<string>();
    for (const v of shortlist) if (selected.has(v.id)) out.add(v.category);
    return Array.from(out);
  }, [shortlist, selected]);
  const selectedVendors = useMemo(
    () => shortlist.filter((v) => selected.has(v.id)),
    [shortlist, selected],
  );
  const selectedWithEmail   = selectedVendors.filter((v) => v.email);
  const selectedNoEmail     = selectedVendors.filter((v) => !v.email);
  const selectedRecent      = selectedVendors.filter((v) => v.email && recentlyContacted(v.lastContacted));
  const canSend             = selectedWithEmail.length > 0 && !!weddingDate && !!venueLabel;
  const missingDate         = !weddingDate;
  const missingVenue        = !venueLabel;

  /* ── Handlers ─────────────────────────────────────────────────── */

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(shortlist.filter((v) => v.email).map((v) => v.id)));
  }
  function selectNone() {
    setSelected(new Set());
  }
  function selectCategory(cat: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const v of shortlist) {
        if (v.category !== cat || !v.email) continue;
        if (on) next.add(v.id);
        else    next.delete(v.id);
      }
      return next;
    });
  }

  async function generate() {
    if (categoriesInSelection.length === 0) {
      setGenerateError("Select at least one vendor first.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/quotes/generate-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ categories: categoriesInSelection }),
      });
      const body = (await res.json()) as { ok?: boolean; template?: Template; error?: string };
      if (!res.ok || !body.template) {
        throw new Error(body.error ?? `generate ${res.status}`);
      }
      setTemplate(body.template);
      setEditing(false);
      if (step === 1) setStep(2);
    } catch (err) {
      console.error("[quotes-planner] generate failed", err);
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function send(force = false) {
    if (!template) return;
    if (!isEmail(coupleEmail)) {
      setSendError("Add a valid contact email so vendors can reply to you.");
      return;
    }
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/quotes/send-bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          vendorIds:   selectedWithEmail.map((v) => v.id),
          coupleEmail,
          template,
          force,
        }),
      });
      const body = (await res.json()) as SendResultBody;
      if (!res.ok) {
        if (body.code === "MISSING_DATE")   setSendError("Set your wedding date in the planner tab first.");
        else if (body.code === "MISSING_VENUE") setSendError("Pick a venue in the planner tab first.");
        else if (body.code === "RATE_LIMITED")  setSendError(body.error ?? "Too many batches. Wait 10 minutes.");
        else                                    setSendError(body.error ?? `Send failed (${res.status})`);
        return;
      }
      setSendResult({
        sent:    body.sent ?? 0,
        skipped: body.skipped ?? [],
        failed:  body.failed ?? [],
      });
      setStep(3);
    } catch (err) {
      console.error("[quotes-planner] send failed", err);
      setSendError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      <ProgressBar step={step} />

      {comingSoon && (
        <div className="rounded-card border-2 border-rose bg-rose-pale p-5 lg:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose">
            Coming soon
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold leading-tight text-charcoal lg:text-2xl">
            Quote requests are coming soon
          </h2>
          <p className="mt-2 max-w-[640px] text-sm text-text-mid">
            Vendors are claiming their listings now — once they confirm
            their inboxes, you&rsquo;ll be able to send a personalised
            inquiry to every vendor on your shortlist with one click.
            Until then, save your favourites and reach out via their
            website or phone number on each vendor&rsquo;s page.
          </p>
        </div>
      )}

      {/* Step 1 — Shortlist */}
      <Card>
        <StepHeader n={1} title="Pick who to contact" />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-sm text-text-mid">
          <div>
            {selectedWithEmail.length} of {shortlist.filter((v) => v.email).length} selected
            {selectedNoEmail.length > 0 && (
              <span className="ml-2 text-xs text-amber-700">
                · {selectedNoEmail.length} excluded (no email)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ChipButton onClick={selectAll}>Select all</ChipButton>
            <ChipButton onClick={selectNone}>Select none</ChipButton>
          </div>
        </div>

        <ul className="mt-5 space-y-5">
          {Object.entries(grouped).map(([cat, list]) => {
            const meta = categoryMeta(cat);
            const inCat = list.filter((v) => v.email);
            const allOn = inCat.length > 0 && inCat.every((v) => selected.has(v.id));
            return (
              <li key={cat}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-text-mid">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-pale text-rose">
                      {meta.icon}
                    </span>
                    {meta.plural}
                    <span className="text-text-muted">({list.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectCategory(cat, !allOn)}
                    className="text-xs font-bold text-rose hover:underline"
                  >
                    {allOn ? "Unselect all in category" : "Select all in category"}
                  </button>
                </div>
                <ul className="divide-y divide-border-light overflow-hidden rounded-card border border-border-light bg-white">
                  {list.map((v) => (
                    <VendorRow
                      key={v.id}
                      vendor={v}
                      checked={selected.has(v.id)}
                      onToggle={() => toggle(v.id)}
                    />
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        {(missingDate || missingVenue) && (
          <div className="mt-5 rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Before you can send:</strong>{" "}
            {missingDate  && <span>set your wedding date</span>}
            {missingDate && missingVenue && <span> and </span>}
            {missingVenue && <span>pick a venue</span>}
            <span> in the </span>
            <Link href="/plan" className="font-bold underline">planner tab</Link>.
            You can still generate a preview here.
          </div>
        )}

        {!comingSoon && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={generate}
              disabled={selectedWithEmail.length === 0 || generating}
              className="rounded-pill bg-rose px-6 py-3 text-base font-bold text-white shadow-[0_8px_24px_rgba(185,100,118,0.32)] transition-all hover:bg-rose-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating
                ? "Generating…"
                : template
                  ? `Re-generate email (${selectedWithEmail.length}) →`
                  : `Generate email (${selectedWithEmail.length}) →`}
            </button>
          </div>
        )}
        {!comingSoon && generateError && (
          <p className="mt-3 text-right text-sm text-red-600">{generateError}</p>
        )}
      </Card>

      {/* Step 2 — Email preview. Hidden when comingSoon since Step 1's
       * Generate button is hidden too, so there's never a template to
       * preview in that state. */}
      {!comingSoon && template && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <StepHeader n={2} title="Preview the email" />
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="rounded-pill border border-border bg-white px-4 py-2 text-xs font-bold text-charcoal hover:border-rose hover:text-rose"
            >
              {editing ? "Done editing" : "Edit email"}
            </button>
          </div>
          <p className="mt-1 text-sm text-text-mid">
            The opening + closing are shared. Each category gets its own
            paragraph. <code className="rounded-pill bg-rose-pale px-1.5 py-0.5 text-[0.65rem] font-bold text-rose">{"{vendorFirstName}"}</code>{" "}
            is replaced with each vendor&rsquo;s first name when sent.
          </p>

          <div className="mt-5 space-y-5">
            <PreviewBlock
              label="Opening (shared)"
              value={template.opening}
              editable={editing}
              onChange={(s) => setTemplate({ ...template, opening: s })}
              highlightToken="{vendorFirstName}"
            />
            {/* Show every category paragraph in the template so the
             * couple sees what's available, then mark the ones not in
             * the current selection as "not in this batch". */}
            {Object.keys(template.categoryParagraphs).map((cat) => {
              const inSelection = categoriesInSelection.includes(cat);
              return (
                <PreviewBlock
                  key={cat}
                  label={`Paragraph — ${categoryMeta(cat).label}${inSelection ? "" : " (not in this batch)"}`}
                  value={template.categoryParagraphs[cat] ?? ""}
                  editable={editing}
                  onChange={(s) => setTemplate({
                    ...template,
                    categoryParagraphs: { ...template.categoryParagraphs, [cat]: s },
                  })}
                />
              );
            })}
            <PreviewBlock
              label="Closing (shared)"
              value={template.closing}
              editable={editing}
              onChange={(s) => setTemplate({ ...template, closing: s })}
            />
            <PreviewBlock
              label="Sign-off"
              value={template.signoff}
              editable={editing}
              onChange={(s) => setTemplate({ ...template, signoff: s })}
            />
          </div>

          {publicUrl && (
            <p className="mt-4 rounded-card border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              ✓ Your published wedding site at{" "}
              <span className="font-bold">{publicUrl.replace(/^https?:\/\//, "")}</span>{" "}
              will be linked in the closing of every email.
            </p>
          )}
        </Card>
      )}

      {/* Step 3 — Send */}
      {template && (
        <Card>
          <StepHeader n={3} title="Send" />

          <label className="mt-4 block">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-charcoal">
              Your reply-to email
            </div>
            <p className="mt-0.5 text-[0.7rem] text-text-muted">
              Vendors hit Reply on the email and their response goes here.
            </p>
            <input
              type="email"
              value={coupleEmail}
              onChange={(e) => setCoupleEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-pill border border-border bg-white px-4 py-2 text-sm placeholder:text-text-muted focus:border-rose focus:outline-none"
            />
          </label>

          {selectedRecent.length > 0 && (
            <div className="mt-5 rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>You&rsquo;ve already contacted:</strong>
              <ul className="mt-2 list-disc pl-5">
                {selectedRecent.map((v) => (
                  <li key={v.id}>
                    {v.name} on {formatDate(v.lastContacted!)} —
                    {" "}they&rsquo;ll be skipped unless you confirm a re-send.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedNoEmail.length > 0 && (
            <div className="mt-5 rounded-card border border-border bg-bg-soft p-4 text-sm text-text-mid">
              <strong>No contact email on file:</strong>{" "}
              {selectedNoEmail.map((v) => v.name).join(", ")}. We&rsquo;ll
              skip these — you can still reach out via their website.
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-text-mid">
              About to send{" "}
              <span className="font-bold text-charcoal">{selectedWithEmail.length}</span>{" "}
              {selectedWithEmail.length === 1 ? "email" : "emails"}
              {selectedRecent.length > 0 && (
                <span className="text-amber-700">
                  {" "}({selectedRecent.length} already contacted)
                </span>
              )}.
            </div>
            <div className="flex items-center gap-2">
              {selectedRecent.length > 0 ? (
                <button
                  type="button"
                  onClick={() => send(true)}
                  disabled={!canSend || sending || !isEmail(coupleEmail)}
                  className="rounded-pill border border-rose bg-white px-5 py-3 text-sm font-bold text-rose hover:bg-rose-pale disabled:opacity-50"
                >
                  Send again anyway →
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => send(false)}
                disabled={!canSend || sending || !isEmail(coupleEmail)}
                className="rounded-pill bg-rose px-6 py-3 text-base font-bold text-white shadow-[0_8px_24px_rgba(185,100,118,0.32)] transition-all hover:bg-rose-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending
                  ? "Sending…"
                  : `Send to ${selectedWithEmail.length} ${selectedWithEmail.length === 1 ? "vendor" : "vendors"} →`}
              </button>
            </div>
          </div>

          {sendError && <p className="mt-3 text-right text-sm text-red-600">{sendError}</p>}
        </Card>
      )}

      {/* Post-send confirmation */}
      {sendResult && (
        <Card>
          <div className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-emerald-700">
            Sent ✓
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold text-charcoal">
            {sendResult.sent} {sendResult.sent === 1 ? "email" : "emails"} sent.
          </h2>
          <p className="mt-1 text-sm text-text-mid">
            Replies will arrive at{" "}
            <span className="font-bold text-charcoal">{coupleEmail}</span>.
          </p>

          {sendResult.skipped.length > 0 && (
            <div className="mt-4 rounded-card border border-border bg-bg-soft p-4 text-sm text-text-mid">
              <strong>Skipped ({sendResult.skipped.length}):</strong>
              <ul className="mt-2 list-disc pl-5">
                {sendResult.skipped.map((s, i) => (
                  <li key={i}>
                    {s.name} — {skipReasonLabel(s.status)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sendResult.failed.length > 0 && (
            <div className="mt-4 rounded-card border border-red-300 bg-red-50 p-4 text-sm text-red-900">
              <strong>Failed ({sendResult.failed.length}):</strong>
              <ul className="mt-2 list-disc pl-5">
                {sendResult.failed.map((f, i) => (
                  <li key={i}>{f.name} — {f.error}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                These weren&rsquo;t sent. You can retry the batch in 10 minutes.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/plan"
              className="rounded-pill border border-border bg-white px-4 py-2 text-sm font-bold text-charcoal hover:border-rose hover:text-rose"
            >
              Back to planner
            </Link>
            <button
              type="button"
              onClick={() => {
                setSendResult(null);
                setSelected(new Set());
                setStep(1);
              }}
              className="rounded-pill border border-border bg-white px-4 py-2 text-sm font-bold text-charcoal hover:border-rose hover:text-rose"
            >
              Send another batch
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────── shared atoms ─────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-white p-6 lg:p-7">{children}</section>
  );
}

function StepHeader({ n, title }: { n: 1 | 2 | 3; title: string }) {
  return (
    <div>
      <div className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-rose">
        Step {n} of 3
      </div>
      <h2 className="mt-1 font-display text-2xl font-semibold text-charcoal">{title}</h2>
    </div>
  );
}

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const STEPS: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "Shortlist" },
    { n: 2, label: "Preview"   },
    { n: 3, label: "Send"      },
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
                isDone   ? "bg-emerald-500 text-white"
                : isActive ? "bg-rose text-white"
                : "bg-bg-soft text-text-muted"
              }`}
            >
              {isDone ? "✓" : s.n}
            </span>
            <span className={`hidden font-bold uppercase tracking-[0.12em] sm:inline ${
              isActive ? "text-charcoal" : "text-text-muted"
            }`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className={`ml-1 hidden h-px flex-1 sm:block ${
                isDone ? "bg-emerald-300" : "bg-border"
              }`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ChipButton({
  onClick, children,
}: {
  onClick:  () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-pill border border-border bg-white px-3 py-1 text-xs font-bold text-charcoal hover:border-rose hover:text-rose"
    >
      {children}
    </button>
  );
}

function VendorRow({
  vendor, checked, onToggle,
}: {
  vendor:   ShortlistVendor;
  checked:  boolean;
  onToggle: () => void;
}) {
  const noEmail = !vendor.email;
  const wasContacted = !!vendor.lastContacted;
  return (
    <li className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 ${noEmail ? "opacity-60" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={noEmail}
        aria-label={`Select ${vendor.name}`}
        className="h-4 w-4 accent-rose"
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-charcoal">
          {vendor.name}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.7rem] text-text-mid">
          {vendor.city && <span>{vendor.city}</span>}
          {vendor.googleRating != null && (
            <span>
              <span className="text-gold">★</span> {vendor.googleRating.toFixed(1)}
              {vendor.reviewCount ? ` (${vendor.reviewCount})` : ""}
            </span>
          )}
          {vendor.startingFrom && <span>{vendor.startingFrom}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {noEmail && (
          <span className="inline-flex items-center rounded-pill bg-amber-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-amber-800">
            No contact email
          </span>
        )}
        {wasContacted && !noEmail && (
          <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-emerald-700">
            ✓ Contacted {formatDate(vendor.lastContacted!)}
          </span>
        )}
      </div>
    </li>
  );
}

function PreviewBlock({
  label, value, editable, onChange, highlightToken,
}: {
  label:          string;
  value:          string;
  editable:       boolean;
  onChange:       (s: string) => void;
  highlightToken?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-bg-warm p-4">
      <div className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-text-muted">
        {label}
      </div>
      {editable ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.max(3, Math.ceil(value.length / 80))}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm leading-relaxed focus:border-rose focus:outline-none"
        />
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">
          {highlightToken
            ? renderWithHighlight(value, highlightToken)
            : value}
        </p>
      )}
    </div>
  );
}

function renderWithHighlight(text: string, token: string): React.ReactNode {
  const parts = text.split(token);
  if (parts.length === 1) return text;
  return parts.flatMap((p, i) =>
    i < parts.length - 1
      ? [p, <span key={i} className="rounded-pill bg-rose-pale px-1.5 py-0.5 font-bold text-rose">{token}</span>]
      : [p],
  );
}

/* ─────────────────── helpers ──────────────────────────────────── */

function recentlyContacted(iso: string | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < DEDUPE_DAYS * 24 * 60 * 60 * 1000;
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return iso;
  }
}

function groupByCategory(list: ShortlistVendor[]): Record<string, ShortlistVendor[]> {
  /* Preserve a stable category order matching CATEGORY_META key order
   * so the UI doesn't flip rows when selection changes. */
  const out: Record<string, ShortlistVendor[]> = {};
  const order = Object.keys(CATEGORY_META);
  const remaining = new Set(list.map((v) => v.category));
  for (const cat of order) {
    if (!remaining.has(cat)) continue;
    out[cat] = list.filter((v) => v.category === cat);
    remaining.delete(cat);
  }
  for (const cat of remaining) {
    out[cat] = list.filter((v) => v.category === cat);
  }
  return out;
}

type SkipReason =
  | { vendorId: number; status: "no-email";   name: string }
  | { vendorId: number; status: "deduped";    name: string; previousSentAt: string | null }
  | { vendorId: number; status: "no-paragraph"; name: string; category: string | null };

type FailedReason = { vendorId: number; status: "send-failed"; name: string; error: string };

type SendResult = {
  sent:    number;
  skipped: SkipReason[];
  failed:  FailedReason[];
};

type SendResultBody = {
  ok?:      boolean;
  sent?:    number;
  skipped?: SkipReason[];
  failed?:  FailedReason[];
  error?:   string;
  code?:    string;
};

function skipReasonLabel(s: SkipReason["status"]): string {
  switch (s) {
    case "no-email":     return "no contact email";
    case "deduped":      return "already contacted in the last 30 days";
    case "no-paragraph": return "no category paragraph generated";
    default:             return s;
  }
}

/* ─────────────── tiny SVG icons (1.5px stroke) ─────────────────── */

function svg(d: React.ReactNode) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
}
function iconPhoto()    { return svg(<><path d="M3 8h3l2-2h8l2 2h3v11H3z" /><circle cx="12" cy="13" r="3.5" /></>); }
function iconVideo()    { return svg(<><rect x="3" y="7" width="13" height="10" rx="1.5" /><path d="M16 11l5-3v8l-5-3z" /></>); }
function iconDj()       { return svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>); }
function iconFlorist()  { return svg(<><circle cx="12" cy="8" r="2.5" /><path d="M12 11v10" /><path d="M12 17l-3-1m3 1l3-1" /></>); }
function iconCatering() { return svg(<><path d="M3 15h18a8 8 0 0 0-16 0z" /><path d="M3 18h18" /></>); }
function iconCake()     { return svg(<><path d="M5 21V11h14v10z" /><path d="M5 14h14" /><path d="M12 11V7" /></>); }
function iconHair()     { return svg(<><circle cx="9" cy="9" r="6" /><path d="M16 11l5 5-2 2-5-5z" /></>); }
function iconOfficiant(){ return svg(<><path d="M4 4v16h7V4z" /><path d="M13 4v16h7V4z" /></>); }
function iconLimo()     { return svg(<><path d="M3 15v3h18v-3l-2-5H5z" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" /></>); }
function iconBulb()     { return svg(<><path d="M7 7a5 5 0 0 1 10 0c0 3-2 4-2.5 5h-5C9 11 7 10 7 7z" /><path d="M9 18h6M10 21h4" /></>); }
function iconChecklist(){ return svg(<><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M7 14l2 2 4-4" /></>); }
