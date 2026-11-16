import { z } from "zod";
import { Icon } from "../../render/icons";
import { safeUrl } from "../../render/links";
import { defineComponent } from "../types";
import { css } from "./FileDownload.styles";

export const FileDownloadContent = z.object({
  /** A PDF, zip or any uploaded file. */
  src: z.string(),
  label: z.string(),
  note: z.string().optional(),
});
export type FileDownloadContent = z.infer<typeof FileDownloadContent>;

export const FileDownload = defineComponent<FileDownloadContent>({
  type: "FileDownload",
  label: "File download",
  category: "media",
  schema: FileDownloadContent,
  defaults: { content: { src: "", label: "Download" } },
  css,
  Render: ({ content, ctx }) => {
    if (!content.src) return ctx.editing ? <div className="frame-empty">Choose a file</div> : null;
    const ext = (/\.([a-z0-9]+)(\?|$)/i.exec(content.src)?.[1] ?? "file").toUpperCase();
    return (
      <a className="file" href={ctx.editing ? undefined : safeUrl(content.src)} download>
        <span className="file-icon">
          <Icon name="download" size={20} />
        </span>
        <span className="file-text">
          <span className="t-h3">{content.label}</span>
          <span className="t-small">{[ext, content.note].filter(Boolean).join(" · ")}</span>
        </span>
      </a>
    );
  },
});
