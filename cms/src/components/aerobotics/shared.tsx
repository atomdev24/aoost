import type { ReactNode } from "react";
import { safeUrl } from "../../render/links";
import { imageSources } from "../../render/media";
import type { RenderCtx } from "../types";

/** The Aerobotics pictures in the repo (art/aero_*.webp), as the blocks' starting content. */
export const art = (name: string) => `/art/aero_${name}.webp`;

export const BACKGROUNDS = ["white", "soft", "pale", "navy"] as const;
export type Background = (typeof BACKGROUNDS)[number];
export const bgOptions = [
  { label: "White", value: "white" },
  { label: "Soft blue", value: "soft" },
  { label: "Pale blue", value: "pale" },
  { label: "Navy", value: "navy" },
];
export const backgroundField = { type: "select" as const, label: "Background", options: bgOptions };

export const BUTTON_STYLES = ["blue", "white", "outline"] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];
export const buttonStyleField = {
  type: "select" as const,
  label: "Button style",
  options: [
    { label: "Blue", value: "blue" },
    { label: "White", value: "white" },
    { label: "Outline", value: "outline" },
  ],
};

/** Lines of a text box, blanks dropped. */
export const lines = (s: string | undefined) =>
  (s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** "Label | https://…" lines → links. A line without a bar is a label with no link. */
export const linkLines = (s: string | undefined) =>
  lines(s).map((l) => {
    const [label, url] = l.split("|").map((x) => x.trim());
    return { label: label ?? "", url: url ?? "" };
  });

/** A pill button; nothing when it has no label. In the editor it never navigates. */
export function Btn({ label, url, kind, ctx }: { label?: string; url?: string; kind: ButtonStyle; ctx: RenderCtx }) {
  if (!label?.trim()) return null;
  const href = safeUrl(url?.trim() || "#");
  const external = /^https?:/i.test(href);
  return (
    <a className={`ab-btn ab-btn-${kind}`} href={ctx.editing ? undefined : href} {...(external && !ctx.editing ? { target: "_blank", rel: "noopener" } : {})}>
      {label}
    </a>
  );
}

/** A picture (with sizes for the repo's art), or a placeholder in the editor when it's empty. */
export function Pic({ src, alt, className = "", sizes = "100vw", ctx, eager }: { src?: string; alt?: string; className?: string; sizes?: string; ctx: RenderCtx; eager?: boolean }) {
  if (!src) return ctx.editing ? <div className={`ab-empty ${className}`}>Choose a picture</div> : null;
  return <img className={`ab-img ${className}`} {...imageSources(src)} sizes={sizes} alt={alt ?? ""} loading={eager ? "eager" : "lazy"} decoding="async" />;
}

/** A full-width band with the inner column. */
export function Band({ bg, className, children, center }: { bg: Background | string; className: string; children: ReactNode; center?: boolean }) {
  return (
    <div className={`ab ab-full ab-sec ab-bg-${bg} ${className}${center ? " ab-center" : ""}`}>
      <div className="ab-in">{children}</div>
    </div>
  );
}

/** A reading tag as the app shows it on a photo: a small label over a value, with an optional colour swatch. */
export function Tag({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <span className="ab-tag">
      <small>{label}</small>
      <b>
        {swatch ? <i style={{ background: swatch }} /> : null}
        {value}
      </b>
    </span>
  );
}
