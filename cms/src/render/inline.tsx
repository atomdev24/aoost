import type { ReactNode } from "react";
import { safeUrl } from "./links";

/**
 * Tiny inline formatter for text content: **bold**, *italic*, [label](url)
 * and line breaks. Output is React nodes, so nothing is ever injected as HTML.
 */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)|\n/g;
  let last = 0;
  let key = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={key++}>{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<em key={key++}>{m[2]}</em>);
    else if (m[3] !== undefined) {
      const href = safeUrl(m[4]!);
      out.push(
        <a key={key++} href={href} {...(/^https?:/.test(href) ? { target: "_blank", rel: "noopener" } : {})}>
          {m[3]}
        </a>,
      );
    } else out.push(<br key={key++} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
