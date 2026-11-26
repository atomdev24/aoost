import { z } from "zod";
import { defineComponent } from "../types";
import { markdownBlocks } from "./markdown";
import { css } from "./PostBody.styles";

export const PostBodyContent = z.object({ body: z.string() });
export type PostBodyContent = z.infer<typeof PostBodyContent>;

export const formatPostDate = (d: string) => {
  const t = new Date(`${d}T12:00:00Z`);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/**
 * A blog post laid out by the template: the page's title, date and cover picture, then the body
 * written in the blog writer. Teammates write; the layout stays on brand.
 */
export const PostBody = defineComponent<PostBodyContent>({
  type: "PostBody",
  label: "Blog post",
  category: "site",
  schema: PostBodyContent,
  defaults: { content: { body: "Start writing here.\n\n## A heading\n\nA paragraph with **bold**, *italic* and a [link](https://example.com)." } },
  css,
  Render: ({ content, ctx }) => {
    const page = ctx.page;
    const post = page?.post;
    return (
      <article className="post">
        <header className="post-head">
          {post?.date ? <time className="post-date" dateTime={post.date}>{formatPostDate(post.date)}</time> : null}
          <h1 className="post-title">{page?.title ?? "Post title"}</h1>
          {post?.excerpt ? <p className="post-excerpt">{post.excerpt}</p> : null}
        </header>
        {post?.cover ? <img className="post-cover" src={post.cover} alt={post.coverAlt ?? ""} /> : ctx.editing ? <div className="frame-empty post-cover-empty">Add a cover picture in the blog writer</div> : null}
        <div className="post-body">{markdownBlocks(content.body)}</div>
      </article>
    );
  },
});
