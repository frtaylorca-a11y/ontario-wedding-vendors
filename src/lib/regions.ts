export const REGION_MAP: Record<string, string> = {
  // Niagara
  "niagara-on-the-lake": "niagara",
  "niagara-falls": "niagara",
  "st-catharines": "niagara",
  lincoln: "niagara",
  grimsby: "niagara",
  welland: "niagara",
  thorold: "niagara",
  pelham: "niagara",
  "fort-erie": "niagara",
  "port-colborne": "niagara",
  wainfleet: "niagara",
  beamsville: "niagara",
  jordan: "niagara",
  vineland: "niagara",
  fonthill: "niagara",

  // Hamilton / Burlington — Golden Horseshoe
  hamilton: "golden-horseshoe",
  burlington: "golden-horseshoe",
  oakville: "golden-horseshoe",
  milton: "golden-horseshoe",
  ancaster: "golden-horseshoe",
  waterdown: "golden-horseshoe",

  // GTA
  toronto: "gta",
  mississauga: "gta",
  brampton: "gta",
  vaughan: "gta",
  markham: "gta",
  "richmond-hill": "gta",
  newmarket: "gta",
  aurora: "gta",
  ajax: "gta",
  whitby: "gta",
  oshawa: "gta",
  pickering: "gta",
  "king-city": "gta",
  caledon: "gta",
  "halton-hills": "gta",

  // Cottage Country / Muskoka
  barrie: "cottage-country",
  collingwood: "cottage-country",
  "wasaga-beach": "cottage-country",
  orillia: "cottage-country",
  gravenhurst: "cottage-country",
  huntsville: "cottage-country",
  bracebridge: "cottage-country",
  midland: "cottage-country",

  // Waterloo Region
  kitchener: "waterloo-region",
  waterloo: "waterloo-region",
  cambridge: "waterloo-region",
  guelph: "waterloo-region",
  fergus: "waterloo-region",
  elora: "waterloo-region",

  // Southwestern
  london: "southwestern",
  windsor: "southwestern",
  chatham: "southwestern",
  stratford: "southwestern",
  woodstock: "southwestern",
  brantford: "southwestern",
  sarnia: "southwestern",

  // Eastern Ontario / Ottawa
  ottawa: "eastern",
  kingston: "eastern",
  belleville: "eastern",
  cobourg: "eastern",
  peterborough: "eastern",

  // Prince Edward County (note: picton/bloomfield map here; intentionally
  // overrides the "eastern" entry above by sitting later in the object)
  picton: "prince-edward-county",
  bloomfield: "prince-edward-county",
};

export type Region = {
  slug: string;
  label: string;
  featured: boolean;
  description?: string;
};

export const REGIONS: Region[] = [
  { slug: "niagara", label: "Niagara", featured: true },
  { slug: "gta", label: "Greater Toronto Area", featured: true },
  { slug: "golden-horseshoe", label: "Hamilton & Burlington", featured: true },
  { slug: "cottage-country", label: "Muskoka & Cottage Country", featured: true },
  { slug: "waterloo-region", label: "Waterloo Region", featured: false },
  { slug: "southwestern", label: "Southwestern Ontario", featured: false },
  { slug: "eastern", label: "Eastern Ontario", featured: false },
  { slug: "prince-edward-county", label: "Prince Edward County", featured: false },
];

export function getRegion(slug: string): Region | undefined {
  return REGIONS.find((r) => r.slug === slug);
}

export function cityToRegion(citySlug: string): string | null {
  return REGION_MAP[citySlug] ?? null;
}
