import type { ReactNode } from "react";
import type { VendorCategoryKey } from "@/lib/plan-state";

/**
 * Custom SVG icon per budget category — single source of truth.
 *
 * Conventions (match the wider design system):
 *   - viewBox="0 0 24 24"
 *   - fill="none", stroke="currentColor"
 *   - strokeWidth={1.5}, strokeLinecap="round", strokeLinejoin="round"
 *
 * Variants:
 *   - "active"  → 18×18 icon inside a 32×32 rose-pale rounded square
 *   - "compact" → 16×16 icon inside a 28×28 grey-pale rounded square
 */

const ICON_PATHS: Record<VendorCategoryKey, ReactNode> = {
  venue_rental: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  catering_bar: (
    <>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6"  y1="1" x2="6"  y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </>
  ),
  photo_video: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <circle cx="12" cy="14" r="3" />
    </>
  ),
  music_dj: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2a10 10 0 0 1 7.07 17.07" />
      <path d="M4.93 4.93A10 10 0 0 0 12 22" />
    </>
  ),
  flowers_decor: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.5 2.5-1 3.5" />
      <path d="M12 2a4 4 0 0 0-4 4c0 1.5.5 2.5 1 3.5" />
      <path d="M12 22a4 4 0 0 0 4-4c0-1.5-.5-2.5-1-3.5" />
      <path d="M12 22a4 4 0 0 1-4-4c0-1.5.5-2.5 1-3.5" />
      <path d="M2 12a4 4 0 0 0 4 4c1.5 0 2.5-.5 3.5-1" />
      <path d="M2 12a4 4 0 0 1 4-4c1.5 0 2.5.5 3.5 1" />
      <path d="M22 12a4 4 0 0 1-4 4c-1.5 0-2.5-.5-3.5-1" />
      <path d="M22 12a4 4 0 0 0-4-4c-1.5 0-2.5.5-3.5 1" />
    </>
  ),
  cake: (
    <>
      <path d="M12 2a2 2 0 0 1 2 2v1H10V4a2 2 0 0 1 2-2z" />
      <rect x="4" y="5"  width="16" height="5" rx="1" />
      <rect x="2" y="10" width="20" height="6" rx="1" />
      <rect x="4" y="16" width="16" height="4" rx="1" />
      <line x1="12" y1="2" x2="12" y2="5" />
    </>
  ),
  hair_makeup: (
    <>
      <path d="M20 7a7 7 0 0 1-7 7 7 7 0 0 1-7-7 7 7 0 0 1 7-7 7 7 0 0 1 7 7z" />
      <path d="M13 14v7" />
      <path d="M9 18h8" />
    </>
  ),
  officiant: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7"  x2="15" y2="7" />
      <line x1="9" y1="11" x2="12" y2="11" />
    </>
  ),
  stationery: (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ),
  transportation: (
    <>
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5"  cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </>
  ),
  attire_bride: (
    <>
      <path d="M12 2L8 8H4l2 4H4l4 10h8l4-10h-2l2-4h-4L12 2z" />
    </>
  ),
  attire_groom: (
    <>
      <path d="M6 2h12l-2 6H8L6 2z" />
      <path d="M8 8v14" />
      <path d="M16 8v14" />
      <path d="M8 14h8" />
      <path d="M12 8v3l-2 2 2 1 2-1-2-2V8" />
    </>
  ),
  lighting_sound: (
    <>
      <circle cx="12" cy="5" r="3" />
      <path d="M12 8v8" />
      <path d="M8 14l4 4 4-4" />
      <line x1="6" y1="21" x2="18" y2="21" />
    </>
  ),
  photo_booth: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="6" y="8" width="12" height="8"  rx="1" />
      <circle cx="12" cy="12" r="2" />
      <line x1="6"  y1="4" x2="6"  y2="2" />
      <line x1="18" y1="4" x2="18" y2="2" />
    </>
  ),
  wedding_rings: (
    <>
      <circle cx="8"  cy="12" r="5" />
      <circle cx="16" cy="12" r="5" />
    </>
  ),
  favors_gifts: (
    <>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </>
  ),
  accommodation: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
      <path d="M3 10h18" />
    </>
  ),
  rentals: (
    <>
      <path d="M2 20h20" />
      <path d="M4 20V8l8-6 8 6v12" />
      <rect x="9" y="12" width="6" height="8" />
    </>
  ),
  wedding_planner: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </>
  ),
  miscellaneous: (
    <>
      <circle cx="5"  cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
};

type Props = {
  category: VendorCategoryKey;
  variant?: "active" | "compact";
};

export function BudgetCategoryIcon({ category, variant = "active" }: Props) {
  const paths = ICON_PATHS[category];
  const isCompact = variant === "compact";

  return (
    <span
      aria-hidden
      className={`flex flex-shrink-0 items-center justify-center rounded-lg ${
        isCompact
          ? "h-7 w-7 bg-gray-100 text-gray-500"
          : "h-8 w-8 bg-rose-pale text-rose"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isCompact ? "h-4 w-4" : "h-[18px] w-[18px]"}
      >
        {paths}
      </svg>
    </span>
  );
}
