/**
 * Thin botanical divider between wedding-page sections.
 * 200px wide centered SVG, paired-leaf vine, theme accent colour
 * at 0.4 opacity. Pure SVG — no scripts.
 */
export function BotanicalDivider() {
  return (
    <div className="flex justify-center py-8 lg:py-10" aria-hidden>
      <svg
        viewBox="0 0 200 40"
        className="h-10 w-[200px]"
        fill="none"
        style={{ color: "var(--wt-accent)", opacity: 0.4 }}
      >
        {/* Central horizontal hairline */}
        <line
          x1="20"
          y1="20"
          x2="180"
          y2="20"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Centre rosette */}
        <circle cx="100" cy="20" r="2.5" fill="currentColor" />
        <circle cx="100" cy="20" r="6" stroke="currentColor" strokeWidth="0.6" />

        {/* Left vine — paired leaves */}
        <path
          d="M40 20 Q48 14 55 17 Q52 22 40 20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M40 20 Q48 26 55 23 Q52 18 40 20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M62 20 Q68 16 74 18 Q70 22 62 20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M62 20 Q68 24 74 22 Q70 18 62 20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right vine — mirror */}
        <path
          d="M160 20 Q152 14 145 17 Q148 22 160 20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M160 20 Q152 26 145 23 Q148 18 160 20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M138 20 Q132 16 126 18 Q130 22 138 20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M138 20 Q132 24 126 22 Q130 18 138 20"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
