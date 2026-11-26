export const css = `
.abpc-wrap{padding:16px 0;background:var(--ab-soft)}
.abpc{position:relative;display:flex;align-items:flex-end;min-height:520px;padding:16px;overflow:hidden;border-radius:24px;background:#1a1a1a;color:#fff}
.abpc-bg{position:absolute;inset:0}
.abpc-panel{position:relative;display:flex;flex-direction:column;gap:14px;width:100%;padding:24px;border-radius:24px}
.abpc-panel .ab-btns{margin-top:6px}
.abpc-tags{position:absolute;top:24px;right:24px;display:flex;flex-direction:column;align-items:flex-start;gap:10px}
@media (min-width:810px){
  .abpc{align-items:center;min-height:480px;padding:64px}
  .abpc-panel{width:auto;max-width:406px;padding:28px}
  .abpc-right{justify-content:flex-end}
  .abpc-tags{top:50%;right:auto;left:66%;transform:translateY(-50%)}
  .abpc-right .abpc-tags{left:auto;right:66%}
}
`;
