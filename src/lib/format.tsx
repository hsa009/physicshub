

import type { ReactNode } from "react";

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
