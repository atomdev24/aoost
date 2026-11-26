export const css = `
.abf-head{display:flex;flex-direction:column;gap:14px;margin-bottom:48px}
.abf-center .abf-head{align-items:center;text-align:center}
.abf-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:36px 32px;margin:0;padding:0;list-style:none}
@media (min-width:700px){.abf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (min-width:1000px){.abf-grid{grid-template-columns:repeat(var(--abf-cols),minmax(0,1fr))}}
.abf-item{display:flex;flex-direction:column;gap:10px}
.abf-rule .abf-item{padding-top:24px;border-top:1px solid var(--ab-line)}
.abf.ab-bg-navy .abf-item{border-color:rgba(255,255,255,.2)}
.abf-icon{width:40px;height:40px;object-fit:contain;margin-bottom:12px}
.abf.ab-bg-navy .abf-icon{filter:invert(1)}
.abf-title{font-size:20px;line-height:1.25;font-weight:700}
.abf-text{font-size:15px}
`;
