/** Editor-only CSS inside the preview iframe. Never shipped to the public site. */
export const canvasCss = `
html.js [data-enter]{opacity:1!important;translate:none!important;scale:none!important}
.ed-nav-preview .nav{position:absolute}
.ed-nav-preview .sheet,.ed-nav-preview .search{display:none}
.s{min-height:48px}
.s[data-kind="canvas"]>.si{outline:1px dashed rgba(181,66,26,.35);outline-offset:-1px}
[data-puck-dropzone]:empty{min-height:120px;border:1.5px dashed #9C9486;border-radius:4px}
.ed-flash{animation:ed-flash 2s ease-out}
@keyframes ed-flash{0%,60%{outline:3px solid #E2683A;outline-offset:3px}100%{outline:3px solid transparent;outline-offset:3px}}
.ed-locked{cursor:not-allowed}
a{cursor:default}
`;
