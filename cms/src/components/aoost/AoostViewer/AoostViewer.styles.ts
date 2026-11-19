// The dark room: the full-screen artwork viewer (runtime/viewer.js drives it).
export const css = `
.ao .viewer{position:fixed;inset:0;z-index:90;background:#0c0c0d;color:#fff;--vx:max(16px,env(safe-area-inset-left,0px));--vt:calc(64px + env(safe-area-inset-top,0px));--vb:calc(72px + env(safe-area-inset-bottom,0px))}
.ao .viewer[hidden]{display:none}
html.ao-viewer-open{overflow:hidden}
.ao .viewer .stage{position:absolute;inset:var(--vt) var(--vx) var(--vb);display:grid;place-items:center;touch-action:pan-y pinch-zoom}
.ao .viewer .stage img,.ao .viewer .stage canvas{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;user-select:none;-webkit-user-drag:none;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.ao .viewer .vcount{position:absolute;top:calc(22px + env(safe-area-inset-top,0px));left:var(--vx);margin:0;font:400 12px/1 var(--mono);letter-spacing:.08em;color:rgba(255,255,255,.7);font-variant-numeric:tabular-nums}
.ao .viewer .vbtn{position:absolute;display:grid;place-items:center;width:40px;height:40px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.32);background:transparent;color:#fff;cursor:pointer;transition:border-color .15s,background .15s}
.ao .viewer .vbtn:hover,.ao .viewer .vbtn.on{border-color:#fff;background:rgba(255,255,255,.06)}
.ao .viewer .vbtn:focus-visible{outline:2px solid #fff;outline-offset:3px}
.ao .viewer .vbtn[hidden]{display:none}
.ao .viewer .vclose{top:calc(10px + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px))}
.ao .viewer .vnav{top:50%;margin-top:-18px;width:36px;height:36px;background:rgba(12,12,13,.55)}
.ao .viewer .vprev{left:8px}
.ao .viewer .vnext{right:8px}
.ao .viewer .vinfo{left:var(--vx);bottom:calc(20px + env(safe-area-inset-bottom,0px));width:32px;height:32px;font:400 13px/1 var(--mono)}
.ao .viewer .vplaque{position:absolute;left:var(--vx);bottom:calc(64px + env(safe-area-inset-bottom,0px));max-width:min(300px,calc(100vw - 32px));padding:14px 16px;background:#161618;border:1px solid rgba(255,255,255,.12);border-radius:4px;color:#eee}
.ao .viewer .vplaque[hidden]{display:none}
.ao .viewer .vplaque p{margin:0}
.ao .viewer .vp-t{font:400 15px/1.35 var(--body)}
.ao .viewer .vp-m{margin-top:6px!important;font:400 11px/1.4 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.ao .viewer .vp-n{margin-top:10px!important;font:300 13px/1.5 var(--body);color:rgba(255,255,255,.8)}
.ao .viewer .vp-l{display:inline-block;margin-top:10px;font:400 11px/1.4 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:#fff}
@media (min-width:600px){
.ao .viewer{--vx:max(96px,env(safe-area-inset-left,0px));--vt:calc(80px + env(safe-area-inset-top,0px));--vb:calc(80px + env(safe-area-inset-bottom,0px))}
.ao .viewer .vcount{left:24px;top:calc(26px + env(safe-area-inset-top,0px))}
.ao .viewer .vclose{top:calc(14px + env(safe-area-inset-top,0px));right:20px}
.ao .viewer .vnav{width:44px;height:44px;margin-top:-22px;background:transparent}
.ao .viewer .vprev{left:16px}
.ao .viewer .vnext{right:16px}
.ao .viewer .vinfo{left:24px;bottom:24px}
.ao .viewer .vplaque{left:24px;bottom:68px}
}
`;
