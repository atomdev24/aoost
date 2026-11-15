import type { Fields } from "@puckeditor/core";
import { collectionField } from "../../editor/fields/custom";
import type { GlobalContent } from "./Global";

export const fields: Fields<GlobalContent> = {
  globalId: collectionField("Global component (edit it in the Library tab)", (site) => site.globals.map((g) => ({ value: g.id, label: g.name }))),
};
