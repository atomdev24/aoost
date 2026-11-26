import { useState } from "react";
import { languageName } from "../../model/i18n";
import type { CustomField } from "@puckeditor/core";
import { resolve, setOnly } from "../../responsive/resolve";
import type { FrameFit, Node, Responsive, Section, SectionLayout, Style } from "../../schema";
import { BREAKPOINT_LABEL, DEFAULT_FRAME_FIT } from "../../schema";
import { FocalPicker } from "../fields/FocalPicker";
import { ResponsiveEditor } from "../fields/ResponsiveEditor";
import { FRAME_ROWS, SECTION_ROWS, STYLE_ROWS } from "../fields/rows";
import { isHidden, locate, setHidden, updateNode } from "../../model/page-ops";
import { isEdgeToEdge, setEdgeToEdge } from "../../model/edge";
import { currentPage, updatePage, useEditor } from "../store";
import { alignSelection, distributeSelection } from "../canvas/actions";
import { previewDrift } from "../canvas/drift-preview";
import type { AlignMode } from "../canvas/geometry";
import { Select, Toggle } from "../ui/kit";
import { usePuck } from "./usePuck";

const KIND: Record<string, Section["kind"]> = { FlowSection: "flow", GridSection: "grid", CanvasSection: "canvas" };

/** The kind of section the selected node sits in (decides which rows make sense). */
function useParentKind(): Section["kind"] | undefined {
  return usePuck((s) => {
    const id = s.selectedItem?.props.id;
    const parent = id ? s.getParentById(id) : undefined;
    return parent ? KIND[parent.type] : undefined;
  });
}

const ALIGN_ICONS: Record<AlignMode, string> = {
  left: "M2 2v12M5 5h8v2.500H5zM5 9h5v2.500H5z",
  center: "M8 2v12M3 5h10v2.500H3zM5 9h6v2.500H5z",
  right: "M14 2v12M3 5h8v2.500H3zM6 9h5v2.500H6z",
  top: "M2 2h12M5 5v8h2.500V5zM9 5v5h2.500V5z",
  middle: "M2 8h12M5 3v10h2.500V3zM9 5v6h2.500V5z",
  bottom: "M2 14h12M5 3v8h2.500V3zM9 6v5h2.500V6z",
};

/** Align and distribute for canvas layers. One layer aligns to the artboard; Shift-click to select more. */
function AlignBar() {
  const count = useEditor((s) => s.selection.length);
  const icon = (d: string) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
  return (
    <div className="ed-align">
      <div className="ed-align-row" role="group" aria-label="Align">
        {(Object.keys(ALIGN_ICONS) as AlignMode[]).map((mode) => (
          <button key={mode} type="button" className="ed-icon" title={`Align ${mode}${count > 1 ? "" : " in the artboard"}`} aria-label={`Align ${mode}`} onClick={() => alignSelection(mode)}>
            {icon(ALIGN_ICONS[mode])}
          </button>
        ))}
        <button type="button" className="ed-icon" title="Distribute horizontally (3 or more layers)" aria-label="Distribute horizontally" disabled={count < 3} onClick={() => distributeSelection("x")}>
          {icon("M2 2v12M14 2v12M6.500 5v6h3V5z")}
        </button>
        <button type="button" className="ed-icon" title="Distribute vertically (3 or more layers)" aria-label="Distribute vertically" disabled={count < 3} onClick={() => distributeSelection("y")}>
          {icon("M2 2h12M2 14h12M5 6.500h6v3H5z")}
        </button>
      </div>
      <p className="ed-hint">{count > 1 ? `${count} layers selected.` : "Shift-click layers to select several."} Drag to move, Shift locks the axis, Alt turns snapping off.</p>
    </div>
  );
}

/** The block's style, as two inspector groups: Layout (where and how big) and Frame (how it looks). */
function StylePanel({ value, onChange, framed, textual }: { value: Responsive<Style>; onChange: (v: Responsive<Style>) => void; framed: boolean; textual?: boolean }) {
  const parentKind = useParentKind();
  return (
    <>
      <InspectorGroup title="Layout">
        {parentKind === "canvas" ? <AlignBar /> : null}
        <ResponsiveEditor value={value} onChange={onChange} rows={STYLE_ROWS} ctx={{ parentKind, framed }} groups={["Position", "Size", "Grid cell", "Spacing"]} />
      </InspectorGroup>
      <InspectorGroup title="Frame">
        <ResponsiveEditor value={value} onChange={onChange} rows={STYLE_ROWS} ctx={{ parentKind, framed, textual }} groups={["Frame", "Look"]} hideHeads={["Frame"]} />
      </InspectorGroup>
    </>
  );
}

