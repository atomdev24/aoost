// .frame is the InDesign-style frame; .media is the content fitted inside it.
// The node wrapper owns size, radius, border and shadow; the frame clips to it.
export const css = `
.frame{position:relative;margin:0;width:100%;height:100%;overflow:hidden;border-radius:inherit}
.frame::after{content:"";display:none;position:absolute;inset:0;mix-blend-mode:lighten;pointer-events:none}
.frame>.media,.frame>a>.media{display:block;width:100%;height:100%;object-fit:cover}
.frame>a{display:block;width:100%;height:100%}
.frame figcaption{position:absolute;left:10px;bottom:10px;padding:4px 8px;border-radius:6px;background:rgba(20,20,20,.78);color:var(--c-bone)}
.frame[data-lightbox]{cursor:zoom-in}
.n:has(>.frame>a.press){transition:scale .14s ease}
.n:has(>.frame>a.press:active){scale:.95}
.frame>a.press .media{transition:filter .2s}
.frame>a.press:hover .media{filter:brightness(1.06)}
.frame>a:focus-visible{outline:3px solid var(--c-rust);outline-offset:-3px}
/* Parallax on a picture: it slides inside its frame (runtime/effects.ts); the frame stays put. */
.frame>.drift{position:relative;width:100%;height:100%}
.drift>.media,.drift>a>.media{display:block;width:100%;height:100%;object-fit:cover}
.drift>a{display:block;width:100%;height:100%}
/* Slow pan (Ken Burns): a gentle, endless sweep, enlarged just enough to never show an edge. */
.drift.kb{animation:kb-left var(--kb,180s) ease-in-out infinite alternate;will-change:transform}
.drift.kb-right{animation-name:kb-right}.drift.kb-in{animation-name:kb-in}.drift.kb-out{animation-name:kb-out}
@keyframes kb-left{from{transform:scale(1.05) translateX(1.5%)}to{transform:scale(1.05) translateX(-1.5%)}}
@keyframes kb-right{from{transform:scale(1.05) translateX(-1.5%)}to{transform:scale(1.05) translateX(1.5%)}}
@keyframes kb-in{from{transform:scale(1.02)}to{transform:scale(1.07)}}
@keyframes kb-out{from{transform:scale(1.07)}to{transform:scale(1.02)}}
@media (prefers-reduced-motion:reduce){.drift.kb{animation:none}}
.drift.drifting{translate:0 var(--drift,0px);scale:var(--drift-scale,1);transform-origin:var(--drift-origin,50% 50%);will-change:translate}
@media (prefers-reduced-motion:reduce){.n:has(>.frame>a.press:active){scale:none}}
.frame-empty{display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;width:100%;height:100%;min-height:120px;box-sizing:border-box;padding:12px;border-radius:inherit;background:color-mix(in srgb,var(--c-text,#3b3b3b) 7%,transparent);color:color-mix(in srgb,var(--c-text,#3b3b3b) 55%,transparent);font:500 12px/1.3 var(--font-body);text-align:center}
.frame-empty::before{content:"";width:28px;height:28px;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.4' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='14' rx='2'/%3E%3Cpath d='M3 16l5-5 4 4 3-3 6 6'/%3E%3Ccircle cx='16' cy='9' r='1.6'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.4' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='14' rx='2'/%3E%3Cpath d='M3 16l5-5 4 4 3-3 6 6'/%3E%3Ccircle cx='16' cy='9' r='1.6'/%3E%3C/svg%3E") center/contain no-repeat;opacity:.7}
`;
