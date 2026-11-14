export const css = `
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 22px;box-sizing:border-box;max-width:100%;border:1.5px solid var(--c-ink);border-radius:999px;font:600 14px var(--font-body);color:var(--c-ink);text-decoration:none;cursor:pointer;transition:transform .15s ease,background-color .2s,color .2s}
.n.fw>.btn{width:100%}
.btn:active{transform:scale(.95)}
.btn-filled{background:var(--c-ink);color:var(--c-bone)}
.btn-filled:hover{background:var(--c-rust);border-color:var(--c-rust)}
.btn-outline:hover{background:var(--c-ink);color:var(--c-bone)}
.btn-text{border-color:transparent;padding:0 4px;text-decoration:underline;text-underline-offset:4px}
.btn-text:hover{color:var(--c-rust)}
`;
