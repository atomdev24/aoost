export const css = `
.abw{overflow:hidden;color:#fff;background:#1d2a1a}
.abw-bg{position:absolute;inset:0}
.abw-shade{position:absolute;inset:0;background:rgba(10,14,10,.55)}
.abw-in{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;padding-top:72px;padding-bottom:72px}
.abw-text{max-width:620px;font-size:16px;line-height:1.45;color:rgba(255,255,255,.88)}
.abw-frame{position:relative;width:100%;max-width:1000px;margin-top:24px;padding:10px;border-radius:20px;background:#f3f4f6;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.abw-screen{height:auto;border-radius:12px}
.abw-play{position:absolute;left:50%;top:50%;display:flex;align-items:center;justify-content:center;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;background:rgba(255,255,255,.92);color:#17293E;box-shadow:0 8px 30px rgba(0,0,0,.25);transition:transform .2s}
.abw-play:hover{transform:scale(1.06)}
@media (min-width:810px){.abw-in{padding-top:120px;padding-bottom:100px}.abw-frame{padding:16px}}
`;