export const styleField = (framed: boolean, textual = false): CustomField<Responsive<Style>> => ({
  type: "custom",
  label: "Layout",
  render: ({ value, onChange }) => <StylePanel value={value} onChange={onChange} framed={framed} textual={textual} />,
});

/** A titled group in the inspector: 11px semibold label, then its rows. */
/** Which inspector tab a group sits under (UI spec, Nov 2026: Content / Style / Layout). */
export type InspectorTab = "content" | "style" | "layout";
const GROUP_TAB: Record<string, InspectorTab> = { Layout: "layout", "Visible on": "layout", Frame: "style", "Picture in frame": "style", Motion: "style", Background: "style" };
/** One line per group, shown by its help icon. Plain words for teammates who aren't designers. */
export const GROUP_HELP: Record<string, string> = {
  Content: "The words, pictures and links in this block. The same on every screen size.",
  Layout: "Where the block sits and how big it is: position, size, columns and spacing. Can differ per screen size.",
  "Visible on": "Switch the block off on screen sizes where it shouldn't show. It stays on the others.",
  Frame: "How the block's box looks: corners, border, background, shadow and opacity.",
  "Picture in frame": "How the picture fills its box: crop or fit, the focus point, and any slow pan or zoom.",
  Motion: "How the block animates as it scrolls into view, and any parallax as you scroll past.",
  Background: "The section's background colour or picture, and how it is shaded.",
};

export function InspectorGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [help, setHelp] = useState(false);
  const text = GROUP_HELP[title];
  return (
    <section className="ed-igroup" data-tab={GROUP_TAB[title] ?? "style"}>
      <h4 className="ed-igroup-title">
        {title}
        {text ? <HelpButton label={title} open={help} onToggle={() => setHelp(!help)} /> : null}
      </h4>
      {help && text ? <p className="ed-help-text">{text}</p> : null}
      {children}
    </section>
  );
}

export function HelpButton({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="ed-help" aria-expanded={open} aria-label={`What is ${label}?`} title={GROUP_HELP[label]} onClick={onToggle}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M6.200 6.200a1.900 1.900 0 0 1 3.600.8c0 1.300-1.800 1.600-1.800 2.700M8 11.600v.1" />
      </svg>
    </button>
  );
}

function ContentHeading() {
  const [help, setHelp] = useState(false);
  const lang = useEditor((s) => s.lang);
  return (
    <div data-tab="content">
      <h4 className="ed-igroup-title ed-igroup-solo">
        Content <span>{lang ? `${languageName(lang)} version · same on every screen size` : "same on every screen size"}</span>
        <HelpButton label="Content" open={help} onToggle={() => setHelp(!help)} />
      </h4>
      {help ? <p className="ed-help-text">{GROUP_HELP.Content}</p> : null}
    </div>
  );
}

/** "Content": the heading above a block's own fields (text, images, links). Content is shared by every breakpoint. */
export const contentHeading: CustomField<undefined> = {
  type: "custom",
  label: "Content",
  render: () => <ContentHeading />,
};

/** "Visible on": one switch per breakpoint. Each changes only its own breakpoint. */
function VisibleOn() {
  const id = usePuck((s) => s.selectedItem?.props.id as string | undefined);
  const page = useEditor(currentPage);
  const at = id ? locate(page, id) : null;
  if (!id || !at || at.kind === "overlay") return null;
  const item = at.kind === "section" ? at.section : at.node;
  return (
    <InspectorGroup title="Visible on">
      <div className="ed-visible" role="group" aria-label="Visible on">
        {(["desktop", "mobile", "tablet", "widescreen"] as const).map((bp) => {
          const shown = !isHidden(item, bp);
          const name = BREAKPOINT_LABEL[bp];
          return (
            <button
              key={bp}
              type="button"
              className="ed-chip"
              aria-pressed={shown}
              aria-label={`Visible on ${name}`}
              onClick={() => updatePage(page.id, (p) => setHidden(p, id, bp, shown), `${shown ? "Hide on" : "Show on"} ${name}`)}
            >
              {name} {shown ? "✓" : "hidden"}
            </button>
          );
        })}
      </div>
    </InspectorGroup>
  );
}

