import type { ComponentKit } from "../types";
import { kitAfterCss } from "./kit.after.styles";
import { kitBaseCss } from "./kit.base.styles";

/**
 * The aoost kit: Alex's original one-page homepage, ported section by section.
 *
 * Each Aoost* block renders the original markup with its content coming from fields. The original
 * stylesheet is lifted as-is and scoped under `.ao` (scripts/port-aoost-css.py), and the original
 * scripts live in ./runtime, bundled as /assets/aoost.js and loaded only on pages that use a block.
 */

/** Hand-written glue between the CMS page shell and the original page's assumptions. */
const bridgeCss = `
html:has(.ao.wrap){scroll-behavior:auto;scroll-padding-top:0;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
main.ao.wrap{overflow:visible}
.ao [hidden]{display:none!important}
.ao svg,.ao video,.ao iframe,.ao canvas{max-width:none}
.ao .ao-b{position:relative}
.ao .ao-b>script{display:none}
.ao.ao-overlays{position:static;font-family:var(--body)}
.ao .ao-b[data-mat="dark"]{--ink:#EDEDE8;--ink-2:#9A9C98;--rule:#3A3D40;--white:#232527;--paper:#18191A;--paper-2:#202224;color:#EDEDE8}
`;

/**
 * A block shown on its own (the editor canvas has no band wrappers) paints its own cutting mat,
 * so every block still sits on the right background while editing.
 */
const soloCss = `
.ao .ao-b[data-mat="light"],.ao .ao-b[data-mat="dark"]{margin-inline:calc(50% - 50vw);padding:var(--s7) calc(50vw - 50%)}
.ao .ao-b[data-mat="light"]{background:#ECEDE7 linear-gradient(#D9DAD3 1px,transparent 1px) 0 0/20px 20px,#ECEDE7;background-image:linear-gradient(#D9DAD3 1px,transparent 1px),linear-gradient(90deg,#D9DAD3 1px,transparent 1px);background-size:20px 20px;background-color:#ECEDE7}
.ao .ao-b[data-mat="dark"]{background-image:linear-gradient(#26282A 1px,transparent 1px),linear-gradient(90deg,#26282A 1px,transparent 1px);background-size:20px 20px;background-color:#18191A}
.ao .mat .ao-b[data-mat]{margin:0;padding:0;background:none}
`;

export const aoostKit: ComponentKit = {
  id: "aoost",
  css: kitBaseCss + bridgeCss + soloCss,
  cssAfter: kitAfterCss,
  // The fonts the original page loads.
  googleFonts: ["Inter:wght@500;600", "Lexend:wght@300;400;500", "JetBrains Mono:wght@400;500", "Manrope:wght@400;500", "IBM Plex Mono:wght@400"],
  script: "/assets/aoost.js",
  mainClass: "ao wrap",
};

export type Mat = "none" | "light" | "dark";
/** Blocks on the same cutting mat that follow each other share one continuous mat on the site. */
export const matBand = (content: { mat?: Mat }) => (content.mat === "light" ? "mat mat-light" : content.mat === "dark" ? "mat mat-dark" : undefined);
