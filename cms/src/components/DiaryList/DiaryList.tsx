import { z } from "zod";
import { imageSources } from "../../render/media";
import { defineComponent } from "../types";
import { css } from "./DiaryList.styles";

export const DiaryListContent = z.object({
  /** How many entries to show, newest first. 0 shows all. */
  limit: z.number().int().min(0),
  showImages: z.boolean(),
});
export type DiaryListContent = z.infer<typeof DiaryListContent>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export const DiaryList = defineComponent<DiaryListContent>({
  type: "DiaryList",
  label: "Diary list",
  category: "site",
  schema: DiaryListContent,
  defaults: { content: { limit: 0, showImages: true } },
  css,
  Render: ({ content, ctx }) => {
    const all = [...ctx.site.collections.diary].sort((a, b) => b.date.localeCompare(a.date));
    const entries = content.limit > 0 ? all.slice(0, content.limit) : all;
    if (!entries.length) return ctx.editing ? <div className="frame-empty">No diary entries yet</div> : null;
    return (
      <ol className="diary" reversed>
        {entries.map((e) => (
          <li key={e.id} id={e.id} className="diary-entry">
            <time className="t-label" dateTime={e.date}>
              {formatDate(e.date)}
            </time>
            <div className="diary-body">
              <h2 className="t-h2">{e.title}</h2>
              <p className="t-body">{e.text}</p>
              {content.showImages && e.image ? (
                <figure className="frame" data-lightbox={e.image} data-caption={e.imageAlt ?? e.title}>
                  <img className="media" {...imageSources(e.image)} alt={e.imageAlt ?? ""} loading="lazy" decoding="async" />
                </figure>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    );
  },
});
