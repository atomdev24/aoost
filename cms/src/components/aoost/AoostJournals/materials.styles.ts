// Cover materials for the sketchbooks (AoostJournals): kraft board and worn leather.
// Hand-written (unlike AoostJournals.styles.ts). Covers without a material get none of these classes.

/** The cover colour of a kraft book that has no colour of its own. */
export const KRAFT_BROWN = "#A47A4E";

/** Fibres, dark flecks and a few light ones (feTurbulence), tiled over the cover colour. */
const KRAFT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E %3Cfilter id='a' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' seed='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .32 0 0 0 0 .21 0 0 0 0 .1 .9 0 0 0 -.3'/%3E%3C/filter%3E %3Cfilter id='b' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.55' numOctaves='2' seed='9' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .12 0 0 0 0 .08 0 0 0 0 .05 -16 0 0 0 5.1'/%3E%3C/filter%3E %3Cfilter id='c' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.6' numOctaves='2' seed='17' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .96 0 0 0 0 .9 0 0 0 0 .78 16 0 0 0 -11.8'/%3E%3C/filter%3E %3Crect width='180' height='180' filter='url(%23a)'/%3E%3Crect width='180' height='180' filter='url(%23b)'/%3E%3Crect width='180' height='180' filter='url(%23c)' opacity='.45'/%3E%3C/svg%3E";
/** Pebbled grain: turbulence lit from the top left, toned so a flat spot is neutral grey (hard-light leaves it alone). */
const LEATHER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E %3Cfilter id='g' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='turbulence' baseFrequency='.38' numOctaves='2' seed='2' stitchTiles='stitch' result='t'/%3E%3CfeDiffuseLighting in='t' surfaceScale='2.2' diffuseConstant='1' lighting-color='%23fff'%3E%3CfeDistantLight azimuth='235' elevation='48'/%3E%3C/feDiffuseLighting%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='.68'/%3E%3CfeFuncG type='linear' slope='.68'/%3E%3CfeFuncB type='linear' slope='.68'/%3E%3C/feComponentTransfer%3E%3C/filter%3E %3Crect width='120' height='120' filter='url(%23g)'/%3E%3C/svg%3E";

export const materialCss = `
.ao .jr-cv .jmat,.ao .jv-pg .jmat{position:absolute;inset:0;pointer-events:none;border-radius:inherit}
.ao .cv-kraft::before{background:linear-gradient(90deg,rgba(0,0,0,.26),rgba(0,0,0,.05) 7%,rgba(255,255,255,.04) 9%,transparent 14%)}
.ao .jv-pg.cover.cv-kraft::after{background:linear-gradient(90deg,rgba(0,0,0,.3),rgba(0,0,0,.05) 7%,transparent 12%)}
.ao .cv-kraft .jmat{background:url("${KRAFT}") 0 0/180px 180px}
.ao .cv-kraft.cv-img .jmat{opacity:.7;mix-blend-mode:multiply}
.ao .cv-leather .jmat{background:radial-gradient(circle at 0 0,rgba(255,236,214,.17),transparent 9%),radial-gradient(circle at 100% 100%,rgba(255,236,214,.13),transparent 8%),radial-gradient(circle at 100% 0,rgba(255,236,214,.08),transparent 6%),radial-gradient(circle at 0 100%,rgba(255,236,214,.07),transparent 6%),linear-gradient(104deg,transparent 62%,rgba(255,236,214,.05) 62.4%,transparent 63.2%);
  box-shadow:inset 0 0 0 1px rgba(255,236,214,.07),inset 0 0 4px 1px rgba(255,236,214,.08),inset 0 0 22px rgba(0,0,0,.4)}
.ao .cv-leather.cv-img .jmat{background-color:rgba(20,15,10,.3)}
.ao .cv-leather .jmat::before{content:"";position:absolute;inset:0;background:url("${LEATHER}") 0 0/120px 120px;opacity:.2;mix-blend-mode:hard-light}
.ao .cv-leather .jmat::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 34%,rgba(255,244,230,.2) 47%,rgba(255,244,230,.04) 54%,transparent 64%) 100% 0/260% 100% no-repeat;opacity:0;transition:opacity .5s,background-position .9s cubic-bezier(.3,.7,.3,1)}
.ao .jr:hover .cv-leather .jmat::after,.ao .jr:focus-visible .cv-leather .jmat::after{opacity:1;background-position:0 0}
.ao .jv-pg.cv-leather .jmat::after{opacity:.7;background-position:40% 0}
.ao .cv-leather img.st{filter:grayscale(1) brightness(.5) contrast(.85) drop-shadow(0 -1px 0 rgba(0,0,0,.6)) drop-shadow(0 1px 0 rgba(255,236,214,.16));opacity:.85}
@media (prefers-reduced-motion:reduce){.ao .cv-leather .jmat::after{transition:none}}
`;
