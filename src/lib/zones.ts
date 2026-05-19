export type Zone = "niagara-gta" | "ontario";

const NIAGARA_GTA_REGIONS = new Set(["niagara", "gta", "golden-horseshoe"]);

export function getZone(region: string | null | undefined): Zone {
  if (!region) return "ontario";
  return NIAGARA_GTA_REGIONS.has(region) ? "niagara-gta" : "ontario";
}
