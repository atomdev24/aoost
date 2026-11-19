// The About intro: hand-written, on the aoost kit's tokens (Lexend display, mono labels).
export const css = `
.ao .ab{padding-top:var(--s6)}
.ao .ab-k{margin:0 0 var(--s6)}
.ao .ab-line{margin:0;max-width:18em;font:300 30px/1.15 var(--display);letter-spacing:-.02em;color:var(--ink)}
.ao .ab-by{margin:var(--s4) 0 0;font:400 var(--t-xs)/1.4 var(--mono);letter-spacing:.06em;color:var(--ink-2)}
.ao .ab-rule{margin:var(--s7) 0 0;border:0;border-top:1px solid var(--rule)}
.ao .ab-links{display:flex;gap:var(--s5);margin:0;padding-bottom:var(--s6)}
.ao .ab-links a{font:400 var(--t-xs)/1.4 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink);text-decoration:none;border-bottom:1px solid var(--rule);padding-bottom:2px;transition:border-color .15s}
.ao .ab-links a:hover{border-color:var(--ink)}
@media (min-width:768px){.ao .ab{padding-top:var(--s8)}.ao .ab-line{font-size:48px}}
`;
