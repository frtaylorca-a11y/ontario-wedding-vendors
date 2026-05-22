/**
 * Repair script — un-hide vendors that were incorrectly hidden by an
 * earlier validate-vendor-locations sweep because their phone number
 * uses a North-American toll-free area code (800 / 888 / 877 / 866 /
 * 855 / 844 / 833).
 *
 * Toll-free codes carry NO geographic signal. A Toronto florist with
 * a 1-800 line is still a Toronto florist. The heuristic was over-
 * indexing on phone and the Claude verdict didn't always catch it —
 * this script reverses the damage and the validator change in
 * src/lib/ontario-phone-codes.ts prevents it recurring.
 *
 * Scope:
 *   - Only touches rows with hidden_reason='outside_ontario'.
 *   - Matches phones starting with any toll-free prefix in any of the
 *     common formats: "877...", "1877...", "+1877...", "1-877-...",
 *     "(877)..." (with or without a leading "1").
 *
 * Action:
 *   UPDATE vendors
 *      SET is_hidden     = false,
 *          hidden_reason = null,
 *          updated_at    = NOW()
 *    WHERE [phone matches]
 *      AND hidden_reason = 'outside_ontario';
 *
 * Run: npx tsx scripts/unhide-tollfree-vendors.ts            # dry-run
 *      npx tsx scripts/unhide-tollfree-vendors.ts --confirm  # apply
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import {
  extractAreaCode,
  TOLL_FREE_AREA_CODES,
} from "../src/lib/ontario-phone-codes";

const confirm = process.argv.includes("--confirm");

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  /* Identify candidates: hidden as outside_ontario, with a phone whose
   * normalized area code is in the toll-free set. We do the area-code
   * extraction in TypeScript (rather than SQL LIKE) so every input
   * format is handled consistently with the rest of the codebase. */
  const candidates = (await sql`
    SELECT id, slug, name, city, phone
      FROM vendors
     WHERE is_hidden = true
       AND hidden_reason = 'outside_ontario'
       AND phone IS NOT NULL
       AND phone <> ''
  `) as Array<{ id: number; slug: string; name: string; city: string | null; phone: string }>;

  const tollFree = candidates.filter((v) => {
    const ac = extractAreaCode(v.phone);
    return ac != null && TOLL_FREE_AREA_CODES.has(ac);
  });

  console.log(
    `Scanned ${candidates.length} hidden vendors with phones.\n` +
    `Toll-free matches: ${tollFree.length}\n`,
  );

  if (tollFree.length === 0) {
    console.log("Nothing to un-hide.");
    return;
  }

  console.log("Vendors to un-hide:");
  console.table(tollFree.map((v) => ({
    id:    v.id,
    slug:  v.slug.slice(0, 40),
    name:  v.name.slice(0, 35),
    city:  v.city ?? "—",
    phone: v.phone,
  })));

  if (!confirm) {
    console.log(`\nDry run. Pass --confirm to un-hide these ${tollFree.length} vendors.`);
    return;
  }

  const ids = tollFree.map((v) => v.id);
  const updated = (await sql`
    UPDATE vendors
       SET is_hidden     = false,
           hidden_reason = null,
           updated_at    = NOW()
     WHERE id = ANY(${ids})
       AND hidden_reason = 'outside_ontario'
    RETURNING id
  `) as Array<{ id: number }>;

  console.log(`\n✓ Un-hidden ${updated.length} vendors.`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
