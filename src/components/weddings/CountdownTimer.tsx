"use client";

import { useEffect, useState } from "react";

/**
 * Days / hours / minutes countdown to the wedding date.
 *
 * Static-rendered on first paint using the server-provided weddingDate,
 * then refreshes every 60s on the client. Once the wedding is in the
 * past, renders an "already happened" note instead of negative numbers.
 *
 * Rendered inside the dark hero, so colours come from the prop set
 * (white at varying opacity) rather than theme tokens.
 */
export function CountdownTimer({ isoDate }: { isoDate: string }) {
  /* Target date — set to midday local to dodge timezone foot-guns at
   * the day/hour boundary. */
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(`${isoDate}T12:00:00`).getTime();
  const diff   = target - now;

  if (Number.isNaN(target)) return null;

  if (diff <= 0) {
    return (
      <div className="text-center text-[0.7rem] uppercase tracking-[0.3em]"
           style={{ color: "rgba(255,255,255,0.7)" }}>
        Already celebrated · check the gallery
      </div>
    );
  }

  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000)  / 60_000);

  return (
    <div className="flex items-start justify-center gap-6 sm:gap-10">
      <Unit value={days}    label="Days" />
      <Unit value={hours}   label="Hours" />
      <Unit value={minutes} label="Minutes" />
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div
        className="text-3xl leading-none sm:text-4xl"
        style={{
          fontFamily:    "var(--wt-font-display)",
          fontVariantNumeric: "lining-nums tabular-nums",
          color:         "#FFFFFF",
        }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div
        className="mt-2 text-[0.6rem] uppercase tracking-[0.32em]"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        {label}
      </div>
    </div>
  );
}
