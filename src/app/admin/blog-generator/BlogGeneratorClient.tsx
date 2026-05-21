"use client";

import { useEffect, useMemo, useState } from "react";

type Region = "niagara" | "gta" | "hamilton" | "all";
type Category =
  | "photographer" | "videographer" | "dj" | "florist" | "officiant"
  | "hair_makeup" | "catering" | "wedding_planner" | "cake" | "limo"
  | "photo_booth" | "lighting_decor" | "venue" | "";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "",                label: "(none — venue or topic-focused)" },
  { value: "venue",           label: "Venue" },
  { value: "photographer",    label: "Photographer" },
  { value: "videographer",    label: "Videographer" },
  { value: "dj",              label: "DJ" },
  { value: "florist",         label: "Florist" },
  { value: "officiant",       label: "Officiant" },
  { value: "hair_makeup",     label: "Hair & Makeup" },
  { value: "catering",        label: "Catering" },
  { value: "wedding_planner", label: "Wedding Planner" },
  { value: "cake",            label: "Cake" },
  { value: "limo",            label: "Limo / Transportation" },
  { value: "photo_booth",     label: "Photo Booth" },
  { value: "lighting_decor",  label: "Lighting & Decor" },
];

type InternalLink = { text: string; url: string; kind: string };

type GeneratedDraft = {
  title:           string;
  slug:            string;
  metaDescription: string;
  content:         string;
  publishDate:     string;
  internalLinks:   InternalLink[];
  wordCount:       number;
  diagnostics: {
    competitorHeadings: string[];
    pricingUsed:        Record<string, { min: number; median: number; max: number }>;
    vendorsLinked:      { name: string; slug: string; city: string | null; rating: string | null }[];
    venuesLinked:       { name: string; slug: string; city: string | null; rating: string | null }[];
  };
};

const TOKEN_COOKIE_RE = /owv_admin_token=([^;]+)/;

function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(TOKEN_COOKIE_RE);
  return m ? decodeURIComponent(m[1]) : null;
}

