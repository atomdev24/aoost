import type { ReactElement } from "react";
import type { RenderCtx } from "../../components/types";

/**
 * A nav style: markup plus CSS. Only the floating pill ships in v1; register
 * another style in render/nav/index.ts to add one (SPEC §6).
 */
export type NavRenderer = {
  style: string;
  Render: (props: { ctx: RenderCtx }) => ReactElement;
  css: string;
};
