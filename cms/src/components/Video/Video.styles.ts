export const css = `
.vid{background:#0F0F11}
.vid>.media{display:block;width:100%;height:100%;border:0;object-fit:cover}
.vid-facade{position:relative;display:block;width:100%;height:100%;padding:0;border:0;background:transparent;color:#F3EFE6;cursor:pointer}
.vid-facade .media{display:block;width:100%;height:100%;object-fit:cover}
.vid-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(20,20,20,.25);transition:background-color .2s}
.vid-facade:hover .vid-play{background:rgba(20,20,20,.1)}
.vid-still{display:none!important}
.vid-facade{isolation:isolate;overflow:hidden;font-family:var(--font-body);text-align:left;-webkit-tap-highlight-color:transparent}
.vid-facade>.media{transition:scale .6s cubic-bezier(.2,.8,.2,1)}
.vid-facade:not(.vid-p-classic):hover>.media{scale:1.03}
.vid-facade:not(.vid-p-classic)::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(8,16,24,.55),rgba(8,16,24,0) 34%,rgba(8,16,24,0) 70%,rgba(8,16,24,.35))}
.vid-chan{position:absolute;z-index:2;top:12px;left:12px;right:12px;display:flex;align-items:center;gap:10px;color:#fff}
.vid-av{flex:none;display:grid;place-items:center;width:34px;height:34px;overflow:hidden;border-radius:50%;background:#fff;color:#17293e;font:700 15px var(--font-body);box-shadow:0 2px 6px rgba(0,0,0,.25)}
.vid-av img{width:100%;height:100%;object-fit:contain;padding:7px}
.vid-chan-text{min-width:0}
.vid-chan b{display:block;overflow:hidden;font-size:14px;font-weight:600;line-height:1.2;white-space:nowrap;text-overflow:ellipsis;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.vid-chan small{display:block;font-size:12px;line-height:1.2;opacity:.8}
.vid-dur{position:absolute;z-index:2;right:12px;bottom:12px;padding:2px 7px;border-radius:6px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
.vid-pb{position:absolute;z-index:2;left:50%;top:50%;display:grid;place-items:center;color:#fff;transform:translate(-50%,-50%);transition:transform .12s ease,background-color .2s,box-shadow .2s}
.vid-tri{display:block;width:0;height:0;margin-left:5px;border-style:solid;border-width:12px 0 12px 20px;border-color:transparent transparent transparent currentColor}
.vid-facade:active .vid-pb{transform:translate(-50%,-50%) scale(.94)}
.vid-facade:focus-visible{outline:3px solid #fff;outline-offset:-6px}
.vid-p-disc .vid-pb{width:76px;height:76px;border-radius:50%;background:var(--play,#0075e1);box-shadow:0 10px 30px color-mix(in srgb,var(--play,#0075e1) 45%,transparent)}
.vid-p-disc:hover .vid-pb,.vid-p-glass:hover .vid-pb{transform:translate(-50%,-50%) scale(1.07)}
.vid-p-glass .vid-pb{width:80px;height:80px;border:1.5px solid rgba(255,255,255,.6);border-radius:50%;background:rgba(255,255,255,.22);-webkit-backdrop-filter:blur(12px) saturate(140%);backdrop-filter:blur(12px) saturate(140%)}
.vid-p-glass:hover .vid-pb{background:rgba(255,255,255,.34)}
.vid-p-pill .vid-pb{left:14px;top:auto;bottom:14px;display:flex;gap:10px;height:46px;padding:0 18px 0 8px;border-radius:999px;background:#fff;color:#17293e;font-size:15px;font-weight:600;white-space:nowrap;transform:none;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.vid-p-pill .vid-pb i{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--play,#0075e1);color:#fff}
.vid-p-pill .vid-tri{margin-left:3px;border-width:7px 0 7px 11px}
.vid-pill-dur{font-weight:500;opacity:.6}
.vid-p-pill:hover .vid-pb{transform:translateY(-2px)}
.vid-p-pill:active .vid-pb{transform:scale(.96)}
.vid-p-ring .vid-pb{width:70px;height:70px;border:2px solid #fff;border-radius:50%;background:rgba(8,16,24,.25)}
.vid-p-ring .vid-pb::before,.vid-p-ring .vid-pb::after{content:"";position:absolute;inset:-2px;border:2px solid rgba(255,255,255,.7);border-radius:50%;animation:vid-pulse 2.4s ease-out infinite}
.vid-p-ring .vid-pb::after{animation-delay:1.2s}
.vid-p-ring .vid-tri{margin-left:4px;border-width:10px 0 10px 16px}
@keyframes vid-pulse{to{transform:scale(1.8);opacity:0}}
.vid-p-square .vid-pb{width:72px;height:72px;border-radius:22px;background:#fff;color:var(--play,#0075e1);box-shadow:0 10px 28px rgba(0,0,0,.28)}
.vid-p-square:hover .vid-pb{transform:translate(-50%,-50%) rotate(-6deg) scale(1.05)}
.vid-p-triangle .vid-pb{width:90px;height:90px;filter:drop-shadow(0 4px 14px rgba(0,0,0,.45))}
.vid-p-triangle .vid-tri{margin-left:10px;border-width:30px 0 30px 50px}
@media (prefers-reduced-motion:reduce){.vid-p-ring .vid-pb::before,.vid-p-ring .vid-pb::after{animation:none;display:none}}
@media (max-width:899px){.vid-still-mobile>video{display:none}.vid-still-mobile>.vid-still{display:block!important}}
`;
