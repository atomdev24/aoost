/** Editor-only CSS inside the preview iframe. Never shipped to the public site. */
export const canvasCss = `
html.js [data-enter]{opacity:1!important;translate:none!important;scale:none!important}
.ed-nav-preview .nav{position:absolute}
.ed-nav-preview .sheet,.ed-nav-preview .search{display:none}
.s{min-height:48px}
/* Puck puts position:relative inline on draggable items; canvas layers must stay absolute. */
.s[data-kind="canvas"]>.si>.n{position:absolute!important}
.s[data-kind="canvas"]>.si{outline:1px dashed rgba(181,66,26,.35);outline-offset:-1px}
[data-puck-dropzone]:empty{min-height:120px;border:1.5px dashed #9C9486;border-radius:4px}
.s[data-kind="canvas"]>.si>.n{cursor:move;touch-action:none;user-select:none}
.s[data-kind="canvas"]>.si>.n.ed-locked{cursor:not-allowed}
.s[data-kind="canvas"]>.si>.n.ed-selected{outline:1.5px solid #E2683A;outline-offset:0}
.s[data-kind="canvas"]>.si>.n>.ed-h{position:absolute;width:10px!important;height:10px!important;margin:-5px;background:#F3EFE6;border:1.5px solid #E2683A;border-radius:2px;z-index:10;pointer-events:auto!important}
.ed-h[data-ed-handle="nw"]{left:0;top:0;cursor:nwse-resize}.ed-h[data-ed-handle="n"]{left:50%;top:0;cursor:ns-resize}
.ed-h[data-ed-handle="ne"]{left:100%;top:0;cursor:nesw-resize}.ed-h[data-ed-handle="e"]{left:100%;top:50%;cursor:ew-resize}
.ed-h[data-ed-handle="se"]{left:100%;top:100%;cursor:nwse-resize}.ed-h[data-ed-handle="s"]{left:50%;top:100%;cursor:ns-resize}
.ed-h[data-ed-handle="sw"]{left:0;top:100%;cursor:nesw-resize}.ed-h[data-ed-handle="w"]{left:0;top:50%;cursor:ew-resize}
.ed-guides{position:absolute;inset:0;z-index:999;pointer-events:none}
.ed-guides i{position:absolute;display:block;background:#E2683A}
html.ed-dragging *{cursor:grabbing!important}
html.ed-dragging [data-puck-overlay-portal],html.ed-dragging [class*="DraggableComponent"]{opacity:0}
.s[data-kind="grid"]>.si{background-image:repeating-linear-gradient(to right,rgba(181,66,26,.07) 0,rgba(181,66,26,.07) var(--ed-col),transparent var(--ed-col),transparent calc(var(--ed-col) + var(--ed-gap)));background-origin:content-box;background-clip:content-box}
.ov{cursor:pointer;outline:1px dashed rgba(226,104,58,.6);outline-offset:2px}
.ov.ed-selected{outline:2px solid #E2683A}
.ov[data-anchor="viewport"]{position:fixed}
.ed-mega-stage{width:min(1100px,calc(100% - 48px));margin:40px auto;background:#F3EFE6;color:#141414;border:1.5px solid #141414;border-radius:14px;box-shadow:5px 5px 0 #141414;overflow:hidden}
body:has(.ed-mega-stage){background:var(--c-sand)}
.ed-flash{animation:ed-flash 2s ease-out}
@keyframes ed-flash{0%,60%{outline:3px solid #E2683A;outline-offset:3px}100%{outline:3px solid transparent;outline-offset:3px}}
.ed-locked{cursor:not-allowed}
a{cursor:default}
`;
