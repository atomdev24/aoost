import type { ReactElement, ReactNode } from "react";
import type { RenderCtx } from "../components/types";
import { DESKTOP_MIN, type Overlay, type Section } from "../schema";
import { imageSources } from "./media";
import { NodeView } from "./NodeView";

export function SectionBackground({ section }: { section: Section }): ReactElement | null {
  const bg = section.layout.base.background;
  const dbg = section.layout.desktop?.background ?? bg;
  const image = dbg?.image ?? bg?.image;
  const video = dbg?.video ?? bg?.video;
  const poster = dbg?.poster ?? bg?.poster;
  const overlay = dbg?.overlay ?? bg?.overlay;
  if (!image && !video) return null;
  return (
    <div className="s-bg" aria-hidden="true">
      {image || poster ? <BackgroundImage mobile={bg?.poster ?? bg?.image} desktop={(poster ?? image)!} /> : null}
      {/* Phones get the still; the video only loads on desktop (see runtime/video.ts). */}
      {video ? <video data-bg-src={video} muted loop playsInline preload="none" poster={poster} /> : null}
      {overlay ? <span className="s-bg-tint" /> : null}
    </div>
  );
}

/**
 * A section's background picture. A phone-sized picture of its own (set on the
 * mobile size, different from the desktop one) is used below the desktop width;
 * otherwise the desktop picture shows everywhere.
 */
function BackgroundImage({ mobile, desktop }: { mobile?: string; desktop: string }): ReactElement {
  const img = { alt: "", loading: "lazy" as const, decoding: "async" as const, sizes: "100vw" };
  if (!mobile || mobile === desktop) return <img {...imageSources(desktop)} {...img} />;
  const wide = imageSources(desktop);
  return (
    <picture>
      <source media={`(min-width:${DESKTOP_MIN}px)`} srcSet={wide.srcSet ?? wide.src} sizes="100vw" />
      <img {...imageSources(mobile)} {...img} />
    </picture>
  );
}

/** Shared section shell, used by the public site and (with editable children) the editor. */
export function SectionShell({ section, children, extra }: { section: Section; children: ReactNode; extra?: ReactNode }): ReactElement {
  return (
    <section id={section.id} className={`s s-${section.id}`} data-kind={section.kind}>
      <SectionBackground section={section} />
      <div className="si">{children}</div>
      {extra}
    </section>
  );
}

export function OverlayView({ overlay, ctx }: { overlay: Overlay; ctx: RenderCtx }): ReactElement {
  return (
    <div className={`ov ov-${overlay.id}`} data-anchor={overlay.anchor === "viewport" ? "viewport" : overlay.anchor.edge}>
      <NodeView node={overlay.node} ctx={ctx} />
    </div>
  );
}

export function SectionView({ section, overlays, ctx }: { section: Section; overlays: Overlay[]; ctx: RenderCtx }): ReactElement {
  return (
    <SectionShell section={section} extra={overlays.map((o) => <OverlayView key={o.id} overlay={o} ctx={ctx} />)}>
      {section.children.map((n) => (
        <NodeView key={n.id} node={n} ctx={ctx} />
      ))}
    </SectionShell>
  );
}
