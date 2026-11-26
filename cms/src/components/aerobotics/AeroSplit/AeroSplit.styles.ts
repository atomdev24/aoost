export const css = `
.abs-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:40px;align-items:center}
.abs-copy{display:flex;flex-direction:column;gap:22px}
.abs-media{position:relative;display:flex;justify-content:center}
.abs-pic{width:100%;aspect-ratio:69/100;max-height:520px;border-radius:4px}
.abs-m-picture .abs-pic{aspect-ratio:4/3;border-radius:16px}
.abs-charts{display:flex;flex-direction:column;gap:14px;width:100%}
.abs-m-charts .abs-charts .abg:nth-child(even){margin-left:12%}
.abs-m-charts .abs-charts .abg{width:88%}
.abs-m-picture-cards .abs-media{justify-content:flex-start}
.abs-m-picture-cards .abs-pic{width:62%}
.abs-m-picture-cards .abs-charts{position:absolute;right:0;top:50%;transform:translateY(-50%);width:44%;gap:10px}
.abs-m-picture-cards .abg{padding:10px 12px;gap:6px}
.abs-m-picture-cards .abg-title{font-size:15px}
@media (min-width:810px){
  .abs-grid{grid-template-columns:minmax(0,1fr) minmax(0,.9fr);gap:120px}
  .abs-left .abs-grid{grid-template-columns:minmax(0,.9fr) minmax(0,1fr)}
  .abs-left .abs-media{order:-1}
}
`;
