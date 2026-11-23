import type { CSSProperties } from "react";
import { z } from "zod";
import { safeUrl } from "../../render/links";
import { imageSources } from "../../render/media";
import { colorValue } from "../../responsive/css";
import { defineComponent } from "../types";
import { css } from "./Cards.styles";

export const Card = z.object({
  image: z.string(),
  alt: z.string(),
  /** Small line above the title ("Citrus"). */
  eyebrow: z.string(),
  title: z.string(),
  /** Outlined tags, comma separated ("Size, Grade, Bin Scan"). */
  tags: z.string(),
  text: z.string(),
  /** "Available in" */
  listLabel: z.string(),
  /** Round chips, comma separated ("English, Español"); the first is filled. */
  list: z.string(),
  primaryLabel: z.string(),
  primaryUrl: z.string(),
  secondaryLabel: z.string(),
  secondaryUrl: z.string(),
});
export type Card = z.infer<typeof Card>;

export const CardsContent = z.object({
  cards: z.array(Card),
  /** Cards per row on a desktop screen (tablets show two, phones one). */
  columns: z.number().int().min(1).max(4),
  /** Buttons, links and tags. */
  accent: z.string(),
  /** Titles and the filled chip. */
  ink: z.string(),
  /** Card background. */
  surface: z.string(),
});
export type CardsContent = z.infer<typeof CardsContent>;

const split = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const sample = (eyebrow: string, title: string): Card => ({
  image: "",
  alt: "",
  eyebrow,
  title,
  tags: "Tag, Another tag",
  text: "A line or two about what this is and who it's for.",
  listLabel: "Available in",
  list: "English, Español",
  primaryLabel: "View",
  primaryUrl: "#",
  secondaryLabel: "Download",
  secondaryUrl: "#",
});

/**
 * Cards: a row of matching cards (picture, small label, title, tags, a line of
 * text, chips and two links), filled in from a list like a HubSpot module.
 */
export const Cards = defineComponent<CardsContent>({
  type: "Cards",
  label: "Cards: a row of matching cards",
  category: "basic",
  schema: CardsContent,
  defaults: {
    content: { cards: [sample("Group", "First card"), sample("Group", "Second card"), sample("Group", "Third card")], columns: 3, accent: "#0075E1", ink: "#17293E", surface: "#FFFFFF" },
  },
  css,
  Render: ({ content, ctx }) => {
    const vars = { "--cd-accent": colorValue(content.accent || "token:ink"), "--cd-ink": colorValue(content.ink || "token:ink"), "--cd-surface": colorValue(content.surface || "#fff"), "--cd-cols": String(content.columns || 3) } as CSSProperties;
    return (
      <div className="cards" style={vars}>
        {content.cards.map((c, i) => {
          const img = c.image ? imageSources(c.image) : null;
          const chips = split(c.list);
          return (
            <article className="card" key={i}>
              {img ? <img className="card-img" {...img} sizes="(min-width:1100px) 400px, (min-width:700px) 50vw, 100vw" alt={c.alt} loading="lazy" decoding="async" /> : ctx.editing ? <div className="card-img card-img-empty">Choose a picture</div> : null}
              <div className="card-body">
                {c.eyebrow ? <p className="card-eyebrow">{c.eyebrow}</p> : null}
                {c.title ? <h3 className="card-title">{c.title}</h3> : null}
                {split(c.tags).length ? (
                  <p className="card-tags">
                    {split(c.tags).map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </p>
                ) : null}
                {c.text ? <p className="card-text">{c.text}</p> : null}
                {chips.length ? (
                  <div className="card-list">
                    {c.listLabel ? <p className="card-list-label">{c.listLabel}</p> : null}
                    <p className="card-chips">
                      {chips.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </p>
                  </div>
                ) : null}
                {c.primaryLabel || c.secondaryLabel ? (
                  <p className="card-actions">
                    {c.primaryLabel ? (
                      <a className="card-primary" href={ctx.editing ? undefined : safeUrl(c.primaryUrl || "#")}>
                        {c.primaryLabel}
                      </a>
                    ) : null}
                    {c.secondaryLabel ? (
                      <a className="card-secondary" href={ctx.editing ? undefined : safeUrl(c.secondaryUrl || "#")}>
                        {c.secondaryLabel}
                      </a>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  },
});
