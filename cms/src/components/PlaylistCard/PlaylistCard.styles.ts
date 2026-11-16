export const css = `
.pls{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
.pl{display:flex;align-items:center;gap:16px;padding:12px;border:1.5px solid var(--c-ink);border-radius:14px;color:var(--c-ink);text-decoration:none;background:var(--c-bone);transition:transform .3s cubic-bezier(.2,.8,.2,1),box-shadow .3s cubic-bezier(.2,.8,.2,1)}
.pl:hover{transform:translate(-2px,-2px);box-shadow:5px 5px 0 var(--c-ink)}
.pl:active{transform:scale(.98)}
.pl-cover{flex:none;width:88px;height:88px;border-radius:999px;overflow:hidden;background:var(--c-ink)}
.pl-cover img{display:block;width:100%;height:100%;object-fit:cover}
.pl-meta{display:flex;flex-direction:column;gap:4px;min-width:0}
.pl-go{color:var(--c-rust)}
@media (min-width:900px){.pls{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.pl{flex-direction:column;align-items:flex-start;padding:20px}.pl-cover{width:100%;height:auto;aspect-ratio:1}}
@media (prefers-reduced-motion:reduce){.pl{transition:none}.pl:hover{transform:none}}
`;
