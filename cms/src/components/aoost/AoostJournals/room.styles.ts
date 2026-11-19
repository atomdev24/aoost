// The opened sketchbook as a dark room (runtime/journals.js, openRoom): a two-page spread sitting on
// the book's own cover, round outline controls, dots. Phones (under 768px) show one page at a time.
// Hand-written. The Atom app's preview keeps the 3D book (.jv without .jvr).
export const roomCss = `
.ao .jv.jvr{display:block;background:#0c0c0d;-webkit-backdrop-filter:none;backdrop-filter:none;color:#fff;opacity:0;transition:opacity .28s ease-out}
.ao .jv.jvr.on{opacity:1}
.ao .jvr-top{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:max(16px,env(safe-area-inset-left,0px));right:max(16px,env(safe-area-inset-right,0px));display:flex;align-items:center;gap:10px;min-height:40px}
.ao .jvr-sw{position:relative;flex:none;width:14px;height:20px;border-radius:1px 2px 2px 1px;overflow:hidden;background:var(--cbg,#222);box-shadow:0 0 0 1px rgba(255,255,255,.14)}
.ao .jvr-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 12px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.8);text-decoration:none}
.ao .jvr-ct{font:400 12px/1 var(--mono);letter-spacing:.08em;color:rgba(255,255,255,.7);font-variant-numeric:tabular-nums;white-space:nowrap}
.ao .jvr-b{display:grid;place-items:center;flex:none;width:40px;height:40px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.32);background:transparent;color:#fff;cursor:pointer;transition:border-color .15s,background .15s,opacity .15s}
.ao .jvr-b:hover:not(:disabled){border-color:#fff;background:rgba(255,255,255,.06)}
.ao .jvr-b:focus-visible,.ao .jvr-dot:focus-visible{outline:2px solid #fff;outline-offset:3px}
.ao .jvr-b:disabled{opacity:.25;cursor:default}
.ao .jvr-stage{position:absolute;inset:calc(76px + env(safe-area-inset-top,0px)) 0 calc(84px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;justify-content:center;gap:28px;perspective:2200px;touch-action:pan-y pinch-zoom}
.ao .jvr-nav{width:44px;height:44px}
/* the cover board: about 4px of it shows around the pages, in its colour or material */
.ao .jvr-book{position:relative;flex:none;padding:4px;border-radius:3px 6px 6px 3px;background:var(--cbg,#222);box-shadow:0 30px 80px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.4);transform-style:preserve-3d}
.ao .jv.on .jvr-book{animation:jvr-in .42s cubic-bezier(.2,.8,.2,1)}
@keyframes jvr-in{from{transform:scale(.94) translateY(12px);opacity:0}to{transform:none;opacity:1}}
.ao .jvr-book>.jmat{z-index:0}
.ao .jvr-pages{position:relative;z-index:1;width:calc(var(--pw) * 2);height:var(--ph);transform-style:preserve-3d}
.ao .jvr.one .jvr-pages{width:var(--pw)}
.ao .jvr-sheet{position:absolute;inset:0;display:flex}
.ao .jvr-p{position:relative;width:var(--pw);height:var(--ph);flex:none}
.ao .jvr .jvr-p>.jv-pg{transform:none;backface-visibility:visible;-webkit-backface-visibility:visible}
.ao .jvr .jvr-p.L>.jv-pg{border-radius:2px 0 0 2px}
.ao .jvr .jvr-p.R>.jv-pg{border-radius:0 2px 2px 0}
.ao .jvr.one .jvr-p>.jv-pg{border-radius:2px}
/* the soft shadow in the gutter, over both pages at the spine */
.ao .jvr-gutter{position:absolute;z-index:5;top:0;bottom:0;left:calc(50% - 28px);width:56px;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(0,0,0,.1) 38%,rgba(0,0,0,.26) 50%,rgba(0,0,0,.1) 62%,transparent)}
.ao .jvr .jvr-p>.jv-pg::after{display:none}
/* the turning leaf: old page on the front, new page on the back */
.ao .jvr-leaf{position:absolute;z-index:6;top:0;width:var(--pw);height:var(--ph);transform-style:preserve-3d}
.ao .jvr-leaf.fwd{left:var(--pw);transform-origin:left center}
.ao .jvr-leaf.back{left:0;transform-origin:right center}
.ao .jvr-leaf.one{left:0}
.ao .jvr-leaf.one.fwd{transform-origin:left center}
.ao .jvr-leaf>.jvr-p{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 0 24px rgba(0,0,0,.25)}
.ao .jvr-leaf>.jvr-p.lf-b{transform:rotateY(180deg)}
.ao .jvr-dots{position:absolute;left:16px;right:16px;bottom:calc(30px + env(safe-area-inset-bottom,0px));display:flex;flex-wrap:wrap;justify-content:center;gap:2px}
.ao .jvr-dot{width:20px;height:20px;padding:0;border:0;background:transparent;cursor:pointer;display:grid;place-items:center}
.ao .jvr-dot::before{content:"";width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.28);transition:background .2s,transform .2s}
.ao .jvr-dot.on::before{background:#fff;transform:scale(1.15)}
@media (max-width:767.98px){
.ao .jvr-stage{gap:8px;inset:calc(68px + env(safe-area-inset-top,0px)) 0 calc(76px + env(safe-area-inset-bottom,0px))}
.ao .jvr-nav{width:36px;height:36px}
.ao .jvr-dots{bottom:calc(24px + env(safe-area-inset-bottom,0px))}
}
@media (prefers-reduced-motion:reduce){.ao .jv.jvr{transition:none}.ao .jv.on .jvr-book{animation:none}}
`;
