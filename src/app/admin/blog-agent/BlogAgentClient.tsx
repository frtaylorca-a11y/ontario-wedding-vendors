"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────── */

type Tab = "run" | "scout" | "posts" | "newsletter" | "settings";

type ScoutRow = {
  id:           number;
  title:        string;
  sourceName:   string;
  sourceUrl:    string | null;
  score:        number | null;
  used:         boolean | null;
  usedAt:       string | null;
  ourPostSlug:  string | null;
  discoveredAt: string | null;
};

type PostRow = {
  id:              number;
  slug:            string;
  title:           string;
  wordCount:       number | null;
  sourceDirectory: string | null;
  publishedAt:     string | null;
  isPublished:     boolean | null;
  heroImageUrl:    string | null;
  isAiGenerated:   boolean | null;
  distribution:    Record<string, string>;
};

type Settings = {
  autoPublish:       boolean;
  dailyRunEnabled:   boolean;
  minWordCount:      number;
  maxWordCount:      number;
  wordCountPillar:   number;
  wordCountStandard: number;
  wordCountLocal:    number;
  launchBurstLimit:  number;
  clusterMode:       boolean;
  currentCluster:    string | null;
  targetRegions:     string[];
} | null;

type Platforms = {
  gbp: boolean; instagram: boolean; facebook: boolean; pinterest: boolean;
  openai: boolean; anthropic: boolean; brevo: boolean; r2: boolean;
};

type RunResult = {
  ok: boolean;
  reason?: string;
  topic?: string;
  slug?: string;
  postId?: number;
  wordCount?: number;
  autoPublished?: boolean;
  scoutLogged?: number;
  heroImage?: { status: string; url?: string; reason?: string };
  distribution?: Array<{ platform: string; status: string; reason?: string }>;
};

const TOKEN_COOKIE_RE = /owv_admin_token=([^;]+)/;
function readCookieToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(TOKEN_COOKIE_RE);
  return m ? decodeURIComponent(m[1]) : null;
}

/* ─── Component ──────────────────────────────────────────────────── */

