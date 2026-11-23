import type { ComponentConfig, PuckContext, SlotComponent } from "@puckeditor/core";
import type { Responsive, Section, SectionLayout } from "../../schema";
import { SectionBackground } from "../../render/SectionView";
import { resolve } from "../../responsive/resolve";
import { newId } from "../../schema/ids";
import { currentPage, useEditor } from "../store";
import { EditorOverlay } from "./EditorOverlay";
import { itemToSection, SECTION_TYPES, type PuckItem } from "./adapter";
import { layoutField, visibleOnField } from "./fields";

type SectionProps = { id: string; name?: string; locked?: boolean; layout: Responsive<SectionLayout>; customDesktop?: boolean; items: SlotComponent; puck: PuckContext };

const DEFAULT_LAYOUT: Record<Section["kind"], Responsive<SectionLayout>> = {
  flow: { base: { columns: 1, gap: 18, padding: "56px 20px", maxWidth: 1160 }, desktop: { padding: "96px 56px" } },
  grid: { base: { columns: 1, gap: 14, padding: "56px 20px", maxWidth: 1160 }, desktop: { columns: 3, padding: "96px 56px" } },
  canvas: { base: { columns: 1, gap: 0, padding: "0px", height: 480 } },
};

const LABEL: Record<Section["kind"], string> = { flow: "Flow section", grid: "Grid section", canvas: "Free canvas section" };

function sectionConfig(kind: Section["kind"]): ComponentConfig {
  return {
    label: LABEL[kind],
    inline: true,
    fields: {
      layout: layoutField(kind),
      ...(kind === "canvas"
        ? {
            customDesktop: {
              type: "radio",
              label: "Desktop layout",
              options: [
                { label: "Scaled from mobile", value: false },
                { label: "Fully custom", value: true },
              ],
            },
          }
        : {}),
      __visible: visibleOnField,
      name: { type: "text", label: "Name" },
      items: { type: "slot", disallow: Object.values(SECTION_TYPES) },
    },
    defaultProps: { layout: DEFAULT_LAYOUT[kind], items: [] },
    resolvePermissions: (data) => (data.props?.locked ? { drag: false, delete: false, duplicate: false } : {}),
    render: (props) => <EditorSection kind={kind} {...(props as unknown as SectionProps)} />,
  };
}

function EditorSection({ kind, ...props }: SectionProps & { kind: Section["kind"] }) {
  const { id, items: Items, puck } = props;
  const bp = useEditor((s) => s.bp);
  const overlays = useEditor((s) => currentPage(s).overlays);
  const flash = useEditor((s) => s.highlight.includes(id));
  const section = itemToSection({ type: SECTION_TYPES[kind], props: { ...props, items: [] } } as unknown as PuckItem);
  const layout = resolve(section.layout, bp);
  // Column guides for grid sections: the drop zones Alex splits the section into.
  const guides =
    kind === "grid"
      ? ({ "--ed-gap": `${layout.gap}px`, "--ed-col": `calc((100% - ${(layout.columns - 1) * layout.gap}px) / ${layout.columns})` } as React.CSSProperties)
      : undefined;
  return (
    <section ref={puck.dragRef} id={id} className={`s s-${id}${flash ? " ed-flash" : ""}`} data-kind={kind} data-section-id={id}>
      <SectionBackground section={section} />
      <Items className="si" style={guides} minEmptyHeight={kind === "canvas" ? 0 : 120} />
      {overlays
        .filter((o) => o.anchor !== "viewport" && o.anchor.sectionId === id)
        .map((o) => (
          <EditorOverlay key={o.id} overlay={o} />
        ))}
      {props.locked ? null : <span className="ed-sh" data-ed-section-handle="" title="Drag to change the height" aria-hidden="true" />}
    </section>
  );
}

export const sectionComponents = {
  FlowSection: sectionConfig("flow"),
  GridSection: sectionConfig("grid"),
  CanvasSection: sectionConfig("canvas"),
};

/** A fresh, empty section item for "Add section". */
export function newSectionItem(kind: Section["kind"]): PuckItem {
  return { type: SECTION_TYPES[kind], props: { id: newId("s"), layout: DEFAULT_LAYOUT[kind], items: [] } };
}
