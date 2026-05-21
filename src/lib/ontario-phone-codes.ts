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
