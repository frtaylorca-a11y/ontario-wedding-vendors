export type { Venue, NewVenue, Vendor, NewVendor } from "@/lib/schema";
export type { Region } from "@/lib/regions";
export type { ScoreTier } from "@/lib/utils";

export type VenueListResponse = {
  venues: import("@/lib/schema").Venue[];
  total: number;
  page: number;
};

export type VendorListResponse = {
  vendors: import("@/lib/schema").Vendor[];
  total: number;
  page: number;
};

export const VENUE_TYPES = [
  "winery",
  "hotel",
  "barn",
  "estate",
  "golf-club",
  "conservation",
  "restaurant",
  "banquet-hall",
  "resort",
] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

export const VENDOR_CATEGORIES = [
  "photographer",
  "videographer",
  "dj",
  "florist",
  "photo_booth",
  "catering",
  "cake",
  "hair_makeup",
  "officiant",
  "limo",
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];