export function BlogAgentClient({ bootstrapToken }: { bootstrapToken?: string }) {
  useEffect(() => {
    if (!bootstrapToken) return;
    document.cookie =
      `owv_admin_token=${encodeURIComponent(bootstrapToken)}; ` +
      `path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    const u = new URL(window.location.href);
    u.searchParams.delete("token");
    window.history.replaceState({}, "", u.toString());
  }, [bootstrapToken]);

  const tokenHeader = useMemo<Record<string, string>>(() => {
    const t = readCookieToken();
    const out: Record<string, string> = {};
    if (t) out.authorization = `Bearer ${t}`;
    return out;
  }, []);

  const [tab, setTab] = useState<Tab>("run");

  return (
    <main className="bg-bg-warm min-h-screen">
      <div className="mx-auto max-w-[1180px] px-6 py-10 lg:py-14">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose">Admin</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal lg:text-4xl">
            Blog agent
          </h1>
          <p className="mt-1 text-sm text-text-mid">
            Daily automated content pipeline — scout, generate, distribute.
          </p>
        </header>

        {/* Tab bar */}
        <nav className="mb-6 flex flex-wrap gap-2 border-b border-border">
          {([
            ["run",        "Run Now"],
            ["scout",      "Scout Log"],
            ["posts",      "Published Posts"],
            ["newsletter", "Newsletter"],
            ["settings",   "Settings"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "border-rose text-rose"
                  : "border-transparent text-text-mid hover:text-charcoal"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "run"        && <RunTab        tokenHeader={tokenHeader} />}
        {tab === "scout"      && <ScoutTab      tokenHeader={tokenHeader} />}
        {tab === "posts"      && <PostsTab      tokenHeader={tokenHeader} />}
        {tab === "newsletter" && <NewsletterTab tokenHeader={tokenHeader} />}
        {tab === "settings"   && <SettingsTab   tokenHeader={tokenHeader} />}
      </div>
    </main>
  );
}

/* ─── Tab: Run Now ───────────────────────────────────────────────── */

function RunTab({ tokenHeader }: { tokenHeader: Record<string, string> }) {
  const [running, setRunning] = useState<string | null>(null);
  const [log,     setLog]     = useState<string[]>([]);
  const [result,  setResult]  = useState<RunResult | null>(null);

  const appendLog = useCallback((line: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${line}`]);
  }, []);

  async function run(slot: "morning" | "afternoon" | "evening") {
    setRunning(slot);
    setResult(null);
    setLog([]);
    appendLog(`Triggering ${slot} pipeline…`);
    appendLog("Scout: fetching 10 wedding directories…");
    appendLog("Scout: scoring + dedupe vs existing posts…");
    appendLog("Generator: Claude Sonnet writing the post (15-90s)…");
    appendLog("Image pipeline: Claude → OpenAI gpt-image-1 → exiftool → R2");
    appendLog("Distribution: GBP + IG + FB + Pinterest in parallel");

    try {
      const res = await fetch(`/api/blog/daily-agent?run=${slot}`, {
        method: "POST",
        headers: tokenHeader,
      });
      const json = (await res.json()) as RunResult;
      setResult(json);
      appendLog(json.ok
        ? `Done — slug=${json.slug}, words=${json.wordCount}, published=${json.autoPublished}`
        : `Stopped — ${json.reason}`);
    } catch (err) {
      appendLog(`Failed — ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-border bg-white p-6">
        <h2 className="font-display text-xl text-charcoal">Trigger a pipeline run</h2>
        <p className="mt-1 text-sm text-text-mid">
          Each run scouts → picks a topic → generates ~1,500-2,000 words →
          renders a hero image → distributes to social. Drafts are saved
          unpublished when <code>auto_publish</code> is off in Settings.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(["morning", "afternoon", "evening"] as const).map((slot) => (
            <button
              key={slot}
              type="button"
              disabled={running !== null}
              onClick={() => run(slot)}
              className="rounded-pill bg-rose px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(185,100,118,0.3)] transition-all hover:bg-rose-hover disabled:opacity-50"
            >
              {running === slot ? "Running…" : `Run ${slot}`}
            </button>
          ))}
        </div>
      </div>

      {log.length > 0 && (
        <div className="rounded-card border border-border bg-charcoal p-4 font-mono text-xs text-white/80">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {result && <RunResultCard result={result} />}
    </div>
  );
}

function RunResultCard({ result }: { result: RunResult }) {
  if (!result.ok) {
    return (
      <div className="rounded-card border border-amber-300 bg-amber-50 p-5 text-sm">
        <p className="font-semibold text-amber-900">Run did not complete.</p>
        <p className="mt-1 text-amber-800">{result.reason}</p>
      </div>
    );
  }
  return (
    <div className="rounded-card border border-emerald-300 bg-emerald-50 p-5 text-sm">
      <p className="font-semibold text-emerald-900">
        Run complete · {result.autoPublished ? "PUBLISHED" : "DRAFT"} · {result.wordCount} words
      </p>
      <p className="mt-1">Topic: {result.topic}</p>
      <p>Slug: <a className="text-rose underline" href={`/blog/${result.slug}`} target="_blank" rel="noopener">/blog/{result.slug}</a></p>
      {result.heroImage && (
        <p className="mt-2">Hero image: {result.heroImage.status}{result.heroImage.reason ? ` (${result.heroImage.reason})` : ""}</p>
      )}
      {result.distribution && result.distribution.length > 0 && (
        <div className="mt-2">
          <p className="font-semibold">Distribution:</p>
          <ul className="ml-4 list-disc">
            {result.distribution.map((d) => (
              <li key={d.platform}>
                {d.platform}: {d.status}{d.reason ? ` — ${d.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Tab: Scout Log ─────────────────────────────────────────────── */

function ScoutTab({ tokenHeader }: { tokenHeader: Record<string, string> }) {
  const [rows, setRows] = useState<ScoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyUnused, setOnlyUnused] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/blog-agent/scout-log?onlyUnused=${onlyUnused ? "1" : "0"}&limit=200`, { headers: tokenHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setRows(json.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }, [onlyUnused, tokenHeader]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-white p-4">
        <label className="inline-flex items-center gap-2 text-sm text-text-mid">
          <input
            type="checkbox"
            checked={onlyUnused}
            onChange={(e) => setOnlyUnused(e.target.checked)}
          />
          Unused only (score ≥ 5)
        </label>
        <button
          type="button" onClick={() => void load()}
          className="rounded-pill border-2 border-rose px-4 py-1.5 text-xs font-bold text-rose hover:bg-rose-pale"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-card border border-red-300 bg-red-50 p-3 text-xs text-red-800">{error}</p>
      )}

      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-bg-soft text-left text-xs font-semibold uppercase tracking-wider text-text-mid">
            <tr>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2">Discovered</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {loading && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-text-muted">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-text-muted">No scout entries.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-bg-soft/50">
                <td className="px-3 py-2 text-xs text-text-muted">{r.sourceName}</td>
                <td className="px-3 py-2">
                  {r.sourceUrl
                    ? <a className="text-rose hover:underline" href={r.sourceUrl} target="_blank" rel="noopener">{r.title}</a>
                    : r.title}
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.score ?? 0}</td>
                <td className="px-3 py-2 text-xs text-text-muted">
                  {r.discoveredAt ? new Date(r.discoveredAt).toLocaleDateString("en-CA") : ""}
                </td>
                <td className="px-3 py-2">
                  {r.used
                    ? <span className="rounded-pill bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Used → {r.ourPostSlug}</span>
                    : <span className="rounded-pill bg-bg-soft px-2 py-0.5 text-xs text-text-mid">Available</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Published Posts ───────────────────────────────────────── */

const PLATFORM_ICON: Record<string, string> = {
  gbp:       "GBP",
  instagram: "IG",
  facebook:  "FB",
  pinterest: "PIN",
};

function PostsTab({ tokenHeader }: { tokenHeader: Record<string, string> }) {
  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/blog-agent/posts?limit=100`, { headers: tokenHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setRows(json.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }, [tokenHeader]);

  useEffect(() => { void load(); }, [load]);

  async function actOn(id: number, action: "unpublish" | "publish" | "delete") {
    if (action === "delete" && !confirm("Delete this post permanently?")) return;
    setActioning(id);
    try {
      const res = await fetch(`/api/admin/blog-agent/posts/${id}`, {
        method:  "POST",
        headers: { "content-type": "application/json", ...tokenHeader },
        body:    JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Action failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setActioning(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-card border border-border bg-white p-4">
        <p className="text-sm text-text-mid">{rows.length} posts</p>
        <button
          type="button" onClick={() => void load()}
          className="rounded-pill border-2 border-rose px-4 py-1.5 text-xs font-bold text-rose hover:bg-rose-pale"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-card border border-red-300 bg-red-50 p-3 text-xs text-red-800">{error}</p>
      )}

      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-bg-soft text-left text-xs font-semibold uppercase tracking-wider text-text-mid">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2 text-right">Words</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Platforms</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {loading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-text-muted">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-text-muted">No DB-rendered posts yet.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-bg-soft/50">
                <td className="px-3 py-2">
                  <a className="text-rose hover:underline" href={`/blog/${r.slug}`} target="_blank" rel="noopener">{r.title}</a>
                  {!r.isPublished && (
                    <span className="ml-2 rounded-pill bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">DRAFT</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-text-muted">
                  {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString("en-CA") : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.wordCount ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-text-muted">{r.sourceDirectory ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    {(["gbp", "instagram", "facebook", "pinterest"] as const).map((p) => {
                      const status = r.distribution[p];
                      const ok     = status === "published";
                      return (
                        <span
                          key={p}
                          className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${
                            ok ? "bg-emerald-100 text-emerald-800" : "bg-bg-soft text-text-muted"
                          }`}
                          title={status ?? "no attempt"}
                        >
                          {PLATFORM_ICON[p]} {ok ? "✓" : "·"}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1.5">
                    {r.isPublished ? (
                      <button
                        type="button"
                        disabled={actioning === r.id}
                        onClick={() => void actOn(r.id, "unpublish")}
                        className="rounded-pill border border-border px-2 py-0.5 text-[11px] hover:bg-bg-soft"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actioning === r.id}
                        onClick={() => void actOn(r.id, "publish")}
                        className="rounded-pill bg-rose px-2 py-0.5 text-[11px] text-white hover:bg-rose-hover"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={actioning === r.id}
                      onClick={() => void actOn(r.id, "delete")}
                      className="rounded-pill border border-red-300 px-2 py-0.5 text-[11px] text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Settings ──────────────────────────────────────────────── */

function SettingsTab({ tokenHeader }: { tokenHeader: Record<string, string> }) {
  const [settings, setSettings]   = useState<Settings>(null);
  const [platforms, setPlatforms] = useState<Platforms | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [status, setStatus]   = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; detail?: string }>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/blog-agent/settings", { headers: tokenHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setSettings(json.settings);
      setPlatforms(json.platforms);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [tokenHeader]);

  useEffect(() => { void load(); }, [load]);

  async function patch(updates: Partial<NonNullable<Settings>>) {
    if (!settings) return;
    setSaving(true); setError(null); setStatus(null);
    setSettings({ ...settings, ...updates });
    try {
      const res = await fetch("/api/admin/blog-agent/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json", ...tokenHeader },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setStatus("Saved.");
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setSaving(false); }
  }

  async function testPlatform(platform: string) {
    setTesting(platform);
    try {
      const res = await fetch(`/api/admin/blog-agent/test-connection?platform=${platform}`, {
        method: "POST", headers: tokenHeader,
      });
      const json = await res.json();
      setTestResult((prev) => ({ ...prev, [platform]: { ok: json.ok, detail: json.detail } }));
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [platform]: { ok: false, detail: err instanceof Error ? err.message : String(err) },
      }));
    } finally { setTesting(null); }
  }

  if (!settings || !platforms) {
    return <p className="rounded-card border border-border bg-white p-6 text-sm text-text-mid">Loading settings…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Toggles */}
      <div className="rounded-card border border-border bg-white p-6">
        <h2 className="font-display text-xl text-charcoal">Pipeline behaviour</h2>

        <div className="mt-4 space-y-3">
          <Toggle
            label="auto_publish"
            description="When ON, generated posts go live immediately. When OFF (default), they save as drafts for review."
            value={!!settings.autoPublish}
            onChange={(v) => void patch({ autoPublish: v })}
          />
          <Toggle
            label="daily_run_enabled"
            description="Master switch — when OFF the cron triggers return 202 without doing anything."
            value={!!settings.dailyRunEnabled}
            onChange={(v) => void patch({ dailyRunEnabled: v })}
          />
          <Toggle
            label="cluster_mode"
            description="Restrict the scout to a single topical lane to build authority faster."
            value={!!settings.clusterMode}
            onChange={(v) => void patch({ clusterMode: v })}
          />
        </div>

        {settings.clusterMode && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-mid">Active cluster</p>
            <div className="flex flex-wrap gap-2">
              {["photography", "venues", "budget", "planning", "vendors", "regional"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => void patch({ currentCluster: c })}
                  className={`rounded-pill px-3 py-1 text-xs font-bold transition-colors ${
                    settings.currentCluster === c
                      ? "bg-rose text-white"
                      : "border border-border text-text-mid hover:border-rose"
                  }`}
                >
                  {c}
                </button>
              ))}
              <button
                type="button"
                onClick={() => void patch({ currentCluster: null })}
                className="rounded-pill border border-dashed border-border px-3 py-1 text-xs text-text-mid hover:border-rose"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Word counts */}
      <div className="rounded-card border border-border bg-white p-6">
        <h2 className="font-display text-xl text-charcoal">Word-count targets</h2>
        <p className="mt-1 text-sm text-text-mid">
          Generator floor = max(class target, competitor word count + 200).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumField
            label="Pillar (guides, lists)"
            value={settings.wordCountPillar}
            onSave={(n) => void patch({ wordCountPillar: n })}
          />
          <NumField
            label="Standard (how-to, cost)"
            value={settings.wordCountStandard}
            onSave={(n) => void patch({ wordCountStandard: n })}
          />
          <NumField
            label="Local (city × vendor)"
            value={settings.wordCountLocal}
            onSave={(n) => void patch({ wordCountLocal: n })}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumField
            label="Launch-burst limit"
            value={settings.launchBurstLimit}
            onSave={(n) => void patch({ launchBurstLimit: n })}
            help="While total published posts is below this, the agent runs 3/day instead of 2/day."
          />
        </div>
      </div>

      {/* Platform status */}
      <div className="rounded-card border border-border bg-white p-6">
        <h2 className="font-display text-xl text-charcoal">Platform connection status</h2>
        <p className="mt-1 text-sm text-text-mid">
          ✅ = required env vars set. Click <em>Test</em> to do a live read against the API.
        </p>
        <div className="mt-4 space-y-2">
          {([
            ["gbp",       "Google Business Profile"],
            ["instagram", "Instagram (Meta Graph)"],
            ["facebook",  "Facebook (Meta Graph)"],
            ["pinterest", "Pinterest v5"],
          ] as const).map(([key, label]) => {
            const configured = platforms[key];
            const probe = testResult[key];
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-light bg-bg-soft p-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-charcoal">{label}</p>
                  <p className="text-xs text-text-muted">
                    {configured ? "Env vars configured" : "Env vars missing"}
                    {probe ? ` · Live: ${probe.ok ? "OK" : "FAIL"}${probe.detail ? ` — ${probe.detail}` : ""}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={testing === key || !configured}
                  onClick={() => void testPlatform(key)}
                  className="rounded-pill border-2 border-rose px-3 py-1 text-xs font-bold text-rose hover:bg-rose-pale disabled:opacity-50"
                >
                  {testing === key ? "Testing…" : "Test"}
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-muted sm:grid-cols-4">
          <span>OpenAI: {platforms.openai     ? "✅" : "❌"}</span>
          <span>Anthropic: {platforms.anthropic ? "✅" : "❌"}</span>
          <span>Brevo: {platforms.brevo      ? "✅" : "❌"}</span>
          <span>R2: {platforms.r2            ? "✅" : "❌"}</span>
        </div>
      </div>

      {error  && <p className="rounded-card border border-red-300 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      {status && <p className="rounded-card border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800">{status}</p>}
      {saving && <p className="text-xs text-text-muted">Saving…</p>}
    </div>
  );
}

/* ─── Atoms ──────────────────────────────────────────────────────── */

function Toggle({
  label, description, value, onChange,
}: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-card border border-border-light bg-bg-soft p-3 hover:bg-bg-soft/70">
      <div className="flex-1">
        <p className="font-mono text-sm font-semibold text-charcoal">{label}</p>
        <p className="mt-0.5 text-xs text-text-mid">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 cursor-pointer"
      />
    </label>
  );
}

/* ─── Tab: Newsletter ────────────────────────────────────────────── */

type NewsletterStats = {
  stats:  { total: number; active: number; last7: number; last30: number };
  recent: Array<{
    id:           number;
    email:        string;
    name:         string | null;
    region:       string | null;
    subscribedAt: string | null;
    isActive:     boolean;
  }>;
};

function NewsletterTab({ tokenHeader }: { tokenHeader: Record<string, string> }) {
  const [data, setData]   = useState<NewsletterStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res  = await fetch("/api/admin/newsletter/stats", { headers: tokenHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [tokenHeader]);

  useEffect(() => { void load(); }, [load]);

  if (error) {
    return (
      <p className="rounded-card border border-border bg-white p-6 text-sm text-rose">
        {error}
      </p>
    );
  }
  if (!data) {
    return (
      <p className="rounded-card border border-border bg-white p-6 text-sm text-text-mid">
        Loading subscribers…
      </p>
    );
  }

  const { stats, recent } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active subscribers"  value={stats.active} />
        <StatCard label="Last 7 days"         value={stats.last7} accent="rose" />
        <StatCard label="Last 30 days"        value={stats.last30} />
        <StatCard label="All-time total"      value={stats.total} muted />
      </div>

      <div className="rounded-card border border-border bg-white p-6">
        <h2 className="font-display text-xl text-charcoal">Recent signups</h2>
        <p className="mt-1 text-sm text-text-mid">
          Last 25 by signup date. New subscribers receive a welcome email
          automatically via Brevo.
        </p>

        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-text-mid">No subscribers yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-mid">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Region</th>
                  <th className="px-3 py-2">Signed up</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{r.email}</td>
                    <td className="px-3 py-2">{r.name ?? "—"}</td>
                    <td className="px-3 py-2">{r.region ?? "—"}</td>
                    <td className="px-3 py-2 text-text-mid">
                      {r.subscribedAt ? new Date(r.subscribedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.isActive ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          active
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          unsubscribed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, accent, muted,
}: { label: string; value: number; accent?: "rose"; muted?: boolean }) {
  const valueColor = accent === "rose"
    ? "text-rose"
    : muted ? "text-text-mid" : "text-charcoal";
  return (
    <div className="rounded-card border border-border bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-text-mid">{label}</p>
      <p className={`mt-1 font-display text-3xl ${valueColor}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function NumField({
  label, value, onSave, help,
}: { label: string; value: number; onSave: (n: number) => void; help?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-text-mid">{label}</span>
      <input
        type="number"
        value={local}
        onChange={(e) => setLocal(parseInt(e.target.value, 10) || 0)}
        onBlur={() => { if (local !== value) onSave(local); }}
        className="block w-full rounded border border-border bg-white px-3 py-2 text-sm focus:border-rose focus:outline-none"
      />
      {help && <span className="mt-1 block text-xs text-text-muted">{help}</span>}
    </label>
  );
}
