/**
 * AnswerThePublic CSV importer.
 *
 * Reads every .csv file in data/atp-topics/ and inserts each row
 * into blog_scout_log with source_name='AnswerThePublic' so the
 * agent's normal selection logic can pick them up.
 *
 * Expected columns (ATP standard export, case-insensitive):
 *   keyword | question type | topic
 *
 * Topics are converted into an Ontario-flavoured title before
 * insertion:
 *   "how much does a wedding photographer cost"
 *   → "How Much Does a Wedding Photographer Cost in Ontario? (2026 Guide)"
 *
 * Score rules (Addendum C):
 *   Contains Ontario/Niagara/GTA/Hamilton: +10
 *   Contains "cost" or "how much":         +8
 *   Contains "how to" or "best":           +6
 *   Contains a local city name:            +7
 *   Contains year 2025/2026:               +5
 *   Generic/national (no location):        +2
 *
 * Dedupe: skip when (source='AnswerThePublic', normalized title) is
 * already present in blog_scout_log.
 *
 * Run:
 *   npx tsx scripts/import-atp-topics.ts                # reads data/atp-topics/
 *   npx tsx scripts/import-atp-topics.ts path/to/file.csv  # single file
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { blogScoutLog } from "../src/lib/schema";

const ONTARIO_RE = /\b(ontario|niagara|gta|hamilton|burlington|oakville|muskoka|notl)\b/i;
const CITY_RE    = /\b(toronto|niagara|hamilton|burlington|oakville|muskoka|notl|st\.?\s*catharines|kitchener|waterloo|guelph|barrie|collingwood|ottawa|kingston|london|brantford|brampton|mississauga|vaughan|markham)\b/i;
const COST_RE    = /\b(cost|how much|price|pricing|budget)\b/i;
const HOWTO_RE   = /\b(how to|best|top|guide)\b/i;
const YEAR_RE    = /\b(2025|2026|2027)\b/i;

function scoreAtpTitle(title: string): number {
  let score = 15;  /* Addendum C base bonus for ATP-sourced topics */
  if (ONTARIO_RE.test(title)) score += 10;
  else if (CITY_RE.test(title)) score += 7;
  else score += 2;
  if (COST_RE.test(title))   score += 8;
  if (HOWTO_RE.test(title))  score += 6;
  if (YEAR_RE.test(title))   score += 5;
  return score;
}

/* Title-case + Ontario suffix for ATP topics that don't already
 * mention the province. The agent treats this exactly like any
 * other scouted title. */
function ontarioize(raw: string): string {
  let s = raw.trim();
  /* Sentence case → Title Case for short queries. */
  s = s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
  /* Strip trailing punctuation. */
  s = s.replace(/[?.!]+$/, "");
  /* Append Ontario context if not already present. */
  if (!ONTARIO_RE.test(s)) {
    if (/^How Much Does/i.test(s) || /^How To/i.test(s)) {
      s = `${s} in Ontario? (2026 Guide)`;
    } else if (/Cost$/i.test(s)) {
      s = `${s} in Ontario (2026)`;
    } else {
      s = `${s} — Ontario Guide (2026)`;
    }
  }
  return s;
}

/* ─── CSV parsing ───────────────────────────────────────────────── */

/* Minimal CSV — handles quoted fields with commas, escaped quotes. */
function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"' && raw[i + 1] === '"') { cell += '"'; i++; continue; }
      if (ch === '"') { inQuotes = false; continue; }
      cell += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ",")  { row.push(cell); cell = ""; continue; }
    if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    if (ch === "\r") continue;
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

type Row = { keyword: string; questionType: string; topic: string };

function rowsFromCsv(raw: string): Row[] {
  const rows = parseCsv(raw);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const kwIdx  = header.findIndex((h) => h === "keyword" || h === "term" || h === "query");
  const qtIdx  = header.findIndex((h) => h.includes("question") || h.includes("type"));
  const tpIdx  = header.findIndex((h) => h === "topic" || h === "category" || h === "group");

  const idxOf = (i: number, fallback: number) => (i === -1 ? fallback : i);
  const out: Row[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const keyword = (r[idxOf(kwIdx, 0)] ?? "").trim();
    if (!keyword) continue;
    out.push({
      keyword,
      questionType: (r[idxOf(qtIdx, 1)] ?? "").trim(),
      topic:        (r[idxOf(tpIdx, 2)] ?? "").trim(),
    });
  }
  return out;
}

/* ─── Main ──────────────────────────────────────────────────────── */

async function importFile(path: string): Promise<{ inserted: number; skipped: number }> {
  const raw  = await readFile(path, "utf8");
  const rows = rowsFromCsv(raw);
  let inserted = 0;
  let skipped  = 0;

  for (const r of rows) {
    const title = ontarioize(r.keyword);
    const score = scoreAtpTitle(title);

    /* Dedupe: same source + normalized title. */
    const [existing] = await db
      .select({ id: blogScoutLog.id })
      .from(blogScoutLog)
      .where(
        and(
          eq(blogScoutLog.sourceName, "AnswerThePublic"),
          eq(blogScoutLog.title, title),
        ),
      )
      .limit(1);
    if (existing) { skipped++; continue; }

    await db.insert(blogScoutLog).values({
      title,
      sourceName: "AnswerThePublic",
      sourceUrl:  null,
      score,
      used:       false,
    });
    inserted++;
  }
  return { inserted, skipped };
}

async function main() {
  const argPath = process.argv[2];
  let files: string[] = [];

  if (argPath) {
    files = [argPath];
  } else {
    const dir = join(process.cwd(), "data", "atp-topics");
    if (!existsSync(dir)) {
      console.error(`[atp] No data/atp-topics/ directory found. Either:\n  - Create it and drop ATP CSVs in, or\n  - Pass a file path: npx tsx scripts/import-atp-topics.ts ./file.csv`);
      process.exit(1);
    }
    const entries = await readdir(dir);
    files = entries.filter((f) => f.toLowerCase().endsWith(".csv")).map((f) => join(dir, f));
  }

  if (files.length === 0) {
    console.error("[atp] No CSV files found.");
    process.exit(1);
  }

  let totalIn = 0, totalSkip = 0;
  for (const f of files) {
    const { inserted, skipped } = await importFile(f);
    console.log(`[atp] ${f}: inserted=${inserted} skipped=${skipped}`);
    totalIn += inserted;
    totalSkip += skipped;
  }

  /* Top 5 newly-imported by score. */
  const top = await db
    .select({ title: blogScoutLog.title, score: blogScoutLog.score })
    .from(blogScoutLog)
    .where(eq(blogScoutLog.sourceName, "AnswerThePublic"))
    .orderBy(blogScoutLog.score)
    .limit(5);

  console.log(`\n[atp] Total inserted: ${totalIn}, skipped (dupe): ${totalSkip}`);
  if (top.length > 0) {
    console.log("[atp] Top 5 ATP titles by score:");
    for (const r of top) console.log(`  ${r.score}  ${r.title}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
