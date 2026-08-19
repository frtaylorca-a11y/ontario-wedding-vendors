"use client";

/**
 * Bulletproof hero image with a cascading fallback:
 *
 *   1. `src`            (preferred — R2 or scraped URL from DB)
 *   2. `fallbackSrc`    (curated per-category placeholder in /public/images)
 *   3. Styled placeholder <div> — never renders a torn-image icon
 *
 * The cascade is driven by client-side onError: if the primary URL 404s
 * (a stale scraped URL, a missing R2 object, an image host blocking
 * hotlinks) we advance to the next source. When the chain is exhausted
 * — or when the caller passes no valid URLs at all — we render a plain
 * <div> in the site's rose-tint (#F7EEF1) with an optional centered
 * icon. This is the "belt AND suspenders" guarantee: every card gets a
 * usable visual regardless of DB state, R2 state, or network flakiness.
 *
 * Positioning: the component assumes an ancestor with `position:
 * relative` (VendorCard + VenueCard both wrap this in a
 * `relative aspect-video` container). The <Image fill> and the
 * placeholder <div> both stretch to that container via `absolute inset-0`.
 */
import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";

type Props = {
  src?: string | null;
  /** Curated per-category placeholder from /public/images. */
  fallbackSrc?: string | null;
  alt: string;
  /** Icon to render inside the styled placeholder when both URLs fail. */
  placeholderIcon?: ReactNode;
} & Omit<ImageProps, "src" | "alt" | "onError">;

const PLACEHOLDER_BG = "#F7EEF1";

export function HeroImage({
  src,
  fallbackSrc,
  alt,
  placeholderIcon,
  className,
  style,
  ...imgProps
}: Props) {
  const chain: string[] = [];
  if (src) chain.push(src);
  if (fallbackSrc && fallbackSrc !== src) chain.push(fallbackSrc);

  const [srcIndex, setSrcIndex] = useState(0);

  if (chain.length === 0 || srcIndex >= chain.length) {
    return (
      <div
        aria-label={alt}
        role="img"
        className={`absolute inset-0 flex items-center justify-center ${className ?? ""}`}
        style={{ backgroundColor: PLACEHOLDER_BG, ...style }}
      >
        {placeholderIcon ?? <DefaultRingsIcon />}
      </div>
    );
  }

  return (
    <Image
      {...imgProps}
      src={chain[srcIndex]}
      alt={alt}
      className={className}
      style={style}
      onError={() => setSrcIndex((i) => i + 1)}
    />
  );
}

/**
 * Subtle wedding-themed default icon — two interlocked rings, drawn
 * at ~60% opacity so it reads as decorative texture, not a "placeholder"
 * chrome element. Used when the caller doesn't provide their own icon.
 */
function DefaultRingsIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className="h-12 w-12"
      style={{ color: "#C4909D", opacity: 0.55 }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="18" cy="28" r="10" />
      <circle cx="30" cy="28" r="10" />
    </svg>
  );
}
