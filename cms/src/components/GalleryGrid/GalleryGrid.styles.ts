export const css = `
.gal{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--gc),minmax(0,1fr));gap:var(--gg)}
.gal li{aspect-ratio:1;border-radius:6px;overflow:hidden;background:var(--c-sand)}
.gal .media{transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.gal li:hover .media{transform:scale(1.04)}
@media (min-width:900px){.gal{grid-template-columns:repeat(var(--gcd),minmax(0,1fr))}}
@media (prefers-reduced-motion:reduce){.gal .media{transition:none}.gal li:hover .media{transform:none}}
`;