export function BlogGeneratorClient({ bootstrapToken }: { bootstrapToken?: string }) {
  /* Persist the token cookie on first visit so subsequent reloads
   * don't need the ?token=... query param. 6-month expiry — admin
   * URL is shareable but not indefinite. */
  useEffect(() => {
    if (!bootstrapToken) return;
    document.cookie =
      `owv_admin_token=${encodeURIComponent(bootstrapToken)}; ` +
      `path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    /* Strip the token out of the URL so it doesn't leak via referer. */
    const u = new URL(window.location.href);
    u.searchParams.delete("token");
    window.history.replaceState({}, "", u.toString());
  }, [bootstrapToken]);

  const [topic,         setTopic]         = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [targetRegion,  setTargetRegion]  = useState<Region>("niagara");
  const [category,      setCategory]      = useState<Category>("");
  const [internalLinkCount, setInternalLinkCount] = useState(2);

  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [draft,      setDraft]      = useState<GeneratedDraft | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  /* Editable fields override the generator output so the admin can
   * tweak the title or slug before saving. */
  const [editedTitle,   setEditedTitle]   = useState("");
  const [editedSlug,    setEditedSlug]    = useState("");
  const [editedMeta,    setEditedMeta]    = useState("");
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    if (!draft) return;
    setEditedTitle(draft.title);
    setEditedSlug(draft.slug);
    setEditedMeta(draft.metaDescription);
    setEditedContent(draft.content);
  }, [draft]);

  const tokenHeader = useMemo<Record<string, string>>(() => {
    const t = readCookieToken();
    const out: Record<string, string> = {};
    if (t) out.authorization = `Bearer ${t}`;
    return out;
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setSaveStatus(null);
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "content-type": "application/json", ...tokenHeader },
        body:    JSON.stringify({
          topic, competitorUrl, targetKeyword, targetRegion,
          category: category === "" ? null : category,
          internalLinkCount,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Generate failed (${res.status})`);
      }
      setDraft(json.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setSaveStatus(null);
    try {
      const res = await fetch("/api/blog/save-draft", {
        method: "POST",
        headers: { "content-type": "application/json", ...tokenHeader },
        body:    JSON.stringify({
          slug:            editedSlug,
          title:           editedTitle,
          metaDescription: editedMeta,
          contentMdx:      editedContent,
          topic,
          targetKeyword,
          targetRegion,
          category: category === "" ? undefined : category,
          competitorUrl,
          internalLinks:   draft.internalLinks,
          wordCount:       editedContent.trim().split(/\s+/).filter(Boolean).length,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Save failed (${res.status})`);
      }
      setSaveStatus(`Saved as draft #${json.id} (${json.status}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="bg-bg-warm min-h-screen">
      <div className="mx-auto max-w-[1180px] px-6 py-10 lg:py-14">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose">
            Admin
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal lg:text-4xl">
            Blog generator
          </h1>
          <p className="mt-2 max-w-[640px] text-sm text-text-mid">
            Ingest a topic + competitor URL, generate an Ontario-localized post
            with real pricing + internal links, review, and save as draft.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          {/* ─── Form ──────────────────────────────────────── */}
          <form
            onSubmit={handleGenerate}
            className="space-y-4 rounded-card border border-border bg-white p-6"
          >
            <Field label="Topic">
              <input
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="How to plan a winter wedding in Ontario"
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Competitor URL">
              <input
                required type="url"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                placeholder="https://www.theknot.com/content/winter-wedding-tips"
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Target keyword">
              <input
                required
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                placeholder="Ontario winter wedding"
                className={INPUT_CLASS}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Target region">
                <select
                  value={targetRegion}
                  onChange={(e) => setTargetRegion(e.target.value as Region)}
                  className={INPUT_CLASS}
                >
                  <option value="niagara">Niagara</option>
                  <option value="gta">GTA</option>
                  <option value="hamilton">Hamilton & Burlington</option>
                  <option value="all">All Ontario</option>
                </select>
              </Field>

              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className={INPUT_CLASS}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Internal link count">
              <input
                type="number" min={1} max={4}
                value={internalLinkCount}
                onChange={(e) => setInternalLinkCount(Number(e.target.value))}
                className={INPUT_CLASS}
              />
            </Field>

            <button
              type="submit"
              disabled={generating}
              className="w-full rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate draft"}
            </button>

            {error && (
              <p className="rounded-card border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                {error}
              </p>
            )}
          </form>

          {/* ─── Preview ──────────────────────────────────── */}
          <section className="space-y-4">
            {!draft ? (
              <div className="rounded-card border border-dashed border-border bg-white p-10 text-center">
                <p className="font-display text-xl text-charcoal">
                  No draft generated yet
                </p>
                <p className="mt-2 text-sm text-text-mid">
                  Fill the form on the left and click <em>Generate draft</em>.
                  Generation takes 15–30 seconds.
                </p>
              </div>
            ) : (
              <>
                {/* Editable header strip */}
                <div className="rounded-card border border-border bg-white p-6">
                  <Field label="Title">
                    <input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
                    <Field label="Slug">
                      <input
                        value={editedSlug}
                        onChange={(e) =>
                          setEditedSlug(
                            e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"),
                          )
                        }
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <div className="flex items-end">
                      <span className="text-xs text-text-muted">
                        {editedContent.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                  </div>
                  <Field label="Meta description">
                    <textarea
                      value={editedMeta}
                      onChange={(e) => setEditedMeta(e.target.value)}
                      rows={2}
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>

                {/* Body editor */}
                <div className="rounded-card border border-border bg-white p-6">
                  <h2 className="font-display text-lg text-charcoal">Body (Markdown)</h2>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={24}
                    className="mt-3 w-full rounded border border-border bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-charcoal focus:border-rose focus:outline-none"
                  />
                </div>

                {/* Diagnostics — what the generator pulled */}
                <details className="rounded-card border border-border bg-white p-6">
                  <summary className="cursor-pointer font-display text-lg text-charcoal">
                    Generation diagnostics
                  </summary>
                  <div className="mt-4 space-y-4 text-sm text-text-mid">
                    <div>
                      <strong className="text-charcoal">Competitor headings:</strong>
                      <ul className="mt-1 list-disc pl-5">
                        {draft.diagnostics.competitorHeadings.length === 0 ? (
                          <li className="text-text-muted">None extracted.</li>
                        ) : draft.diagnostics.competitorHeadings.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong className="text-charcoal">Internal links:</strong>
                      <ul className="mt-1 list-disc pl-5">
                        {draft.internalLinks.map((l, i) => (
                          <li key={i}>
                            <a href={l.url} target="_blank" rel="noopener" className="text-rose hover:underline">
                              {l.text}
                            </a>{" "}
                            <span className="text-text-muted">({l.kind})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong className="text-charcoal">Pricing used:</strong>
                      <pre className="mt-1 overflow-auto rounded bg-bg-soft p-3 text-xs">
                        {JSON.stringify(draft.diagnostics.pricingUsed, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>

                {/* Save button */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save as draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(editedContent);
                      setSaveStatus("Markdown copied to clipboard.");
                    }}
                    className="rounded-pill border-2 border-rose px-6 py-3 text-sm font-bold text-rose transition-colors hover:bg-rose-pale"
                  >
                    Copy Markdown
                  </button>
                  {saveStatus && (
                    <span className="text-sm text-emerald-700">{saveStatus}</span>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

const INPUT_CLASS =
  "block w-full rounded border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-rose focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-text-mid">
        {label}
      </span>
      {children}
    </label>
  );
}
