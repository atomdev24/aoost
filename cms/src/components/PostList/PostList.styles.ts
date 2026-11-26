export const css = `
.pl{list-style:none;margin:0;padding:0;display:grid;gap:28px;width:100%}
.pl-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.pl-item a{display:flex;flex-direction:column;gap:12px;color:inherit;text-decoration:none}
.pl-list .pl-item a{flex-direction:row;align-items:flex-start}
.pl-list .pl-cover{width:200px;flex:none}
.pl-cover{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:6px}
.pl-cover-empty{background:currentColor;opacity:.08}
.pl-text{display:flex;flex-direction:column;gap:4px}
.pl-text time{font-size:.8em;opacity:.65}
.pl-text strong{font-size:1.15em;line-height:1.25}
.pl-excerpt{opacity:.8}
.pl-item a:hover strong{text-decoration:underline}
@media (max-width:600px){.pl-list .pl-item a{flex-direction:column}.pl-list .pl-cover{width:100%}}
`;
