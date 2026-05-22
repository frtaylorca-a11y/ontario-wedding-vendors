/**
 * Ontario telephone area codes — used by validate-vendor-locations.ts
 * and by the import-vendors.ts warning hook to flag rows whose phone
 * number doesn't look like it's based in Ontario.
 *
 * Per CRTC + telcocommunity sources (May 2026):
 *   GTA + Niagara + Hamilton:  416, 647, 437, 905, 289, 365
 *   Eastern Ontario + Ottawa:  613, 343
 *   Northern Ontario:          705, 807, 249, 683
 *   Southwestern Ontario:      519, 226, 548, 753
 *
 * (Overlay codes 437, 365, 343, 226, 249, 548, 683, 753 are all on
 * established overlay plans serving the original NPA's geography.)
 */
export const ONTARIO_AREA_CODES = new Set<string>([
  "416", "647", "437",          /* Toronto */
  "905", "289", "365",          /* GTA + Niagara + Hamilton */
  "613", "343",                 /* Eastern */
  "705", "249", "683", "807",   /* Northern */
  "519", "226", "548", "753",   /* Southwestern */
]);

/* Canadian toll-free codes. These say NOTHING about where the business
 * is located — a Toronto florist with an 1-800 number is still in
 * Toronto. Used to skip phone-based location heuristics entirely. */
export const TOLL_FREE_AREA_CODES = new Set<string>([
  "800", "888", "877", "866", "855", "844", "833",
]);

/* Area codes that are KNOWN US-only (no Canadian overlay). Used to
 * fire the import-time warning. Anything Canadian-but-not-Ontario
 * (514 Montréal, 604 Vancouver, 403 Calgary, 306 SK, etc.) stays
 * silent at import — the Claude verdict in validate-vendor-locations
 * handles those nuanced cases. Add to this set as we encounter more
 * recurring US codes in the data. */
export const KNOWN_US_AREA_CODES = new Set<string>([
  "212", "310", "404", "305", "312", "713", "214", "602",
  "702", "503", "206", "617", "716", "804", "806", "386",
]);

/* Extract the area code from a Canadian / US phone string. Handles
 * "+1 (905) 555-1234", "905-555-1234", "1.905.555.1234",
 * "905.555.1234". Returns null on anything that doesn't shake out
 * to a 10-digit subscriber number. */
export function extractAreaCode(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  /* Strip a leading country code 1 if present, so we always get a
   * clean 10-digit NXX-NXX-XXXX number to slice. */
  const last10 = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits.length >= 10
      ? digits.slice(-10)
      : null;
  if (!last10 || last10.length !== 10) return null;
  return last10.slice(0, 3);
}

export function isOntarioAreaCode(phone: string | null | undefined): boolean {
  const code = extractAreaCode(phone);
  return code != null && ONTARIO_AREA_CODES.has(code);
}

export function isTollFreeAreaCode(phone: string | null | undefined): boolean {
  const code = extractAreaCode(phone);
  return code != null && TOLL_FREE_AREA_CODES.has(code);
}

export function isKnownUSAreaCode(phone: string | null | undefined): boolean {
  const code = extractAreaCode(phone);
  return code != null && KNOWN_US_AREA_CODES.has(code);
}
