export const css = `
.diary{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.diary-entry{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;padding:28px 0;border-top:1.5px solid var(--c-ink)}
.diary-entry time{color:var(--c-muted)}
.diary-body{display:flex;flex-direction:column;gap:10px;min-width:0}
.diary-body h2,.diary-body p{margin:0}
.diary-body p{color:var(--c-text);max-width:560px}
.diary-body .frame{margin-top:8px;max-width:560px;aspect-ratio:4/3;border-radius:6px;height:auto;background:var(--c-sand)}
.diary-body .frame>.media{object-fit:contain}
@media (min-width:900px){.diary-entry{grid-template-columns:200px minmax(0,1fr);gap:40px;padding:40px 0}}
`;
