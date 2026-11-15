export const css = `
.file{display:flex;align-items:center;gap:14px;min-height:64px;padding:10px 16px;border:1.5px solid var(--c-ink);border-radius:14px;color:var(--c-ink);text-decoration:none;transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s cubic-bezier(.2,.8,.2,1)}
.file:hover{transform:translate(-2px,-2px);box-shadow:5px 5px 0 var(--c-ink)}
.file:active{transform:scale(.98)}
.file-icon{flex:none;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:999px;background:var(--c-ink);color:var(--c-bone)}
.file-text{display:flex;flex-direction:column;min-width:0}
.file-text .t-small{color:var(--c-muted)}
@media (prefers-reduced-motion:reduce){.file{transition:none}.file:hover{transform:none}}
`;
