/**
 * Hand-drawn mini previews for the block library: simple, calm line drawings
 * of what each block looks like, in the editor's greys with one accent.
 */
const L = "rgba(255,255,255,.28)";
const F = "rgba(255,255,255,.1)";
const A = "#0A84FF";

const lines = (x: number, y: number, widths: number[], gap = 7) => widths.map((w, i) => <rect key={i} x={x} y={y + i * gap} width={w} height="3" rx="1.5" fill={L} />);

const SHAPES: Record<string, React.ReactNode> = {
  FlowSection: (
    <>
      <rect x="14" y="10" width="72" height="14" rx="2" fill={F} />
      <rect x="14" y="28" width="72" height="14" rx="2" fill={F} />
      <rect x="14" y="46" width="72" height="8" rx="2" fill={F} stroke={A} strokeDasharray="3 2" />
    </>
  ),
  GridSection: (
    <>
      {[14, 40, 66].map((x) => (
        <rect key={x} x={x} y="12" width="20" height="18" rx="2" fill={F} />
      ))}
      {[14, 40, 66].map((x) => (
        <rect key={x} x={x} y="34" width="20" height="18" rx="2" fill={F} />
      ))}
    </>
  ),
  CanvasSection: (
    <>
      <rect x="12" y="10" width="76" height="44" rx="2" fill="none" stroke={L} strokeDasharray="3 2" />
      <rect x="20" y="16" width="28" height="20" rx="2" fill={F} transform="rotate(-6 34 26)" />
      <circle cx="66" cy="38" r="9" fill={A} opacity=".6" />
    </>
  ),
  Text: <>{lines(16, 16, [52, 68, 60, 40])}</>,
  Button: (
    <>
      <rect x="28" y="24" width="44" height="16" rx="8" fill={A} />
      <rect x="38" y="30.5" width="24" height="3" rx="1.5" fill="#fff" />
    </>
  ),
  Code: (
    <>
      <path d="M30 22l-10 10 10 10M70 22l10 10-10 10M54 18l-8 28" stroke={L} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  Image: (
    <>
      <rect x="16" y="10" width="68" height="44" rx="3" fill={F} />
      <circle cx="34" cy="24" r="5" fill={L} />
      <path d="M16 50l20-16 14 10 12-8 22 14v1a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3z" fill={L} />
    </>
  ),
  GalleryGrid: (
    <>
      {[
        [14, 10, 34, 24],
        [52, 10, 34, 14],
        [52, 28, 34, 26],
        [14, 38, 34, 16],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill={i === 2 ? L : F} />
      ))}
    </>
  ),
  Video: (
    <>
      <rect x="16" y="10" width="68" height="44" rx="3" fill={F} />
      <path d="M45 24v16l14-8z" fill="#fff" opacity=".8" />
    </>
  ),
  Audio: (
    <>
      <rect x="14" y="22" width="72" height="20" rx="10" fill={F} />
      <path d="M24 28v8l7-4z" fill={L} />
      <rect x="38" y="31" width="40" height="2" rx="1" fill={L} />
      <rect x="38" y="31" width="16" height="2" rx="1" fill={A} />
    </>
  ),
  Embed: (
    <>
      <rect x="16" y="12" width="68" height="40" rx="3" fill="none" stroke={L} />
      <rect x="16" y="12" width="68" height="8" rx="3" fill={F} />
      {lines(24, 28, [40, 30])}
    </>
  ),
  SpotifyEmbed: (
    <>
      <rect x="14" y="16" width="72" height="32" rx="6" fill={F} />
      <rect x="20" y="22" width="20" height="20" rx="3" fill={L} />
      {lines(46, 26, [30, 22])}
    </>
  ),
  FileDownload: (
    <>
      <rect x="34" y="10" width="32" height="40" rx="3" fill={F} />
      <path d="M50 20v16M43 30l7 7 7-7" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  Lottie: <path d="M20 44c10-30 20-30 30 0s20 30 30 0" stroke={A} strokeWidth="3" fill="none" strokeLinecap="round" />,
  Model3D: <path d="M50 12l26 14v24L50 62 24 50V26zM24 26l26 12 26-12M50 38v24" stroke={L} strokeWidth="2" fill={F} strokeLinejoin="round" />,
  Spacer: <path d="M50 14v36M42 20l8-8 8 8M42 44l8 8 8-8" stroke={L} strokeWidth="2.5" fill="none" strokeLinecap="round" />,
  Divider: <rect x="14" y="31" width="72" height="2" rx="1" fill={L} />,
  Footer: (
    <>
      <rect x="10" y="36" width="80" height="20" rx="2" fill={F} />
      {lines(18, 42, [24, 16])}
    </>
  ),
  Global: (
    <>
      <circle cx="50" cy="32" r="18" fill="none" stroke={L} strokeWidth="2" />
      <ellipse cx="50" cy="32" rx="7" ry="18" fill="none" stroke={L} strokeWidth="1.5" />
      <path d="M32 32h36" stroke={L} strokeWidth="1.5" />
    </>
  ),
  DiaryList: (
    <>
      {[12, 28, 44].map((y) => (
        <g key={y}>
          <rect x="14" y={y} width="12" height="10" rx="2" fill={F} />
          <rect x="32" y={y + 2} width="40" height="3" rx="1.5" fill={L} />
        </g>
      ))}
    </>
  ),
  PlaylistCard: (
    <>
      <circle cx="40" cy="32" r="18" fill={F} />
      <circle cx="40" cy="32" r="4" fill={L} />
      {lines(62, 26, [22, 14])}
    </>
  ),
};

/** aoost homepage blocks share one look: a wide band with a title line. */
const band = (
  <>
    <rect x="8" y="12" width="84" height="40" rx="2" fill={F} />
    <rect x="16" y="20" width="30" height="5" rx="2.5" fill={L} />
    {[16, 34, 52, 70].map((x) => (
      <rect key={x} x={x} y="32" width="14" height="14" rx="1.5" fill={x === 52 ? A : L} opacity={x === 52 ? 0.7 : 1} />
    ))}
  </>
);

const SAVED = (
  <>
    <rect x="14" y="10" width="72" height="12" rx="2" fill={F} />
    <rect x="14" y="26" width="34" height="28" rx="2" fill={F} />
    <rect x="52" y="26" width="34" height="28" rx="2" fill={F} />
    <path d="M74 8h10v14l-5-4-5 4z" fill={A} />
  </>
);

export function Thumb({ type, saved }: { type?: string; saved?: boolean }) {
  return (
    <svg className="ed-thumb" viewBox="0 0 100 64" aria-hidden="true">
      {saved ? SAVED : (SHAPES[type ?? ""] ?? band)}
    </svg>
  );
}
