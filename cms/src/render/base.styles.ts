/** Site-wide base CSS: reset, section shells, canvas artboards, overlays, scroll effects. */
export const baseCss = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:88px}
body{margin:0;background:var(--c-bone);color:var(--c-ink);font-family:var(--font-body);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
img,video,svg,iframe{max-width:100%}
a{color:inherit}
:focus-visible{outline:2px solid var(--c-rust);outline-offset:3px;border-radius:4px}
.skip{position:absolute;left:12px;top:-60px;z-index:100;padding:12px 16px;border-radius:999px;background:var(--c-ink);color:var(--c-bone);font-weight:600;text-decoration:none}
.skip:focus{top:12px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
main{display:block;overflow-x:clip}
.s{position:relative}
.si{position:relative;display:grid;margin:0 auto;width:100%}
.n{min-width:0}
.s[data-kind="canvas"]>.si{display:block;container-type:inline-size;overflow:visible}
.s[data-kind="canvas"]>.si>.n{position:absolute;--cs:calc(100cqw / var(--cw))}
.s[data-kind="canvas"]>.si>.n>*{width:100%;height:100%}
.s-bg{position:absolute;inset:0;overflow:hidden;z-index:0}
.s-bg img,.s-bg video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.s-bg video{display:none}
.s-bg-tint{position:absolute;inset:0}
.s-bg~.si{z-index:1}
.ov{position:absolute;z-index:5;pointer-events:none}
.ov>.n{pointer-events:auto}
.ov[data-anchor="viewport"]{position:fixed}
.fx-sticky{position:sticky;top:var(--sticky-top,16px);z-index:2}
.lb{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:56px 16px 16px;border:0;background:rgba(20,20,20,.94);color:#F3EFE6;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;cursor:zoom-out}
.lb[open]{display:flex}
.lb::backdrop{background:transparent}
.lb img{max-width:100%;max-height:calc(100dvh - 120px);object-fit:contain;cursor:default}
.lb p{margin:0;font-size:13px;color:#CFC8BB}
.lb-close{position:absolute;top:8px;right:8px;width:48px;height:48px;border:0;background:transparent;color:inherit;font-size:28px;line-height:1;cursor:pointer}
@media (min-width:900px){.s-bg video{display:block}}
@media (prefers-reduced-motion:no-preference){
html.js [data-enter]{opacity:0;transition:opacity .7s cubic-bezier(.2,.8,.2,1),translate .7s cubic-bezier(.2,.8,.2,1),scale .7s cubic-bezier(.2,.8,.2,1)}
html.js [data-enter="slide-up"]{translate:0 28px}
html.js [data-enter="slide-left"]{translate:28px 0}
html.js [data-enter="slide-right"]{translate:-28px 0}
html.js [data-enter="scale"]{scale:.94}
html.js [data-enter].in{opacity:1;translate:0 0;scale:1}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;
