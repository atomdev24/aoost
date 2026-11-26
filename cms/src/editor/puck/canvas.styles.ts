/** Editor-only CSS inside the preview iframe. Never shipped to the public site. */
export const canvasCss = `
html.js [data-enter]{opacity:1!important;translate:none!important;scale:none!important}
.ed-nav-preview .nav{position:absolute}
.ed-nav-preview .sheet,.ed-nav-preview .search{display:none}
.ed-nav-preview .pill{cursor:pointer}
.ed-nav-preview .pill:hover{outline:1.5px solid #2F6BFF;outline-offset:3px}
/* Empty sections stay grabbable; :where() so a section's own Min height still wins. */
:where(.s){min-height:48px}
/* Puck puts position:relative inline on draggable items; canvas layers must stay absolute. */
.s[data-kind="canvas"]>.si>.n{position:absolute!important}
.s[data-kind="canvas"]>.si{outline:1px dashed rgba(10,132,255,.4);outline-offset:-1px}
[data-puck-dropzone]:empty{min-height:120px;border:1.5px dashed #8E8E93;border-radius:4px}
.s[data-kind="canvas"]>.si>.n{cursor:move;touch-action:none;user-select:none}
/* Locked blocks are left alone on the canvas: clicks go through to what is under them (unlock in Layers). */
.n.ed-locked,.n.ed-locked *{pointer-events:none!important}
.s[data-kind="canvas"]>.si>.n.ed-selected{outline:calc(1.5px * var(--ed-px,1)) solid #0A84FF;outline-offset:0}
.s[data-kind="canvas"]>.si>.n>.ed-h{position:absolute;box-sizing:border-box;width:calc(10px * var(--ed-px,1))!important;height:calc(10px * var(--ed-px,1))!important;margin:calc(-5px * var(--ed-px,1));background:transparent;border:0;border-radius:0;z-index:10;pointer-events:auto!important}
/* Corners show as 6px squares; the edge handles stay as invisible grab areas. */
.ed-h[data-ed-handle$="w"]::after,.ed-h[data-ed-handle$="e"]::after{content:"";position:absolute;inset:calc(2px * var(--ed-px,1));background:#fff;border:calc(1px * var(--ed-px,1)) solid #0A84FF}
.ed-h[data-ed-handle="e"]::after,.ed-h[data-ed-handle="w"]::after{display:none}
.ed-h[data-ed-handle="nw"]{left:0;top:0;cursor:nwse-resize}.ed-h[data-ed-handle="n"]{left:50%;top:0;cursor:ns-resize}
.ed-h[data-ed-handle="ne"]{left:100%;top:0;cursor:nesw-resize}.ed-h[data-ed-handle="e"]{left:100%;top:50%;cursor:ew-resize}
.ed-h[data-ed-handle="se"]{left:100%;top:100%;cursor:nwse-resize}.ed-h[data-ed-handle="s"]{left:50%;top:100%;cursor:ns-resize}
.ed-h[data-ed-handle="sw"]{left:0;top:100%;cursor:nesw-resize}.ed-h[data-ed-handle="w"]{left:0;top:50%;cursor:ew-resize}
.ed-guides{position:absolute;inset:0;z-index:999;pointer-events:none}
/* Keep-proportions switch on a selected layer or picture, just above its top-left corner. */
.n>.ed-ratio{position:absolute;right:0;left:auto;top:100%;z-index:11;display:inline-flex!important;align-items:center;gap:calc(4px * var(--ed-px,1));width:auto!important;height:auto!important;margin:calc(4px * var(--ed-px,1)) 0 0;padding:calc(2px * var(--ed-px,1)) calc(7px * var(--ed-px,1)) calc(2px * var(--ed-px,1)) calc(5px * var(--ed-px,1));border:0;border-radius:calc(5px * var(--ed-px,1));background:#0A84FF;color:#fff;font:600 calc(11px * var(--ed-px,1))/1.4 -apple-system,system-ui,sans-serif;cursor:pointer;pointer-events:auto!important;transform-origin:100% 0}
.n>.ed-ratio[aria-pressed="false"]{background:#3a3a40}
.n>.ed-ratio svg{width:calc(12px * var(--ed-px,1));height:calc(12px * var(--ed-px,1))}
/* Resize handles for a block in a stacked or grid section (canvas/flow-resize.ts): corners scale,
   edges change width or height. Edges grab along the whole side and show a small square at the middle. */
.n>.ed-fh{--hs:calc(10px * var(--ed-px,1));position:absolute;z-index:11;box-sizing:border-box;pointer-events:auto!important;touch-action:none}
.n>.ed-fh[data-ed-flow-handle="nw"],.n>.ed-fh[data-ed-flow-handle="ne"],.n>.ed-fh[data-ed-flow-handle="se"],.n>.ed-fh[data-ed-flow-handle="sw"]{width:var(--hs);height:var(--hs);margin:calc(var(--hs) / -2);background:#fff;border:calc(1.5px * var(--ed-px,1)) solid #0A84FF;z-index:12}
.n>.ed-fh[data-ed-flow-handle="nw"]{left:0;top:0;cursor:nwse-resize}.n>.ed-fh[data-ed-flow-handle="ne"]{right:0;top:0;cursor:nesw-resize}
.n>.ed-fh[data-ed-flow-handle="se"]{right:0;bottom:0;cursor:nwse-resize}.n>.ed-fh[data-ed-flow-handle="sw"]{left:0;bottom:0;cursor:nesw-resize}
.n>.ed-fh[data-ed-flow-handle="e"],.n>.ed-fh[data-ed-flow-handle="w"]{top:0;bottom:0;width:var(--hs);cursor:ew-resize}
.n>.ed-fh[data-ed-flow-handle="e"]{right:calc(var(--hs) / -2)}.n>.ed-fh[data-ed-flow-handle="w"]{left:calc(var(--hs) / -2)}
.n>.ed-fh[data-ed-flow-handle="n"],.n>.ed-fh[data-ed-flow-handle="s"]{left:0;right:0;height:var(--hs);cursor:ns-resize}
.n>.ed-fh[data-ed-flow-handle="n"]{top:calc(var(--hs) / -2)}.n>.ed-fh[data-ed-flow-handle="s"]{bottom:calc(var(--hs) / -2)}
.n>.ed-fh[data-ed-flow-handle="e"]::after,.n>.ed-fh[data-ed-flow-handle="w"]::after,.n>.ed-fh[data-ed-flow-handle="n"]::after,.n>.ed-fh[data-ed-flow-handle="s"]::after{content:"";position:absolute;left:50%;top:50%;width:calc(var(--hs) * .8);height:calc(var(--hs) * .8);translate:-50% -50%;box-sizing:border-box;background:#fff;border:calc(1.5px * var(--ed-px,1)) solid #0A84FF}
.n:has(>.ed-fh){position:relative}
/* Section height handle: the middle of the bottom edge, on hover (editor/canvas/section-resize.ts). */
.s>.ed-sh{position:absolute;left:50%;bottom:0;z-index:12;width:calc(44px * var(--ed-px,1));height:calc(16px * var(--ed-px,1));translate:-50% 50%;display:flex;align-items:center;justify-content:center;cursor:ns-resize;opacity:0;transition:opacity .15s;pointer-events:auto!important;touch-action:none}
.s>.ed-sh::before{content:"";width:calc(36px * var(--ed-px,1));height:calc(6px * var(--ed-px,1));border-radius:99px;background:#fff;border:calc(1.5px * var(--ed-px,1)) solid #0A84FF;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.s:hover>.ed-sh,.s>.ed-sh[data-h]{opacity:1}
.s>.ed-sh[data-h]::after{content:attr(data-h);position:absolute;top:100%;margin-top:calc(4px * var(--ed-px,1));padding:calc(2px * var(--ed-px,1)) calc(7px * var(--ed-px,1));border-radius:calc(5px * var(--ed-px,1));background:#0A84FF;color:#fff;font:600 calc(11px * var(--ed-px,1))/1.4 -apple-system,system-ui,sans-serif;white-space:nowrap}
html.ed-sizing *{cursor:ns-resize!important;user-select:none}
.ed-guides i{position:absolute;display:block;background:#0A84FF}
html.ed-dragging *{cursor:grabbing!important}
html.ed-dragging [data-puck-overlay-portal],html.ed-dragging [class*="DraggableComponent"]{opacity:0}
.s[data-kind="grid"]>.si{background-image:repeating-linear-gradient(to right,rgba(10,132,255,.07) 0,rgba(10,132,255,.07) var(--ed-col),transparent var(--ed-col),transparent calc(var(--ed-col) + var(--ed-gap)));background-origin:content-box;background-clip:content-box}
.ov{cursor:pointer;outline:1px dashed rgba(10,132,255,.6);outline-offset:2px}
.ov.ed-selected{outline:2px solid #0A84FF}
.ov[data-anchor="viewport"]{position:fixed}
.ed-mega-stage{width:min(1100px,calc(100% - 48px));margin:40px auto;background:#F3EFE6;color:#141414;border:1.5px solid #141414;border-radius:14px;box-shadow:5px 5px 0 #141414;overflow:hidden}
body:has(.ed-mega-stage){background:var(--c-sand)}
.n iframe,.n video,.n audio,.n model-viewer{pointer-events:none}
.ed-flash{animation:ed-flash 2s ease-out}
[data-ed-over]{outline:1.5px solid rgba(255,159,10,.85);outline-offset:-1.5px}
.s[data-ed-over]{outline:none;box-shadow:inset 3px 0 0 rgba(255,159,10,.85)}
/* Mat bands, spaced like the live page's .mat wrapper (editor/canvas/MatBands.tsx). */
.ao .ao-b[data-mat][data-band]{padding-top:0;padding-bottom:var(--s9)}
.ao .ao-b[data-mat][data-band="first"],.ao .ao-b[data-mat][data-band="only"]{padding-top:var(--s8)}
.ao .ao-b[data-mat][data-band="last"],.ao .ao-b[data-mat][data-band="only"]{padding-bottom:var(--s8)}
.ao .ao-b[data-mat="light"][data-band="last"],.ao .ao-b[data-mat="light"][data-band="only"]{padding-bottom:calc(var(--s8) + 40px)}
.ao .ao-b[data-mat][data-band-top]{margin-top:calc(-1 * var(--s9))}
[data-ed-untr]{outline:1.5px dashed rgba(255,159,10,.9);outline-offset:2px}
/* Claude at work (editor/agent/AgentMarks.tsx): a glow in Claude's colour and a small tag. */
.ed-agent-ring{position:fixed;z-index:2147483000;pointer-events:none;border:4px solid #D97757;border-radius:6px}
.ed-agent-ring[data-state="working"]{animation:ed-agent 1.6s ease-in-out infinite}
.ed-drop-bar{position:absolute;z-index:2147483001;pointer-events:none;background:#0A84FF;border-radius:3px;box-shadow:0 0 0 3px rgba(10,132,255,.25);color:transparent;font-size:0}
.ed-drop-bar[data-where="left"],.ed-drop-bar[data-where="right"]{width:calc(6px * var(--ed-px,1))}
.ed-drop-bar[data-where="before"],.ed-drop-bar[data-where="after"]{height:calc(4px * var(--ed-px,1))}
.ed-side-bar{position:absolute;z-index:2147483001;width:calc(6px * var(--ed-px,1));border-radius:3px;background:#0A84FF;box-shadow:0 0 0 3px rgba(10,132,255,.25);pointer-events:none}
.ed-side-bar span{position:absolute;top:8px;white-space:nowrap;padding:4px 9px;border-radius:7px;background:#0A84FF;color:#fff;font:600 calc(13px * var(--ed-px,1))/1.2 system-ui,sans-serif}
.ed-side-bar[data-side="left"] span{left:12px}
.ed-side-bar[data-side="right"] span{right:12px}
@keyframes ed-agent{0%,100%{box-shadow:0 0 0 0 rgba(217,119,87,.0)}50%{box-shadow:0 0 0 12px rgba(217,119,87,.25)}}
.ed-agent-tag{position:fixed;z-index:2147483001;pointer-events:none;padding:2px 8px;border-radius:4px;background:#D97757;color:#fff;font:600 11px/16px -apple-system,Inter,system-ui,sans-serif;white-space:nowrap;letter-spacing:0}
@media (prefers-reduced-motion:reduce){.ed-agent-ring{animation:none!important}}
/* Hover outline + name tag (editor/canvas/HoverLabel.tsx). */
.ed-hover{position:fixed;display:none;pointer-events:none;z-index:2147483000;outline:1.5px dashed #0A84FF;outline-offset:-1px;border-radius:2px}
.ed-hover>span{position:absolute;left:-1px;bottom:100%;padding:1px 6px;border-radius:3px 3px 0 0;background:#0A84FF;color:#fff;font:500 11px/16px -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif;white-space:nowrap;letter-spacing:0}
.ed-hover.is-low>span{bottom:auto;top:0;border-radius:0 0 3px 0}
@keyframes ed-flash{0%,60%{outline:3px solid #0A84FF;outline-offset:3px}100%{outline:3px solid transparent;outline-offset:3px}}
.ed-locked{cursor:not-allowed}
a{cursor:default}
.ed-drop-target{outline:calc(2px * var(--ed-px,1)) solid #0A84FF!important;outline-offset:calc(-2px * var(--ed-px,1))}
.ed-drop-target::before{content:"Drop to replace";position:absolute;z-index:5;left:50%;top:50%;translate:-50% -50%;padding:calc(4px * var(--ed-px,1)) calc(10px * var(--ed-px,1));border-radius:999px;background:#0A84FF;color:#fff;font:600 calc(12px * var(--ed-px,1)) -apple-system,Inter,sans-serif;pointer-events:none}
`;
