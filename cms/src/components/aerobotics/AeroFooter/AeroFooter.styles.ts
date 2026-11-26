export const css = `
.abft{overflow:hidden;padding:56px 0 28px}
.abft .ab-in{position:relative;z-index:1}
.abft-top{display:flex;flex-direction:column;gap:36px}
.abft-cols{display:flex;flex-wrap:wrap;gap:32px 64px}
.abft-h{margin-bottom:10px;font-size:16px}
.abft-col ul,.abft-social{margin:0;padding:0;list-style:none}
.abft-col li{margin:0 0 6px}
.abft-col a,.abft-col span{font-size:13px;line-height:1.6;color:rgba(255,255,255,.6);text-decoration:none}
.abft-col a:hover{color:#fff}
.abft-social{display:flex;gap:14px}
.abft-social a{display:block;color:#fff;opacity:.95}.abft-social a:hover{opacity:.7}
.abft-legal{display:flex;flex-wrap:wrap;gap:8px 12px;margin-top:120px;font-size:13px;color:rgba(255,255,255,.75)}
.abft-legal a{color:#fff;font-weight:600;text-decoration:none}
.abft-mark{position:absolute;left:0;right:0;bottom:-2%;width:100%;height:auto;opacity:.55;pointer-events:none}
@media (min-width:810px){.abft{padding:72px 0 30px}.abft-top{flex-direction:row;justify-content:space-between}.abft-legal{justify-content:flex-end;margin-top:200px}}
`;
