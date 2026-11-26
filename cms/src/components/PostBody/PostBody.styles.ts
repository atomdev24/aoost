export const css = `
.post{max-width:720px;margin:0 auto;width:100%}
.post-head{display:flex;flex-direction:column;gap:10px;margin-bottom:24px}
.post-date{font-size:.85em;opacity:.65}
.post-title{margin:0;font-size:clamp(2rem,5vw,3.2rem);line-height:1.08;letter-spacing:-.02em}
.post-excerpt{margin:0;font-size:1.15em;opacity:.8}
.post-cover{display:block;width:100%;height:auto;border-radius:8px;margin-bottom:28px}
.post-cover-empty{aspect-ratio:16/9;margin-bottom:28px}
.post-body{font-size:1.06rem;line-height:1.7}
.post-body>*{margin:0 0 1.1em}
.post-body h2{font-size:1.6em;line-height:1.2;margin-top:1.6em}
.post-body h3{font-size:1.3em;margin-top:1.4em}
.post-body h4{font-size:1.1em;margin-top:1.2em}
.post-body figure{margin:1.6em 0}
.post-body img{display:block;width:100%;height:auto;border-radius:6px}
.post-body figcaption{font-size:.85em;opacity:.65;margin-top:6px}
.post-body blockquote{margin-left:0;padding-left:16px;border-left:3px solid currentColor;opacity:.85}
`;
