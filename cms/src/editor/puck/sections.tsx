import type { ComponentConfig, PuckContext, SlotComponent } from "@puckeditor/core";
import type { Responsive, Section, SectionLayout } from "../../schema";
import { SectionBackground } from "../../render/SectionView";
import { newId } from "../../schema/ids";
import { itemToSection, SECTION_TYPES, type PuckItem } from "./adapter";
import { layoutField } from "./fields";

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
      name: { type: "text", label: "Section name" },
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
      items: { type: "slot", disallow: Object.values(SECTION_TYPES) },
    },
    defaultProps: { layout: DEFAULT_LAYOUT[kind], items: [] },
    resolvePermissions: (data) => (data.props?.locked ? { drag: false, delete: false, duplicate: false } : {}),
    render: (props) => {
      const { id, items: Items, puck } = props as unknown as SectionProps;
      const section = itemToSection({ type: SECTION_TYPES[kind], props: { ...(props as object), id, items: [] } } as PuckItem);
      return (
        <section ref={puck.dragRef} id={id} className={`s s-${id}`} data-kind={kind} data-section-id={id}>
          <SectionBackground section={section} />
          <Items className="si" minEmptyHeight={kind === "canvas" ? 0 : 120} />
        </section>
      );
    },
  };
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
