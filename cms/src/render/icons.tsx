import type { ReactElement } from "react";

const svg = (size: number, children: ReactElement | ReactElement[], viewBox = "0 0 18 18") => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/** Line icons in the site's hand: 1.6px strokes, round caps. */
export const ICONS: Record<string, (size?: number) => ReactElement> = {
  arrow: (s = 12) => svg(s, <path d="M3 9l6-6M4 3h5v5" />, "0 0 12 12"),
  caret: (s = 10) => svg(s, <path d="M2 3.5l3 3 3-3" />, "0 0 10 10"),
  search: (s = 18) => svg(s, [<circle key="c" cx="8" cy="8" r="5.5" />, <path key="p" d="M12.2 12.2L16 16" />]),
  close: (s = 20) => svg(s, <path d="M3 3l14 14M17 3L3 17" />, "0 0 20 20"),
  mail: (s = 18) => svg(s, [<rect key="r" x="2" y="4" width="14" height="10" rx="2" />, <path key="p" d="M2.5 5l6.5 5 6.5-5" />]),
  instagram: (s = 18) => svg(s, [<rect key="r" x="2" y="2" width="14" height="14" rx="4" />, <circle key="c" cx="9" cy="9" r="3.2" />, <path key="d" d="M13 5h.01" />]),
  spotify: (s = 18) => svg(s, [<circle key="c" cx="9" cy="9" r="7" />, <path key="p" d="M5.5 7.2c2.6-.8 5.2-.6 7.4.6M6 9.6c2-.6 4-.4 5.8.5M6.6 11.9c1.5-.4 2.9-.3 4.2.4" />]),
  youtube: (s = 18) => svg(s, [<rect key="r" x="1.5" y="4" width="15" height="10" rx="3" />, <path key="p" d="M7.5 7l3.5 2-3.5 2z" />]),
  soundcloud: (s = 18) => svg(s, <path d="M2 12v-2M4.5 12.5V8.5M7 12.5V7M9.5 12.5V5.5c3-.6 4.6 1.4 4.8 3 1.6-.2 2.2 1 2.2 2s-.8 2-2 2H9.5" />),
  tiktok: (s = 18) => svg(s, <path d="M10 2.5v8.2a2.6 2.6 0 1 1-2.6-2.6M10 2.5c.3 2 1.6 3.300 3.800 3.500" />),
  link: (s = 18) => svg(s, <path d="M7.500 10.500a3 3 0 0 0 4.200 0l2.300-2.300a3 3 0 0 0-4.200-4.200l-.8.8M10.500 7.500a3 3 0 0 0-4.200 0L4 9.800A3 3 0 0 0 8.200 14l.8-.8" />),
  sun: (s = 22) =>
    svg(s, [<circle key="c" cx="15" cy="15" r="4.500" />, <path key="p" d="M15 2.500v6M15 21.500v6M2.500 15h6M21.500 15h6M6.200 6.200l4.200 4.200M19.600 19.600l4.200 4.200M23.800 6.200l-4.200 4.200M10.400 19.600l-4.200 4.200" />], "0 0 30 30"),
  star: (s = 18) => svg(s, <path d="M9 2l2 5 5 .5-3.800 3.300L13.500 16 9 13.200 4.500 16l1.300-5.200L2 7.500 7 7z" />),
  heart: (s = 18) => svg(s, <path d="M9 15S2.500 11 2.500 6.500A3.500 3.500 0 0 1 9 5a3.500 3.500 0 0 1 6.500 1.500C15.500 11 9 15 9 15z" />),
  play: (s = 18) => svg(s, [<circle key="c" cx="9" cy="9" r="7" />, <path key="p" d="M7.500 6l4.500 3-4.500 3z" />]),
  download: (s = 18) => svg(s, <path d="M9 2.500v9M5.500 8l3.500 3.500L12.500 8M3 15h12" />),
};

export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, size }: { name: string; size?: number }): ReactElement | null {
  const make = ICONS[name];
  return make ? make(size) : null;
}
