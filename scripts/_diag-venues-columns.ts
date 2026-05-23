import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'venues'
    ORDER BY ordinal_position
  `;
  console.log(`venues table — ${cols.length} columns:`);
  for (const c of cols) {
    console.log(`  ${(c.column_name as string).padEnd(34)} ${c.data_type}`);
  }

  /* Look for anything that smells like cached raw page text */
  const candidates = cols.filter((c) =>
    /raw|html|content|page|scrap|text|cached|bio|description/i.test(c.column_name as string),
  );
  console.log(`\nColumns that could plausibly hold cached page text:`);
  for (const c of candidates) {
    console.log(`  ${(c.column_name as string).padEnd(34)} ${c.data_type}`);
  }

  /* Sample row inspection omitted — see _diag-* scripts when needed. */
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
