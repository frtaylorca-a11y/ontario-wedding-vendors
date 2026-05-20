/**
 * Default "Things to Do" suggestions per region.
 *
 * Used when a couple first toggles the Things to Do section on — we
 * seed 3–4 region-appropriate items they can edit / remove / extend.
 * The AI generator (/api/wedding-website/generate) replaces these with
 * Claude-written versions when the couple clicks "Generate copy".
 */
import { newId, type ThingsToDoItem } from "./wedding-website";

function pad(base: Omit<ThingsToDoItem, "id">[]): ThingsToDoItem[] {
  return base.map((b) => ({ ...b, id: newId() }));
}

const NIAGARA: Omit<ThingsToDoItem, "id">[] = [
  {
    name:        "Walk Queen Street, Niagara-on-the-Lake",
    description: "Picture-perfect heritage shopping street with cafés, ice cream, and historic buildings. 20-minute drive from most Niagara venues.",
  },
  {
    name:        "Wine-country tour",
    description: "Take an afternoon tasting tour through Jordan, Beamsville, or Niagara-on-the-Lake. Several operators offer hotel pickup.",
    url:         "https://www.niagarawinetours.com",
  },
  {
    name:        "Maid of the Mist",
    description: "Iconic boat ride at the foot of Horseshoe Falls. Runs May through October. Buy tickets online to skip the queue.",
    url:         "https://www.maidofthemist.com",
  },
  {
    name:        "Skylon Tower or Fallsview Casino",
    description: "Two of the best Falls vantage points after dark. The Skylon revolving dining room books up — reserve a week ahead.",
  },
];

const GTA: Omit<ThingsToDoItem, "id">[] = [
  {
    name:        "Distillery Historic District",
    description: "Cobblestone Victorian-era distillery converted into restaurants, art galleries, and boutique shops. Walking distance from many downtown hotels.",
  },
  {
    name:        "CN Tower + Ripley's Aquarium",
    description: "Combine both — Ripley's is at the base of the Tower. Buy the combo pass online for ~30% off the gate price.",
    url:         "https://www.cntower.ca",
  },
  {
    name:        "Toronto Islands ferry",
    description: "15-minute ferry to a car-free island park with beaches, swans, and a great Toronto skyline view. Runs year-round.",
  },
  {
    name:        "St. Lawrence Market",
    description: "Saturday morning at the South Market — peameal bacon sandwich, fresh seafood, and the Saturday farmers' market upstairs.",
  },
];

const GOLDEN_HORSESHOE: Omit<ThingsToDoItem, "id">[] = [
  {
    name:        "Royal Botanical Gardens",
    description: "Largest botanical garden in Canada — Rock Garden, Lilac Dell, and trails through the Cootes Paradise marsh. Café on site for lunch.",
    url:         "https://www.rbg.ca",
  },
  {
    name:        "Webster's Falls + Spencer Gorge",
    description: "Hamilton is the waterfall capital of the world. Webster's is the most photographed; the upper-rim walk takes 30 minutes.",
  },
  {
    name:        "Burlington Waterfront",
    description: "2 km lakefront promenade with the Spencer Smith Park, beach houses, and a great patio at Spencer's at the Waterfront.",
  },
  {
    name:        "Art Gallery of Hamilton",
    description: "Three-floor collection in downtown Hamilton — strong on Canadian art. Free admission on Friday evenings.",
    url:         "https://www.artgalleryofhamilton.com",
  },
];

const COTTAGE_COUNTRY: Omit<ThingsToDoItem, "id">[] = [
  {
    name:        "Boat cruise on Lake Muskoka",
    description: "Several operators run 90-minute heritage steamship cruises out of Gravenhurst from May through October.",
    url:         "https://www.realmuskoka.com",
  },
  {
    name:        "Algonquin Park day trip",
    description: "Drive 90 minutes north for canoe rental, hiking trails, or the visitor centre. Best in early September when colours start.",
    url:         "https://www.ontarioparks.ca/park/algonquin",
  },
  {
    name:        "Bracebridge waterfalls walk",
    description: "Bracebridge has 22 named waterfalls within town limits. The Bracebridge Falls boardwalk takes 20 minutes.",
  },
  {
    name:        "Muskoka Bay Resort spa or golf",
    description: "Day-pass spa packages or a 9-hole twilight golf rate — both bookable as a wedding-guest add-on.",
  },
];

const PRINCE_EDWARD_COUNTY: Omit<ThingsToDoItem, "id">[] = [
  {
    name:        "Wine and cider trail",
    description: "Over 40 wineries on the Loyalist Parkway alone. Norman Hardie, Closson Chase, and Hinterland are required stops.",
  },
  {
    name:        "Sandbanks Provincial Park",
    description: "Three of the best beaches in Ontario — Outlet, Lakeshore, and Dunes. Day passes sell out by 10 AM in July/August.",
    url:         "https://www.ontarioparks.ca/park/sandbanks",
  },
  {
    name:        "Picton Main Street",
    description: "Antique shops, the Royal Hotel, and Drake Devonshire down at the waterfront. Best Sunday brunch in The County.",
  },
];

const DEFAULT_ONTARIO: Omit<ThingsToDoItem, "id">[] = [
  {
    name:        "Explore the nearby town",
    description: "Walk the downtown core, find a local café, and pick up something small to take home.",
  },
  {
    name:        "Visit a nearby winery or brewery",
    description: "Ontario has incredible small-batch wineries and craft breweries — ask the venue for their favourites within 20 minutes.",
  },
  {
    name:        "Provincial park or conservation area",
    description: "Most Ontario regions have a beautiful provincial park within a short drive. Worth packing comfortable shoes.",
  },
];

const BY_REGION: Record<string, Omit<ThingsToDoItem, "id">[]> = {
  "niagara":               NIAGARA,
  "gta":                   GTA,
  "golden-horseshoe":      GOLDEN_HORSESHOE,
  "cottage-country":       COTTAGE_COUNTRY,
  "prince-edward-county":  PRINCE_EDWARD_COUNTY,
};

export function defaultThingsToDo(region: string | null | undefined): ThingsToDoItem[] {
  const key = (region ?? "").toLowerCase();
  const base = BY_REGION[key] ?? DEFAULT_ONTARIO;
  return pad(base);
}
