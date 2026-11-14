import type { ComponentConfig, Config, PuckContext } from "@puckeditor/core";
import { contentFields } from "../../components/fields";
import { components } from "../../components/registry";
import type { ComponentDef } from "../../components/types";
import { DEFAULT_FRAME_FIT } from "../../schema";
import { EditorNode } from "./EditorNode";
import { effectsField, frameField, styleField } from "./fields";
import { Root } from "./Root";
import { sectionComponents } from "./sections";

function nodeConfig(def: ComponentDef): ComponentConfig {
  return {
    label: def.label,
    inline: true,
    fields: {
      ...contentFields[def.type],
      ...(def.framed ? { frame: frameField } : {}),
      style: styleField(!!def.framed),
      effects: effectsField,
      name: { type: "text", label: "Layer name" },
    },
    defaultProps: {
      ...(def.defaults.content as object),
      style: { base: def.defaults.style ?? {} },
      ...(def.framed ? { frame: { base: DEFAULT_FRAME_FIT } } : {}),
    },
    // Canvas layers are positioned freely, so Puck's list reordering is off there.
    resolvePermissions: (data, { parent }) => ({
      ...(parent?.type === "CanvasSection" ? { drag: false } : {}),
      ...(data.props?.locked ? { drag: false, delete: false, duplicate: false } : {}),
    }),
    render: (props) => <EditorNode type={def.type} {...(props as { id: string; puck: PuckContext })} />,
  };
}

const byCategory = (category: string) => components.filter((c) => c.category === category).map((c) => c.type);

/** The Puck config: three section kinds plus every registered component. */
export const puckConfig: Config = {
  root: { render: Root, fields: {} },
  categories: {
    sections: { title: "Sections", components: ["FlowSection", "GridSection", "CanvasSection"], defaultExpanded: true },
    basic: { title: "Basics", components: byCategory("basic") },
    media: { title: "Media", components: byCategory("media") },
    embed: { title: "Embeds and code", components: byCategory("embed") },
    site: { title: "Site", components: byCategory("site") },
  },
  components: {
    ...sectionComponents,
    ...Object.fromEntries(components.map((c) => [c.type, nodeConfig(c)])),
  },
};
