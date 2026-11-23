export const css = `
.cards{display:grid;grid-template-columns:minmax(0,1fr);gap:20px}
@media (min-width:700px){.cards{grid-template-columns:repeat(min(2,var(--cd-cols)),minmax(0,1fr))}}
@media (min-width:1100px){.cards{grid-template-columns:repeat(var(--cd-cols),minmax(0,1fr));gap:24px}}
.card{display:flex;flex-direction:column;min-width:0;overflow:hidden;border-radius:16px;background:var(--cd-surface);box-shadow:0 1px 2px rgba(23,41,62,.06),0 8px 24px rgba(23,41,62,.05)}
.card-img{display:block;width:100%;aspect-ratio:357/253;object-fit:cover}
.card-img-empty{display:flex;align-items:center;justify-content:center;background:#e9eef4;color:#5a6573;font:500 13px var(--font-body)}
.card-body{display:flex;flex-direction:column;gap:10px;flex:1;padding:20px 20px 22px;font-family:var(--font-body)}
.card-body p{margin:0}
.card-eyebrow{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5a6573}
.card-title{margin:0;font:700 20px/1.25 var(--font-body);color:var(--cd-ink)}
.card-tags{display:flex;flex-wrap:wrap;gap:6px}
.card-tags span{padding:3px 10px;border:1px solid var(--cd-accent);border-radius:999px;color:var(--cd-accent);font-size:12px;font-weight:700;line-height:1.4}
.card-text{font-size:15px;line-height:1.5;color:#333}
.card-list{display:flex;flex-direction:column;gap:8px;margin-top:4px;padding-top:14px;border-top:1px solid #e3e8ef}
.card-list-label{font-size:13px;font-weight:700;color:#5a6573}
.card-chips{display:flex;flex-wrap:wrap;gap:6px}
.card-chips span{display:inline-flex;align-items:center;height:32px;padding:0 12px;border:1px solid #d5dce5;border-radius:999px;background:#fff;color:var(--cd-ink);font-size:13px;font-weight:600}
.card-chips span:first-child{background:var(--cd-ink);border-color:var(--cd-ink);color:#fff}
.card-actions{display:flex;align-items:center;gap:18px;margin-top:auto;padding-top:10px}
.card-primary{display:inline-flex;align-items:center;height:40px;padding:0 22px;border-radius:999px;background:var(--cd-accent);color:#fff;font-size:14px;font-weight:600;text-decoration:none}
.card-secondary{color:var(--cd-accent);font-size:14px;font-weight:600;text-decoration:none}
.card-primary:hover{filter:brightness(1.08)}.card-secondary:hover{text-decoration:underline}
`;
