import type { CustomField } from "@puckeditor/core";
import { resolve, setAt } from "../../responsive/resolve";
import type { FrameFit, Node, Responsive, Section, SectionLayout, Style } from "../../schema";
import { DEFAULT_FRAME_FIT } from "../../schema";
import { FocalPicker } from "../fields/FocalPicker";
import { ResponsiveEditor } from "../fields/ResponsiveEditor";
import { FRAME_ROWS, SECTION_ROWS, STYLE_ROWS } from "../fields/rows";
import { useEditor } from "../store";
import { alignSelection, distributeSelection } from "../canvas/actions";
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

function StylePanel({ value, onChange, framed }: { value: Responsive<Style>; onChange: (v: Responsive<Style>) => void; framed: boolean }) {
  const parentKind = useParentKind();
  return (
    <>
      {parentKind === "canvas" ? <AlignBar /> : null}
      <ResponsiveEditor value={value} onChange={onChange} rows={STYLE_ROWS} ctx={{ parentKind, framed }} />
    </>
  );
}

export const styleField = (framed: boolean): CustomField<Responsive<Style>> => ({
  type: "custom",
  label: "Layout and look",
  render: ({ value, onChange }) => <StylePanel value={value} onChange={onChange} framed={framed} />,
});

/**
 * InDesign-style frame vs content: the frame's size, ratio, corners, border
 * and shadow live in "Layout and look"; this panel fits the content inside it.
 */
function FramePanel({ value, onChange }: { value: Responsive<FrameFit> | undefined; onChange: (v: Responsive<FrameFit>) => void }) {
  const bp = useEditor((s) => s.bp);
  // The picture to aim at: the image itself, or a video's poster frame.
  const src = usePuck((s) => (s.selectedItem?.props.src as string) || (s.selectedItem?.props.poster as string) || "");
  const v = value ?? { base: DEFAULT_FRAME_FIT };
  const now = resolve(v, bp);
  const preview = src && /\.(jpe?g|png|webp|avif|gif|svg)(\?|$)/i.test(src) ? src : "";
  return (
    <>
      <div className="ed-seg ed-seg-fill" role="group" aria-label="Content fit">
        {(["fill", "fit", "free"] as const).map((fit) => (
          <button key={fit} type="button" aria-pressed={now.fit === fit} title={fit === "free" ? "Pan and zoom the content freely" : undefined} onClick={() => onChange(setAt(v, bp, { fit }))}>
            {fit === "fill" ? "Fill" : fit === "fit" ? "Fit" : "Free"}
          </button>
        ))}
      </div>
      {preview ? <FocalPicker src={preview} x={now.focalX} y={now.focalY} onChange={(focalX, focalY) => onChange(setAt(v, bp, { focalX, focalY }))} /> : null}
      {now.fit === "free" ? (
        <div className="ed-row">
          <span className="ed-label">Zoom</span>
          <div className="ed-control">
            <input className="ed-range" type="range" min={0.5} max={4} step={0.05} value={now.zoom} aria-label="Zoom" onChange={(e) => onChange(setAt(v, bp, { zoom: Number(e.target.value) }))} />
          </div>
        </div>
      ) : null}
      <ResponsiveEditor value={v} onChange={onChange} rows={FRAME_ROWS.filter((r) => r.key !== "fit")} ctx={{ fit: now.fit }} />
    </>
  );
}

export const frameField: CustomField<Responsive<FrameFit>> = {
  type: "custom",
  label: "Content in frame",
  render: ({ value, onChange }) => <FramePanel value={value} onChange={onChange} />,
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
      <div className="ed-responsive">
        <h5 className="ed-subhead">Scroll effects</h5>
        <div className="ed-row">
          <span className="ed-label">On enter</span>
          <div className="ed-control">
            <Select ariaLabel="Enter effect" value={fx.enter ?? "none"} options={ENTER} onChange={(v) => set({ enter: (v || "none") as "fade" })} />
          </div>
        </div>
        <div className="ed-row">
          <span className="ed-label">Parallax</span>
          <div className="ed-control">
            <input className="ed-range" type="range" min={-0.5} max={0.5} step={0.05} value={fx.parallax ?? 0} aria-label="Parallax amount" onChange={(e) => set({ parallax: Number(e.target.value) })} />
          </div>
        </div>
        <div className="ed-row">
          <span className="ed-label">Sticky</span>
          <div className="ed-control">
            <Toggle label="Sticky" checked={!!fx.sticky} onChange={(v) => set({ sticky: v })} />
          </div>
        </div>
        <p className="ed-hint">Effects are skipped for visitors who prefer reduced motion.</p>
      </div>
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
          <button key={n} type="button" aria-pressed={columns === n} onClick={() => onChange(setAt(value, bp, { columns: n }))}>
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
      {kind === "grid" ? <SplitBar value={value} onChange={onChange} /> : null}
      <ResponsiveEditor value={value} onChange={onChange} rows={SECTION_ROWS} ctx={{ parentKind: kind }} />
    </>
  ),
});
