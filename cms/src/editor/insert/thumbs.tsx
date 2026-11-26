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
  FruitReading: (
    <>
      <circle cx="40" cy="38" r="14" fill="none" stroke={L} strokeWidth="2.5" />
      <rect x="52" y="12" width="34" height="18" rx="4" fill={F} />
    </>
  ),
  Shape: (
    <>
      <rect x="16" y="16" width="34" height="30" rx="4" fill={F} />
      <circle cx="66" cy="31" r="15" fill={A} />
    </>
  ),
  Cards: (
    <>
      <rect x="10" y="14" width="24" height="36" rx="3" fill={F} />
      <rect x="38" y="14" width="24" height="36" rx="3" fill={F} />
      <rect x="66" y="14" width="24" height="36" rx="3" fill={F} />
    </>
  ),
  FileDownload: (
    <>
      <rect x="34" y="10" width="32" height="40" rx="3" fill={F} />
      <path d="M50 20v16M43 30l7 7 7-7" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  TrueFruitSeason: (
    <>
      <path d="M14 22H86" stroke={L} strokeWidth="2" strokeDasharray="3 4" />
      <circle cx="30" cy="22" r="5" fill={A} />
      <rect x="14" y="32" width="72" height="22" rx="4" fill={F} />
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

/** The Aerobotics pack (the demo's Brand tab): navy and blue, like the site. */
const N = "#17293E";
const AERO: Record<string, React.ReactNode> = {
  AeroHero: (
    <>
      <rect x="8" y="8" width="84" height="48" rx="3" fill="#2d4a2a" />
      <rect x="14" y="20" width="34" height="5" rx="2.5" fill="#fff" />
      <rect x="14" y="28" width="26" height="3" rx="1.5" fill={L} />
      <rect x="14" y="36" width="14" height="6" rx="3" fill={A} />
      <rect x="30" y="36" width="14" height="6" rx="3" fill="#fff" />
      {[14, 28, 42, 56].map((x) => <rect key={x} x={x} y="48" width="10" height="3" rx="1.5" fill={L} />)}
    </>
  ),
  AeroLogos: <>{[12, 32, 52, 72].map((x) => <rect key={x} x={x} y="28" width="16" height="8" rx="2" fill={L} />)}</>,
  AeroSplit: (
    <>
      {lines(12, 18, [30, 34, 26])}
      <rect x="12" y="40" width="34" height="10" rx="2" fill={F} />
      <rect x="54" y="12" width="22" height="40" rx="2" fill={F} />
      <rect x="66" y="22" width="22" height="16" rx="2" fill="#fff" opacity=".85" />
    </>
  ),
  AeroChart: (
    <>
      <rect x="22" y="8" width="56" height="48" rx="4" fill="#fff" opacity=".9" />
      {[30, 38, 46, 54, 62].map((x, i) => <rect key={x} x={x} y={46 - [8, 16, 28, 22, 12][i]!} width="5" height={[8, 16, 28, 22, 12][i]} fill={["#F5A623", "#F5A623", "#F5A623", "#F5A623", "#F5A623"][i]} />)}
    </>
  ),
  AeroReadings: <>{[12, 26, 40].map((y) => <rect key={y} x="30" y={y} width="40" height="11" rx="3" fill={F} stroke={L} />)}</>,
  AeroCrops: (
    <>
      <rect x="10" y="20" width="80" height="24" rx="4" fill={F} />
      {[18, 30, 42, 54, 66, 78].map((x, i) => <circle key={x} cx={x} cy="32" r="4.5" fill={["#F39C2A", "#F2D648", "#D9352B", "#7B3F8C", "#B5122E", "#3B5BA9"][i]} />)}
    </>
  ),
  AeroShowcase: (
    <>
      <rect x="8" y="8" width="84" height="48" rx="3" fill="#3a3a2a" />
      <rect x="30" y="13" width="40" height="4" rx="2" fill="#fff" />
      <rect x="20" y="24" width="60" height="28" rx="3" fill="#fff" opacity=".9" />
    </>
  ),
  AeroProductCard: (
    <>
      <rect x="8" y="10" width="84" height="44" rx="6" fill="#3d5a2d" />
      <rect x="14" y="22" width="34" height="22" rx="4" fill="#14210a" />
      <rect x="18" y="27" width="20" height="3" rx="1.5" fill="#fff" />
      <rect x="18" y="36" width="12" height="5" rx="2.5" fill={A} />
    </>
  ),
  AeroFeatures: <>{[12, 40, 68].map((x) => <g key={x}><rect x={x} y="14" width="20" height="1.5" fill={L} /><rect x={x} y="20" width="6" height="6" rx="1" fill={L} />{lines(x, 30, [18, 14, 16], 6)}</g>)}</>,
  AeroText: <>{lines(16, 14, [40])}{lines(16, 26, [68, 64, 70, 52], 6)}</>,
  AeroTestimonial: (
    <>
      <rect x="12" y="16" width="26" height="30" rx="3" fill={F} />
      {lines(44, 20, [42, 38, 30])}
      <rect x="44" y="42" width="18" height="3" rx="1.5" fill={A} />
    </>
  ),
  AeroStories: <>{[10, 31, 52, 73].map((x) => <g key={x}><rect x={x} y="16" width="18" height="28" rx="3" fill={F} /><rect x={x + 2} y="36" width="12" height="2.5" rx="1" fill={L} /></g>)}</>,
  AeroStats: <>{[10, 32, 54, 76].map((x) => <g key={x}><rect x={x} y="26" width="14" height="5" rx="2" fill={L} /><rect x={x} y="34" width="10" height="2.5" rx="1" fill={F} /></g>)}</>,
  AeroPhotoGrid: <>{[[12, 12], [40, 12], [68, 12], [12, 36], [40, 36], [68, 36]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="22" height="18" rx="3" fill={F} />)}</>,
  AeroPricing: (
    <>
      <rect x="30" y="8" width="40" height="50" rx="5" fill={N} stroke={L} />
      <rect x="30" y="8" width="40" height="16" rx="5" fill={F} />
      {lines(36, 30, [22, 18, 20])}
      <rect x="36" y="48" width="14" height="5" rx="2.5" fill={A} />
    </>
  ),
  AeroFaq: <>{[14, 26, 38, 50].map((y) => <g key={y}><rect x="16" y={y} width="56" height="3" rx="1.5" fill={L} /><path d={`M80 ${y - 1}l3 3 3-3`} stroke={L} fill="none" /></g>)}</>,
  AeroSteps: (
    <>
      <rect x="10" y="12" width="40" height="40" rx="3" fill={F} />
      {[18, 26, 34, 42].map((y, i) => <g key={y}><rect x="14" y={y} width="3" height="3" fill={A} /><rect x="20" y={y} width={[24, 20, 26, 18][i]} height="3" rx="1.5" fill={L} /></g>)}
      <rect x="56" y="12" width="34" height="40" rx="3" fill={F} stroke={L} />
    </>
  ),
  AeroEvents: <>{[12, 40, 68].map((x) => <g key={x}><rect x={x} y="14" width="20" height="14" rx="2" fill="#fff" opacity=".85" /><rect x={x + 3} y="32" width="14" height="3" rx="1.5" fill={L} /><rect x={x + 4} y="40" width="12" height="5" rx="2.5" fill={A} /></g>)}</>,
  AeroOffices: <>{lines(16, 12, [20, 44])}{lines(16, 30, [30, 40, 26], 5)}{lines(16, 48, [30, 34], 5)}</>,
  AeroPageHeader: (
    <>
      <rect x="8" y="8" width="84" height="48" rx="3" fill={F} />
      <rect x="28" y="24" width="44" height="6" rx="3" fill={L} />
      <rect x="22" y="35" width="56" height="3" rx="1.5" fill={L} opacity=".6" />
    </>
  ),
  AeroCta: (
    <>
      <rect x="8" y="18" width="84" height="28" rx="3" fill={N} stroke={L} />
      <rect x="14" y="26" width="36" height="4" rx="2" fill="#fff" />
      <rect x="14" y="34" width="26" height="4" rx="2" fill="#fff" />
      <rect x="60" y="29" width="13" height="6" rx="3" fill="#fff" />
      <rect x="75" y="29" width="13" height="6" rx="3" fill={A} />
    </>
  ),
  AeroFooter: (
    <>
      <rect x="8" y="10" width="84" height="44" rx="3" fill={N} stroke={L} />
      {[14, 34, 54].map((x) => <g key={x}>{lines(x, 16, [12, 10, 12, 8], 5)}</g>)}
      <text x="50" y="50" textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(255,255,255,.12)">aerobotics</text>
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
      {saved ? SAVED : (SHAPES[type ?? ""] ?? AERO[type ?? ""] ?? band)}
    </svg>
  );
}
