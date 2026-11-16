import { createUsePuck } from "@puckeditor/core";

/** Selector-based Puck hook: components re-render only when their slice changes. */
export const usePuck = createUsePuck();
