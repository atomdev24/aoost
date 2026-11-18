/** Editor-only CSS inside the preview iframe. Never shipped to the public site. */
export const canvasCss = `
html.js [data-enter]{opacity:1!important;translate:none!important;scale:none!important}
.ed-nav-preview .nav{position:absolute}
.ed-nav-preview .sheet,.ed-nav-preview .search{display:none}
.s{min-height:48px}
/* Puck puts position:relative inline on draggable items; canvas layers must stay absolute. */
.s[data-kind="canvas"]>.si>.n{position:absolute!important}
.s[data-kind="canvas"]>.si{outline:1px dashed rgba(10,132,255,.4);outline-offset:-1px}
[data-puck-dropzone]:empty{min-height:120px;border:1.5px dashed #8E8E93;border-radius:4px}
.s[data-kind="canvas"]>.si>.n{cursor:move;touch-action:none;user-select:none}
.s[data-kind="canvas"]>.si>.n.ed-locked{cursor:not-allowed}
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
@keyframes ed-flash{0%,60%{outline:3px solid #0A84FF;outline-offset:3px}100%{outline:3px solid transparent;outline-offset:3px}}
.ed-locked{cursor:not-allowed}
a{cursor:default}
`;
