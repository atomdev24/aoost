import type { CustomField } from "@puckeditor/core";
import type { FrameFit, Node, Responsive, Section, SectionLayout, Style } from "../../schema";
import { DEFAULT_FRAME_FIT } from "../../schema";
import { ResponsiveEditor } from "../fields/ResponsiveEditor";
import { FRAME_ROWS, SECTION_ROWS, STYLE_ROWS } from "../fields/rows";
import { useEditor } from "../store";
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

function StylePanel({ value, onChange, framed }: { value: Responsive<Style>; onChange: (v: Responsive<Style>) => void; framed: boolean }) {
  const parentKind = useParentKind();
  return <ResponsiveEditor value={value} onChange={onChange} rows={STYLE_ROWS} ctx={{ parentKind, framed }} />;
}

export const styleField = (framed: boolean): CustomField<Responsive<Style>> => ({
  type: "custom",
  label: "Layout and look",
  render: ({ value, onChange }) => <StylePanel value={value} onChange={onChange} framed={framed} />,
});

function FramePanel({ value, onChange }: { value: Responsive<FrameFit> | undefined; onChange: (v: Responsive<FrameFit>) => void }) {
  const bp = useEditor((s) => s.bp);
  const v = value ?? { base: DEFAULT_FRAME_FIT };
  const fit = (bp === "desktop" ? (v.desktop?.fit ?? v.base.fit) : v.base.fit) as FrameFit["fit"];
  return <ResponsiveEditor value={v} onChange={onChange} rows={FRAME_ROWS} ctx={{ fit }} />;
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

export const layoutField = (kind: Section["kind"]): CustomField<Responsive<SectionLayout>> => ({
  type: "custom",
  label: "Section layout",
  render: ({ value, onChange }) => <ResponsiveEditor value={value} onChange={onChange} rows={SECTION_ROWS} ctx={{ parentKind: kind }} />,
});