export const visibleOnField: CustomField<undefined> = {
  type: "custom",
  label: "Visible on",
  render: () => <VisibleOn />,
};

/**
 * InDesign-style frame vs content: the frame's size, ratio, corners, border
 * and shadow live in "Layout and look"; this panel fits the content inside it.
 */
/** "Edge to edge": the picture fills the screen's width, past the section's padding and content width. */
function EdgeToEdge() {
  const id = usePuck((s) => s.selectedItem?.props.id as string | undefined);
  const kind = useParentKind();
  const page = useEditor(currentPage);
  const at = id ? locate(page, id) : null;
  if (!id || kind !== "flow" || at?.kind !== "node") return null;
  const on = isEdgeToEdge(at.node);
  return (
    <div className="ed-row">
      <span className="ed-label" title="Fill the whole width of the screen, past the section's padding and content width, on every size">
        Edge to edge
      </span>
      <div className="ed-control">
        <Toggle checked={on} label="Edge to edge" onChange={(v: boolean) => updatePage(page.id, (p) => updateNode(p, id, (n) => setEdgeToEdge(n, v)), v ? "Edge to edge" : "Back inside the section")} />
      </div>
    </div>
  );
}

function FramePanel({ value, onChange }: { value: Responsive<FrameFit> | undefined; onChange: (v: Responsive<FrameFit>) => void }) {
  const bp = useEditor((s) => s.bp);
  // The picture to aim at: the image itself, or a video's poster frame.
  const src = usePuck((s) => (s.selectedItem?.props.src as string) || (s.selectedItem?.props.poster as string) || "");
  const v = value ?? { base: DEFAULT_FRAME_FIT };
  const now = resolve(v, bp);
  const preview = src && /\.(jpe?g|png|webp|avif|gif|svg)(\?|$)/i.test(src) ? src : "";
  return (
    <>
      <EdgeToEdge />
      <div className="ed-seg ed-seg-fill" role="group" aria-label="Content fit">
        {(["fill", "fit", "free"] as const).map((fit) => (
          <button key={fit} type="button" aria-pressed={now.fit === fit} title={fit === "free" ? "Pan and zoom the content freely" : undefined} onClick={() => onChange(setOnly(v, bp, { fit }))}>
            {fit === "fill" ? "Fill" : fit === "fit" ? "Fit" : "Free"}
          </button>
        ))}
      </div>
      {preview ? <FocalPicker src={preview} x={now.focalX} y={now.focalY} onChange={(focalX, focalY) => onChange(setOnly(v, bp, { focalX, focalY }))} /> : null}
      {now.fit === "free" ? (
        <div className="ed-row">
          <span className="ed-label">Zoom</span>
          <div className="ed-control">
            <input className="ed-range" type="range" min={0.5} max={4} step={0.05} value={now.zoom} aria-label="Zoom" onChange={(e) => onChange(setOnly(v, bp, { zoom: Number(e.target.value) }))} />
          </div>
        </div>
      ) : null}
      <ResponsiveEditor value={v} onChange={onChange} rows={FRAME_ROWS.filter((r) => r.key !== "fit")} ctx={{ fit: now.fit }} />
    </>
  );
}

export const frameField: CustomField<Responsive<FrameFit>> = {
  type: "custom",
  label: "Picture in frame",
  render: ({ value, onChange }) => (
    <InspectorGroup title="Picture in frame">
      <FramePanel value={value} onChange={onChange} />
    </InspectorGroup>
  ),
};

const ENTER = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade in" },
  { value: "slide-up", label: "Slide up" },
  { value: "slide-left", label: "Slide from right" },
  { value: "slide-right", label: "Slide from left" },
  { value: "scale", label: "Scale up" },
];

