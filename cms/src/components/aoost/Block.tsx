import type { ReactNode } from "react";
import type { Mat } from "./kit";

/**
 * The shell every aoost block renders into: a scoping hook for the runtime (`data-ao`), the mat it
 * sits on, and the block's content as JSON for the ported scripts to read.
 */
export function Block({ name, mat, data, off, children }: { name: string; mat: Mat; data?: unknown; /** switched off: takes no room on the page */ off?: boolean; children: ReactNode }) {
  return (
    <div className="ao-b" data-ao={name} data-mat={mat} data-off={off ? "" : undefined}>
      {children}
      {data === undefined ? null : <script type="application/json" data-ao-data="" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />}
    </div>
  );
}

/** Section heading with the hand-drawn underline (the runtime draws the line into [data-underline]). */
export function Head({ id, title, index, className, children }: { id: string; title: string; index: number; className?: string; children?: ReactNode }) {
  return (
    <div className={className ? `head ${className}` : "head"}>
      {/* the number is this heading's place on the original page: it picks the same hand-drawn line */}
      <h2 id={id} data-underline={index}>
        {title}
      </h2>
      {children}
    </div>
  );
}

/** The western line art from the original page's sprite. */
export const LINE_ART = {
  cactus: { viewBox: "0 0 60 100", body: <><path d="M24 97V24a8 8 0 0 1 16 0v73" /><path d="M24 60h-7a7 7 0 0 1-7-7V38a4.5 4.5 0 0 1 9 0v12h5" /><path d="M40 68h6a7 7 0 0 0 7-7V46a4.5 4.5 0 0 0-9 0v12h-4" /><path d="M32 23v71" strokeOpacity=".4" /><path d="M22 32l-3-1M42 40l3-1M22 74l-3-1M42 84l3-1M10 44l-3-1M53 52l3-1" /><path d="M5 97c12-2 36 2 50-1" /></> },
  skull: { viewBox: "0 0 100 72", body: <><path d="M38 20C26 21 12 17 4 7c6 16 20 24 35 25" /><path d="M62 20c12 1 26-3 34-13-6 16-20 24-35 25" /><path d="M38 18c3-7 21-7 24 0l-2 24c-2 13-6 22-10 22s-8-9-10-22z" /><circle cx="44" cy="30" r="3.6" /><circle cx="56" cy="30" r="3.6" /><path d="M47 52l1 4M53 52l-1 4M42 22l3 3M58 22l-3 3" /></> },
  scorpion: { viewBox: "0 0 120 70", body: <><g className="legs"><path d="M54 37l-5-10-4-2M61 35l-2-11-3-3M67 36l2-10 2-3M73 38l5-8 4-1M54 51l-5 10-4 2M61 53l-2 11-3 3M67 52l2 10 2 3M73 50l5 8 4 1" /></g><ellipse cx="64" cy="44" rx="15" ry="9" /><path d="M79 44c3 0 7-3 8-3s4 3 4 3-1 3-4 3-5-3-8-3" /><path d="M50 44c-8 0-14-2-18-6s-6-11-4-17 7-9 12-7" /><path d="M40 14l6-4-1 7" /><path d="M58 40c0 3 0 5 0 8M66 39v10" strokeOpacity=".45" /><path d="M86 41c6-5 10-8 16-9" /><path d="M102 32c5-4 10-2 9 2-1 2-4 3-7 2M102 32c2 4 6 6 9 4" /><path d="M86 47c6 5 10 8 16 9" /><path d="M102 56c5 4 10 2 9-2-1-2-4-3-7-2M102 56c2-4 6-6 9-4" /></> },
} as const;

export function LineArt({ kind, className }: { kind: keyof typeof LINE_ART; className: string }) {
  const art = LINE_ART[kind];
  return (
    <svg className={`doodle ${className}`} viewBox={art.viewBox} aria-hidden="true">
      {art.body}
    </svg>
  );
}
