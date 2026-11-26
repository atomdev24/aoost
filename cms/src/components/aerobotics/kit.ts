import type { ComponentKit } from "../types";

/**
 * The Aerobotics kit: what every Aerobotics block shares, matching aerobotics.com (Nunito Sans,
 * Aerobotics blue #0075E1, navy #17293E, soft blue bands, pill buttons, rounded photos).
 * Each block paints its own full-width band (`.ab`) with an inner column (`.ab-in`).
 */
const css = `
.ab{--ab-blue:#0075E1;--ab-navy:#17293E;--ab-ink:#0A0A0A;--ab-text:#1F2A37;--ab-muted:#5A6573;--ab-pale:#E8F0FB;--ab-soft:#F4F8FD;--ab-chip:#D9E9FA;--ab-line:#DCE3EC;
  position:relative;width:100%;font-family:"Nunito Sans",ui-sans-serif,system-ui,sans-serif;color:var(--ab-ink);-webkit-font-smoothing:antialiased}
.ab *,.ab *::before,.ab *::after{box-sizing:border-box}
.ab :where(h1,h2,h3,h4,p,ul,ol,figure,blockquote){margin:0}
/* A band reaches the window's edges even when it sits in a padded section. */
.ab-full{margin-inline:calc(50% - 50vw)}
html:has(.ab-full),body:has(.ab-full){overflow-x:clip}
.ab-in{width:100%;max-width:1100px;margin:0 auto;padding:0 20px}
@media (min-width:1180px){.ab-in{padding:0}}
.ab-sec{padding:64px 0}
@media (min-width:810px){.ab-sec{padding:104px 0}}
.ab-bg-white{background:#fff}.ab-bg-soft{background:var(--ab-soft)}.ab-bg-pale{background:var(--ab-pale)}
.ab-bg-navy{background:var(--ab-navy);color:#fff}
.ab-bg-navy .ab-text,.ab-bg-navy .ab-lede{color:rgba(255,255,255,.82)}
.ab-h1{font-size:34px;line-height:1.1;font-weight:600;letter-spacing:-.01em}
.ab-h2{font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-.005em}
.ab-h3{font-size:22px;line-height:1.2;font-weight:600}
@media (min-width:810px){.ab-h1{font-size:50px}.ab-h2{font-size:40px}.ab-h3{font-size:29px}}
.ab-eyebrow{font-size:16px;line-height:1.4;font-weight:300}
.ab-kicker{font-size:13px;line-height:1.3;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ab-blue)}
.ab-text{font-size:16px;line-height:1.4;font-weight:400;color:var(--ab-text)}
.ab-lede{font-size:17px;line-height:1.45;color:var(--ab-text)}
.ab-center{text-align:center}
.ab-btns{display:flex;flex-wrap:wrap;gap:12px}
.ab-center .ab-btns{justify-content:center}
.ab-btn{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 24px;border-radius:70px;border:1px solid transparent;font:600 14px/1 "Nunito Sans",ui-sans-serif,system-ui,sans-serif;text-decoration:none;white-space:nowrap;cursor:pointer;transition:filter .15s,background-color .15s,color .15s}
.ab-btn-blue{background:var(--ab-blue);color:#fff}
.ab-btn-white{background:#fff;color:var(--ab-blue)}
.ab-btn-outline{border-color:var(--ab-blue);color:var(--ab-blue);background:transparent}
.ab-bg-navy .ab-btn-outline,.ab-on-dark .ab-btn-outline{border-color:#fff;color:#fff}
.ab-btn:hover{filter:brightness(1.08)}
.ab-btn-outline:hover{background:var(--ab-blue);color:#fff;filter:none}
.ab-img{display:block;width:100%;height:100%;object-fit:cover}
.ab-empty{display:flex;align-items:center;justify-content:center;background:#e4eaf2;color:#5a6573;font:600 13px "Nunito Sans",system-ui,sans-serif}
.ab-tag{display:inline-flex;flex-direction:column;gap:2px;padding:8px 14px;border:1px solid rgba(255,255,255,.75);border-radius:10px;background:rgba(15,25,20,.38);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#fff;text-align:left}
.ab-tag small{font-size:11px;line-height:1.2;opacity:.85}
.ab-tag b{display:flex;align-items:center;gap:6px;font-size:16px;line-height:1.2;font-weight:600}
.ab-tag i{display:inline-block;width:11px;height:11px;border-radius:2px;border:1px solid rgba(255,255,255,.7)}
`;

export const aeroboticsKit: ComponentKit = {
  id: "aerobotics",
  css,
  googleFonts: ["Nunito Sans:wght@300;400;600;700"],
};
