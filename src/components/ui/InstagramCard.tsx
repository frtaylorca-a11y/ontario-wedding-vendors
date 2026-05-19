/* Strip leading @ (and the occasional double-@@ from the import pipeline) */
function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

export function InstagramCard({
  handle,
  venueName,
}: {
  handle: string;
  venueName: string;
}) {
  const clean = normalizeHandle(handle);
  if (!clean) return null;

  return (
    <section className="mt-6">
      <a
        href={`https://instagram.com/${clean}`}
        target="_blank"
        rel="noopener"
        className="flex flex-wrap items-center gap-4 rounded-card border-[1.5px] border-rose bg-rose-pale p-5 transition-all hover:bg-white hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 md:p-6"
      >
        <span
          aria-hidden
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-pill bg-rose text-white"
        >
          {/* Instagram glyph */}
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 stroke-current">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-semibold text-charcoal">
            View {venueName} on Instagram →
          </div>
          <div className="mt-0.5 text-sm text-rose">
            @{clean}
          </div>
        </div>
      </a>
    </section>
  );
}
