/**
 * Build the document for a sandboxed code frame (<iframe sandbox srcdoc>).
 * The frame has no access to the page or the editor; it reports its height
 * to the parent so the iframe can size itself to fit (runtime/frames.ts).
 */
export function sandboxDoc(code: { html?: string; css?: string; js?: string }, id: string): string {
  const esc = (s: string) => s.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent;font-family:Inter,system-ui,sans-serif}${(code.css ?? "").replace(/<\/style/gi, "")}</style></head><body>${code.html ?? ""}<script>(function(){var id=${JSON.stringify(id)};function post(){parent.postMessage({aoostFrame:id,height:Math.ceil(document.documentElement.getBoundingClientRect().height)},"*")}new ResizeObserver(post).observe(document.documentElement);addEventListener("load",post);post()})();<\/script>${code.js ? `<script>${esc(code.js)}<\/script>` : ""}</body></html>`;
}
