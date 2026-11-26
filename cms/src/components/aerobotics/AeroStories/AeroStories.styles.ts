export const css = `
.abst-head{display:flex;flex-direction:column;align-items:center;gap:20px;margin-bottom:40px;text-align:center}
.abst-filters{display:flex;flex-wrap:wrap;gap:8px;margin:-8px 0 28px}
.abst-filters span{display:inline-flex;align-items:center;height:30px;padding:0 14px;border:1px solid #1F2A37;border-radius:999px;font-size:13px;font-weight:600}
.abst-filters span.is-on{background:var(--ab-blue);border-color:var(--ab-blue);color:#fff}
.abst-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin:0;padding:0;list-style:none}
@media (min-width:560px){.abst-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (min-width:1000px){.abst-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}}
.abst-card{position:relative;display:flex;flex-direction:column;height:100%;color:inherit;text-decoration:none}
.abst-media{position:relative;display:block;overflow:hidden;border-radius:10px;aspect-ratio:26/23}
.abst-media .ab-img{transition:transform .5s}
.abst-card:hover .ab-img{transform:scale(1.04)}
.abst-play{position:absolute;width:30px;height:30px;border-radius:50%;background:#fff}
.abst-play::after{content:"";position:absolute;left:12px;top:9px;border-left:9px solid #17293E;border-top:6px solid transparent;border-bottom:6px solid transparent}
.abst-title{font-size:16px;line-height:1.4;font-weight:600}
.abst-text{font-size:13px;line-height:1.45;color:var(--ab-muted)}
.abst-overlay .abst-media::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.55))}
.abst-overlay .abst-copy{position:absolute;left:16px;right:56px;bottom:16px;z-index:1;color:#fff}
.abst-overlay .abst-title{font-weight:300;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.abst-overlay .abst-play{right:14px;bottom:14px;z-index:1}
.abst-below .abst-media{aspect-ratio:16/11}
.abst-below .abst-play{left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;background:rgba(255,255,255,.9)}
.abst-below .abst-play::after{left:18px;top:14px;border-left-width:12px;border-top-width:8px;border-bottom-width:8px}
.abst-below .abst-copy{display:flex;flex-direction:column;gap:6px;padding-top:12px}
`;