export const effectsField: CustomField<Node["effects"]> = {
  type: "custom",
  label: "Scroll effects",
  render: ({ value, onChange }) => {
    const fx = value ?? {};
    const set = (patch: NonNullable<Node["effects"]>) => {
      const next = Object.fromEntries(Object.entries({ ...fx, ...patch }).filter(([, v]) => v !== undefined && v !== "none" && v !== false && v !== 0));
      onChange(Object.keys(next).length ? (next as Node["effects"]) : undefined);
    };
    return (
      <InspectorGroup title="Motion">
      <div className="ed-responsive">
        <div className="ed-row">
          <span className="ed-label">On enter</span>
          <div className="ed-control">
            <Select ariaLabel="Enter effect" value={fx.enter ?? "none"} options={ENTER} onChange={(v) => set({ enter: (v || "none") as "fade" })} />
          </div>
        </div>
        <div className="ed-row">
          <span className="ed-label">Parallax</span>
          <div className="ed-control">
            <input
              className="ed-range"
              type="range"
              min={-0.5}
              max={0.5}
              step={0.05}
              value={fx.parallax ?? 0}
              aria-label="Parallax amount"
              title="Pictures slide inside their frame as the page scrolls; other blocks drift. Plays on the live page; here you get a quick preview."
              onChange={(e) => {
                const f = Number(e.target.value);
                set({ parallax: f });
                previewDrift(f);
              }}
            />
            <span className="ed-range-value">{fx.parallax ? (fx.parallax > 0 ? "+" : "") + fx.parallax.toFixed(2) : "Off"}</span>
          </div>
        </div>
        <div className="ed-row">
          <span className="ed-label" title="The Ken Burns effect: the picture keeps drifting slowly, back and forth (pictures only)">Slow pan</span>
          <div className="ed-control">
            <Select
              ariaLabel="Slow pan"
              value={fx.pan ?? "none"}
              options={[
                { value: "none", label: "None" },
                { value: "left", label: "Drift left" },
                { value: "right", label: "Drift right" },
                { value: "in", label: "Slow zoom in" },
                { value: "out", label: "Slow zoom out" },
              ]}
              onChange={(v) => set({ pan: v === "none" ? undefined : (v as "left") })}
            />
          </div>
        </div>
        {fx.pan ? (
          <div className="ed-row">
            <span className="ed-label">Pan speed</span>
            <div className="ed-control">
              <input className="ed-range" type="range" min={10} max={180} step={1} value={Math.min(fx.panSeconds ?? 180, 180)} aria-label="Seconds per sweep" onChange={(e) => set({ panSeconds: Number(e.target.value) })} />
              <span className="ed-range-value">{(() => { const t = Math.min(fx.panSeconds ?? 180, 180); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; })()}</span>
            </div>
          </div>
        ) : null}
        <div className="ed-row">
          <span className="ed-label">Sticky</span>
          <div className="ed-control">
            <Toggle label="Sticky" checked={!!fx.sticky} onChange={(v) => set({ sticky: v })} />
          </div>
        </div>
        <p className="ed-hint">Scroll effects and the slow pan play on the live page and in Preview, not while editing (moving the Parallax slider plays a short preview). They're skipped for visitors who prefer reduced motion.</p>
      </div>
      </InspectorGroup>
    );
  },
};

/** "Split into N": one tap sets the column count at the active breakpoint. */
function SplitBar({ value, onChange }: { value: Responsive<SectionLayout>; onChange: (v: Responsive<SectionLayout>) => void }) {
  const bp = useEditor((s) => s.bp);
  const columns = resolve(value, bp).columns;
  return (
    <div className="ed-row ed-row-stack">
      <span className="ed-label">Split into columns</span>
      <div className="ed-seg ed-seg-fill" role="group" aria-label="Split into columns">
        {[1, 2, 3, 4, 6].map((n) => (
          <button key={n} type="button" aria-pressed={columns === n} onClick={() => onChange(setOnly(value, bp, { columns: n }))}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export const layoutField = (kind: Section["kind"]): CustomField<Responsive<SectionLayout>> => ({
  type: "custom",
  label: "Section layout",
  render: ({ value, onChange }) => (
    <>
      {/* Background first: its picture or video is the section's content. */}
      <InspectorGroup title="Background">
        <ResponsiveEditor value={value} onChange={onChange} rows={SECTION_ROWS} ctx={{ parentKind: kind }} groups={["Background"]} />
      </InspectorGroup>
      <InspectorGroup title="Layout">
        {kind === "grid" ? <SplitBar value={value} onChange={onChange} /> : null}
        <ResponsiveEditor value={value} onChange={onChange} rows={SECTION_ROWS} ctx={{ parentKind: kind }} groups={["Layout"]} />
      </InspectorGroup>
    </>
  ),
});
