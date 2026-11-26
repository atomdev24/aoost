import { z } from "zod";
import { safeUrl } from "../../../render/links";
import { defineComponent } from "../../types";
import { aeroboticsKit } from "../kit";
import { art, Band, Btn, collectionEntries, Pic, lines, BACKGROUNDS } from "../shared";
import { css } from "./AeroStories.styles";

export const Story = z.object({ image: z.string(), title: z.string(), text: z.string(), url: z.string(), video: z.boolean() });
export const AeroStoriesContent = z.object({
  title: z.string(),
  text: z.string(),
  buttonLabel: z.string(),
  buttonUrl: z.string(),
  /** Crop filters above the cards, one per line (shown, not yet filtering). */
  filters: z.string(),
  stories: z.array(Story),
  /** "overlay": title on the photo (home page); "below": photo, title and text (Success stories page). */
  look: z.enum(["overlay", "below"]),
  bg: z.enum(BACKGROUNDS),
  /** Fill the cards from a collection (its live entries) instead of the list below. */
  collection: z.string().optional(),
  /** With a collection: at most this many cards (0 = all). */
  limit: z.number().int().min(0).max(24).optional(),
});
export type AeroStoriesContent = z.infer<typeof AeroStoriesContent>;

const S = "https://aerobotics.com/success-stories/";
export const STORIES = [
  { image: art("story_1"), title: "How TrueFruit Helps Improve Decision-Making for Table Grape Growers | South Africa", text: "", url: S + "how-truefruit-helps-improve-decision-making-for-table-grape-growers-south-africa", video: true },
  { image: art("story_2"), title: "Southern Cross Farms drives full-orchard intelligence", text: "Learn how Southern Cross Farms uses TrueFruit to scale from 10% sampling to 100% orchard intelligence for improved citrus quality.", url: S + "southern-cross-testimonial", video: false },
  { image: art("story_3"), title: "AC Foods optimizes production", text: "Watch how AC Foods uses TrueFruit to track fruit sizing and build growth curves, to deliver the right size fruit at the right time.", url: S + "ac-foods-testimonial", video: true },
  { image: art("story_4"), title: "Fundo El Paraíso uses Aerobotics to scale citrus sampling", text: "", url: S + "fundo-paraiso-(peru)", video: false },
];

/** Success stories as cards: a photo (with a play mark for videos), the title and an optional line. */
export const AeroStories = defineComponent<AeroStoriesContent>({
  type: "AeroStories",
  label: "Success stories: customer story cards",
  category: "aerobotics",
  schema: AeroStoriesContent,
  defaults: {
    content: {
      title: "The world's most innovative fruit companies are improving profitability with Aerobotics",
      text: "",
      buttonLabel: "See all success stories",
      buttonUrl: "https://aerobotics.com/success-stories",
      filters: "",
      stories: STORIES,
      look: "overlay",
      bg: "pale",
      collection: "",
      limit: 4,
    },
  },
  fullBleed: true,
  kit: aeroboticsKit,
  css,
  Render: ({ content: c, ctx }) => {
    const filters = lines(c.filters);
    // From a collection: each live entry's picture, title, summary and page; a video link makes it a video story.
    const from = collectionEntries(ctx, c.collection, c.limit);
    const stories = from
      ? from.entries.map((e) => ({ image: e.value(from.field("image")), title: e.item.title, text: e.value(from.field("summary")), url: e.href, video: !!e.value(from.field("video", "link")) }))
      : c.stories;
    return (
      <Band bg={c.bg} className={`abst abst-${c.look}`}>
        <div className="abst-head">
          {c.title ? <h2 className="ab-h2">{c.title}</h2> : null}
          {c.text ? <p className="ab-lede">{c.text}</p> : null}
          {c.buttonLabel ? (
            <div className="ab-btns">
              <Btn label={c.buttonLabel} url={c.buttonUrl} kind="outline" ctx={ctx} />
            </div>
          ) : null}
        </div>
        {filters.length ? (
          <p className="abst-filters">
            {filters.map((f, i) => (
              <span key={i} className={i ? "" : "is-on"}>
                {f}
              </span>
            ))}
          </p>
        ) : null}
        <ul className="abst-grid">
          {stories.map((s, i) => (
            <li key={i}>
              <a className="abst-card" href={ctx.editing ? undefined : safeUrl(s.url || "#")}>
                <span className="abst-media">
                  <Pic src={s.image} alt="" sizes="(min-width:1100px) 260px, 50vw" ctx={ctx} />
                  {s.video ? <span className="abst-play" aria-label="Video" /> : null}
                </span>
                <span className="abst-copy">
                  <span className="abst-title">{s.title}</span>
                  {s.text && c.look === "below" ? <span className="abst-text">{s.text}</span> : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Band>
    );
  },
});
