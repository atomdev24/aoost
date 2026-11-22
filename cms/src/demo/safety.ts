/**
 * The demo editor is open to anyone with the link, on the same address as the real editor. Code
 * that runs on the page itself (a Code block set to "inline") could act on the real editor in the
 * browser of whoever opens the demo, so the demo only takes sandboxed code (its own frame, no
 * access to the page, cookies or storage). Returns why a site isn't allowed, or null.
 */
export function unsafeForDemo(site: unknown): string | null {
  const stack: unknown[] = [site];
  while (stack.length) {
    const v = stack.pop();
    if (!v || typeof v !== "object") continue;
    if (Array.isArray(v)) {
      stack.push(...v);
      continue;
    }
    const o = v as Record<string, unknown>;
    if (o.type === "Code" && (o.content as { mode?: string } | undefined)?.mode === "inline")
      return "Code that runs on the page itself is off in the demo. Set the Code block to Sandboxed.";
    stack.push(...Object.values(o));
  }
  return null;
}
