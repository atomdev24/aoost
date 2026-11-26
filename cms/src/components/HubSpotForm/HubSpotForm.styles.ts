export const css = `
.hsf{display:flex;flex-direction:column;gap:12px;width:100%}
.hsf-heading{margin:0;font:inherit;font-size:1.25em;font-weight:600}
.hsf-target{min-height:120px}
.hsf-stand-in{display:flex;flex-direction:column;gap:10px;padding:16px;border:1px dashed currentColor;border-radius:8px;opacity:.75}
.hsf-field{display:block;height:36px;border-radius:6px;background:currentColor;opacity:.12}
.hsf-short{width:60%}
.hsf-button{display:block;width:120px;height:36px;border-radius:18px;background:currentColor;opacity:.5}
.hsf-stand-in p{margin:4px 0 0;font-size:12px}
.hsf-badge{margin:0;padding:6px 10px;border-radius:6px;background:rgba(255,159,10,.14);color:#9a5b00;font-size:12px}
.hsf-ph{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,max(220px,calc(50% - 8px))),1fr));gap:12px 16px}
.hsf-ph-field{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600}
.hsf-ph-long{grid-column:1/-1}
.hsf-ph input,.hsf-ph textarea{width:100%;box-sizing:border-box;min-height:40px;padding:8px 12px;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:rgba(0,0,0,.03);font:inherit;resize:none;cursor:not-allowed}
.hsf-ph-button{grid-column:1/-1;justify-self:start;min-height:42px;padding:0 24px;border:0;border-radius:999px;background:var(--ab-blue,var(--accent,#0075E1));color:#fff;font:inherit;font-weight:700;opacity:.55;cursor:not-allowed}
.hsf-ph-note{margin:0;font-size:13px;opacity:.75}
`;
