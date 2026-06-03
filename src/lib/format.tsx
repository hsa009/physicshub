/**
 * Lightweight inline formatters used by the slide / pager UI.
 *
 * Kept tiny on purpose — if we ever need a real markdown renderer we'll
 * pull one in then, but for now the only thing the body text needs is
 * `**bold**` for key terms.
 */

import type { ReactNode } from "react";

/**
 * Convert `**term**` runs in a string to <strong> elements.
 * Anything else is returned as plain text. Safe for arbitrary input —
 * no HTML is ever rendered as HTML.
 */
export function renderBody(body: string): ReactNode {
  const parts = body.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={i} className="font-medium text-text-primary">
          {m[1]}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Render a lesson name with the accent word italicized in gold.
 * Falls back to the plain name if `accentWord` isn't a substring.
 */
export function renderAccentTitle(
  name: string,
  accentWord: string,
): ReactNode {
  const idx = name.lastIndexOf(accentWord);
  if (idx < 0) return name;
  return (
    <>
      {name.slice(0, idx)}
      <em className="italic text-gold">{accentWord}</em>
    </>
  );
}
