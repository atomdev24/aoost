export const css = `
.abh{display:flex;align-items:stretch;overflow:hidden;color:#fff;background:#14210a}
.abh-full{min-height:640px}.abh-medium{min-height:440px}
@media (min-width:810px){.abh-full{min-height:max(680px,100vh)}.abh-medium{min-height:489px}}
.abh-bg{position:absolute;inset:0}
.abh-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,16,10,calc(var(--abh-shade) + .2)) 0%,rgba(8,16,10,var(--abh-shade)) 55%,rgba(8,16,10,calc(var(--abh-shade) * .6)) 100%)}
.abh-center .abh-shade{background:rgba(8,16,10,var(--abh-shade))}
.abh-in{position:relative;display:flex;flex-direction:column;justify-content:center;gap:48px;padding-top:120px;padding-bottom:48px}
.abh-copy{display:flex;flex-direction:column;gap:18px;max-width:560px}
.abh-center .abh-in{align-items:center;text-align:center}.abh-center .abh-copy{align-items:center;max-width:720px}
.abh-badge{height:46px;width:auto;align-self:flex-start;border-radius:6px}
.abh-center .abh-badge{align-self:center}
.abh-text{font-size:16px;line-height:1.45;color:rgba(255,255,255,.9);max-width:460px}
.abh-copy .ab-btns{margin-top:10px}
.abh-logos{display:flex;flex-wrap:wrap;align-items:center;gap:20px 40px;margin:0;padding:0;list-style:none}
.abh-center .abh-logos{justify-content:center}
.abh-logos img{display:block;height:34px;width:auto;max-width:150px;object-fit:contain;opacity:.92}
@media (min-width:810px){.abh-in{padding-top:150px}.abh-logos{gap:24px 64px}.abh-logos img{height:40px}}
`;
