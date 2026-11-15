import { z } from "zod";
import { sandboxDoc } from "../../render/sandbox";
import { defineComponent } from "../types";
import { css } from "./Code.styles";

export const CodeContent = z.object({
  html: z.string(),
  css: z.string(),
  js: z.string(),
  /**
   * sandboxed (default): runs in its own frame; a mistake can't break the page or the editor.
   * inline: runs in the page itself. Opt-in, for trusted snippets that must touch the page.
   */
  mode: z.enum(["sandboxed", "inline"]),
});
export type CodeContent = z.infer<typeof CodeContent>;

export const Code = defineComponent<CodeContent>({
  type: "Code",
  label: "Custom code",
  category: "embed",
  schema: CodeContent,
  defaults: {
    content: {
      html: '<div class="ticker">NOW SHOWING · DUST AND NEON</div>',
      css: ".ticker{font:600 14px Inter,sans-serif;letter-spacing:.12em;padding:12px 0}",
      js: "",
      mode: "sandboxed",
    },
  },
  css,
  Render: ({ node, content, ctx }) => {
    if (!content.html && !content.css && !content.js) return ctx.editing ? <div className="frame-empty">Add some HTML, CSS or JS</div> : null;
    if (content.mode === "inline") {
      // The editor never runs inline scripts: it shows the markup and styles only.
      const scoped = `${content.css ? `<style>${content.css.replace(/<\/style/gi, "")}</style>` : ""}${content.html}${content.js && !ctx.editing ? `<script>${content.js.replace(/<\/script/gi, "<\\/script")}</script>` : ""}`;
      return <div className="code-inline" data-code="inline" dangerouslySetInnerHTML={{ __html: scoped }} />;
    }
    // No allow-same-origin: the frame can't read cookies, storage or the page around it.
    return <iframe className="code-frame" sandbox="allow-scripts" title={node.name || "Custom code"} data-frame={node.id} srcDoc={sandboxDoc(content, node.id)} loading="lazy" />;
  },
});
