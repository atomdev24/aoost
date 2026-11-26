import { z } from "zod";
import { livePosts } from "../../model/page-kinds";
import { formatPostDate } from "../PostBody/PostBody";
import { defineComponent } from "../types";
import { css } from "./PostList.styles";

export const PostListContent = z.object({
  /** Only posts under this page (e.g. "blog"); empty lists every post. */
  parentId: z.string().optional(),
  limit: z.number().int().min(1).max(60),
  layout: z.enum(["list", "grid"]),
});
export type PostListContent = z.infer<typeof PostListContent>;

/** The blog index: posts newest first, with cover, date, title and summary. */
export const PostList = defineComponent<PostListContent>({
  type: "PostList",
  label: "Blog list",
  category: "site",
  schema: PostListContent,
  defaults: { content: { parentId: "", limit: 12, layout: "grid" } },
  css,
  Render: ({ content, ctx }) => {
    const posts = livePosts(ctx.site, content.parentId || undefined)
      .concat(ctx.editing ? ctx.site.pages.filter((p) => p.kind === "post" && p.status === "draft" && !p.variantOf && (!content.parentId || p.parentId === content.parentId)) : [])
      .slice(0, content.limit);
    if (!posts.length) return ctx.editing ? <div className="frame-empty">No blog posts yet. Make one with New page → Blog post.</div> : null;
    return (
      <ul className={`pl pl-${content.layout}`}>
        {posts.map((p) => (
          <li key={p.id} className="pl-item">
            <a href={ctx.editing ? undefined : ctx.href({ kind: "page", pageId: p.id })}>
              {p.post?.cover ? <img className="pl-cover" src={p.post.cover} alt={p.post.coverAlt ?? ""} loading="lazy" /> : <span className="pl-cover pl-cover-empty" />}
              <span className="pl-text">
                {p.post?.date ? <time dateTime={p.post.date}>{formatPostDate(p.post.date)}</time> : null}
                <strong>{p.title}</strong>
                {p.post?.excerpt ? <span className="pl-excerpt">{p.post.excerpt}</span> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    );
  },
});
