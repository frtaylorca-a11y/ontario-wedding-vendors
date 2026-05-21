/**
 * Tight server-side markdown → HTML renderer for agent-generated
 * blog posts. Handles the subset Claude emits:
 *   - ## H2, ### H3
 *   - paragraphs (blank-line separated)
 *   - **bold** and *italic*
 *   - [link](url)
 *   - unordered lists (-) and ordered lists (1.)
 *
 * Deliberately no dependency — the input shape is controlled by our
 * own system prompt and a 3KB renderer is cheaper than the marked
 * runtime + plugins.
 *
 * Output is wrapped in a single string; the page component injects
 * it via dangerouslySetInnerHTML inside a div that already has the
 * .blog-prose styles applied.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* Inline transforms — run on each line of text after block detection.
 * Order matters: links first (so the bold inside an anchor still
 * works), then bold, then italic. */
function inlineTransform(raw: string): string {
  let s = escapeHtml(raw);
  /* [text](url) → <a href="url" ...>text</a>.  We only allow http(s)
   * and root-relative paths to keep the renderer safe to feed into
   * dangerouslySetInnerHTML. */
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const safe = /^(https?:\/\/|\/)/.test(url) ? url : "#";
    const isExternal = /^https?:\/\//.test(safe) &&
      !safe.startsWith("https://ontarioweddingvendors.com");
    const attrs = isExternal
      ? ` target="_blank" rel="noopener nofollow"`
      : "";
    return `<a href="${safe}"${attrs}>${text}</a>`;
  });
  /* **bold** */
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  /* *italic* — careful not to swallow ** which is already handled */
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return s;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    /* Heading? */
    const hMatch = /^(#{2,3})\s+(.+)$/.exec(trimmed);
    if (hMatch) {
      const tag = hMatch[1].length === 2 ? "h2" : "h3";
      out.push(`<${tag}>${inlineTransform(hMatch[2])}</${tag}>`);
      i++;
      continue;
    }

    /* Unordered list — accumulate consecutive "- ..." lines. */
    if (/^[-*]\s+/.test(trimmed)) {
      out.push("<ul>");
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^[-*]\s+/, "");
        out.push(`<li>${inlineTransform(item)}</li>`);
        i++;
      }
      out.push("</ul>");
      continue;
    }

    /* Ordered list — accumulate "1. ..." lines. */
    if (/^\d+\.\s+/.test(trimmed)) {
      out.push("<ol>");
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^\d+\.\s+/, "");
        out.push(`<li>${inlineTransform(item)}</li>`);
        i++;
      }
      out.push("</ol>");
      continue;
    }

    /* Paragraph — accumulate until blank line or block-level marker. */
    const buf: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (next === "") break;
      if (/^(#{2,3}\s|[-*]\s|\d+\.\s)/.test(next)) break;
      buf.push(next);
      i++;
    }
    out.push(`<p>${inlineTransform(buf.join(" "))}</p>`);
  }

  return out.join("\n");
}
