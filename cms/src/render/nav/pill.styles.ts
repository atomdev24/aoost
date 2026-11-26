// Floating pill (SPEC §6, Nav lab style 2). Motion: cubic-bezier(.2,.8,.2,1).
export const css = `
.nav{position:fixed;top:16px;left:0;right:0;z-index:50;display:flex;justify-content:center;pointer-events:none;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.nav.is-hidden{transform:translateY(-140%)}
.pill{pointer-events:auto;display:flex;align-items:center;gap:6px;max-width:calc(100vw - 24px);padding:6px 6px 6px 18px;border-radius:999px;background:#141414;color:#F3EFE6;white-space:nowrap;box-shadow:0 10px 30px rgba(20,20,20,0);transition:box-shadow .3s}
.nav.is-scrolled .pill{box-shadow:0 10px 30px rgba(20,20,20,.28)}
.pill-logo{display:flex;align-items:center;gap:8px;min-height:44px;margin-right:8px;color:inherit;text-decoration:none;font:700 16px var(--font-display);letter-spacing:-.02em}
.pill-logo.mark-only{justify-content:center;min-width:44px;margin-right:0}
/* just the symbol: an even little pill around it */
.pill:has(.pill-logo.mark-only):not(:has(.pill-link,.pill-menu,.pill-icon)){padding:6px 12px}
.pill-links{display:none;align-items:center;gap:2px}
.pill-link,.pill-caret{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 14px;border:0;border-radius:999px;background:transparent;color:inherit;font:500 13px var(--font-body);text-decoration:none;cursor:pointer;transition:transform .15s ease,background-color .2s,color .2s}
.pill-link:active,.pill-caret:active,.pill-menu:active,.pill-cta:active,.pill-icon:active{transform:scale(.95)}
.hv-tint:hover,.pill-caret:hover,.pill-icon:hover{background-color:rgba(243,239,230,.14)}
.hv-underline span:first-of-type{background:linear-gradient(currentColor,currentColor) 0 100%/0 1.5px no-repeat;transition:background-size .3s cubic-bezier(.2,.8,.2,1)}
.hv-underline:hover span:first-of-type{background-size:100% 1.5px}
.nav[data-marker="pill"] .pill-link[aria-current],.nav[data-marker="pill"] .pill-link[data-current]{background:#F3EFE6;color:#141414}
.nav[data-marker="underline"] .pill-link[aria-current] span:first-of-type,.nav[data-marker="underline"] .pill-link[data-current] span:first-of-type{background:linear-gradient(#E2683A,#E2683A) 0 100%/100% 2px no-repeat}
.has-menu{position:relative;display:flex;align-items:center}
.pill-split{padding-right:6px}
.pill-caret{width:32px;padding:0;justify-content:center;margin-left:-4px}
.pill-trigger svg,.pill-caret svg,.sheet-acc svg{transition:transform .3s cubic-bezier(.2,.8,.2,1)}
[aria-expanded="true"]>svg:last-child{transform:rotate(180deg)}
.menu{position:absolute;top:calc(100% + 14px);left:0;min-width:220px;padding:8px;display:flex;flex-direction:column;background:#F3EFE6;color:#141414;border:1.5px solid #141414;border-radius:14px;box-shadow:5px 5px 0 #141414;white-space:normal;opacity:0;transform:translateY(-6px);transition:opacity .2s,transform .3s cubic-bezier(.2,.8,.2,1)}
.menu[hidden]{display:none}
.menu.is-open{opacity:1;transform:none}
.menu::before{content:"";position:absolute;left:0;right:0;top:-16px;height:16px}
.menu-link{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;padding:0 12px;border-radius:8px;color:#141414;text-decoration:none;font:500 15px var(--font-body)}
.menu-link:hover,.menu-link:focus-visible,.menu-link[aria-current]{background:#E7E0D2}
.menu-label{padding:10px 12px 4px;color:#5E584E}
.menu-rule,.sheet-rule{width:100%;border:0;border-top:1.5px solid currentColor;opacity:.25;margin:6px 0}
.menu-social{display:flex;gap:2px;padding:4px}
.mega{position:fixed;left:50%;top:76px;width:min(1100px,calc(100vw - 48px));padding:0;overflow:hidden;transform:translate(-50%,-6px)}
.mega.is-open{transform:translate(-50%,0)}
.nav-badge{padding:2px 7px;border-radius:999px;background:#F3EFE6;color:#141414;font:700 10px var(--font-body);letter-spacing:.06em;text-transform:uppercase}
.pill-link[aria-current] .nav-badge,.menu .nav-badge{background:#141414;color:#F3EFE6}
.pill-cta{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 16px;border-radius:999px;border:1.5px solid #F3EFE6;font:600 13px var(--font-body);text-decoration:none;transition:transform .15s ease,background-color .2s,color .2s}
.pill-cta-filled{background:#F3EFE6;color:#141414}
.pill-cta-filled:hover{background:#E2683A;border-color:#E2683A}
.pill-cta-outline{color:#F3EFE6}
.pill-cta-outline:hover{background:#F3EFE6;color:#141414}
.pill-icon{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border:0;border-radius:999px;background:transparent;color:inherit;cursor:pointer;transition:transform .15s ease,background-color .2s}
.pill-label{padding:0 10px;color:#CFC8BB}
.pill-rule{width:1.5px;height:20px;margin:0 6px;background:#3A3631}
.nav-embed{border:0;height:44px;width:180px;border-radius:999px;background:transparent}
.pill-menu{height:44px;padding:0 18px;border:0;border-radius:999px;background:#F3EFE6;color:#141414;font:600 13px var(--font-body);cursor:pointer;transition:transform .15s ease}
.sheet{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:#141414;color:#F3EFE6;overflow-y:auto;overscroll-behavior:contain}
.sheet[hidden]{display:none}
.sheet-top{display:flex;align-items:center;justify-content:space-between;min-height:68px;padding:0 12px 0 20px;border-bottom:1.5px solid #3A3631}
.sheet-close,.search-close{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border:0;background:transparent;color:inherit;cursor:pointer}
.sheet-links{flex:1;display:flex;flex-direction:column;gap:6px;padding:28px 20px}
.sheet-link{display:inline-flex;align-items:center;gap:12px;align-self:flex-start;min-height:56px;padding:4px 0;border:0;background:transparent;color:#F3EFE6;text-decoration:none;font:500 40px/1.1 var(--font-display);letter-spacing:-.02em;cursor:pointer;transition:color .2s,transform .3s cubic-bezier(.2,.8,.2,1)}
a.sheet-link:hover,button.sheet-link:hover{color:#E2683A;transform:translateX(10px)}
.sheet-link[aria-current]{color:#E2683A}
.sheet-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.sheet-acc{flex:none;display:flex;align-items:center;justify-content:center;width:48px;height:48px;border:1.5px solid #3A3631;border-radius:999px;background:transparent;color:inherit;cursor:pointer}
.sheet-sub{display:flex;flex-direction:column;gap:2px;margin:0 0 10px 4px;padding-left:4px;border-left:1.5px solid #3A3631}
.sheet-sub[hidden]{display:none}
.sheet-sub .menu-link{color:#CFC8BB;font-size:17px;padding:0 14px}
.sheet-sub .menu-link:hover,.sheet-sub .menu-link[aria-current]{background:transparent;color:#F3EFE6}
.sheet-sub .menu-label{color:#A8A39A}
.sheet-mega{border-left:0;margin-left:0;padding-left:0;border-radius:14px;overflow:hidden;background:#F3EFE6;color:#141414}
.sheet-label{padding:14px 0 2px;color:#A8A39A}
.sheet-cta{display:flex;align-items:center;justify-content:center;min-height:52px;margin-top:12px;border-radius:999px;border:1.5px solid #F3EFE6;font:600 15px var(--font-body);text-decoration:none}
.sheet .nav-embed{width:100%;height:auto;min-height:44px;border-radius:12px}
.sheet .nav-badge{font-size:11px}
.sheet-foot{display:flex;gap:12px;padding:20px;border-top:1.5px solid #3A3631}
.sheet-social{flex:1;display:flex;align-items:center;justify-content:center;height:48px;border:1.5px solid #F3EFE6;border-radius:999px;color:#F3EFE6;text-decoration:none;font:600 14px var(--font-body);transition:background-color .2s,color .2s}
.sheet-social:hover{background:#F3EFE6;color:#141414}
.search{position:fixed;inset:0;z-index:70;display:flex;justify-content:center;align-items:flex-start;padding:84px 16px 16px;background:rgba(20,20,20,.6)}
.search[hidden]{display:none}
.search-box{position:relative;width:min(560px,100%);padding:8px;background:#F3EFE6;color:#141414;border:1.5px solid #141414;border-radius:18px;box-shadow:5px 5px 0 #141414}
.search-box input{width:100%;height:52px;padding:0 52px 0 14px;border:0;border-radius:12px;background:transparent;color:inherit;font:500 17px var(--font-body);outline-offset:-2px}
.search-close{position:absolute;right:10px;top:10px}
.search-results{list-style:none;margin:0;padding:0;max-height:min(60vh,420px);overflow-y:auto}
.search-results a{display:flex;flex-direction:column;gap:2px;min-height:44px;justify-content:center;padding:8px 14px;border-radius:10px;color:inherit;text-decoration:none;font:500 15px var(--font-body)}
.search-results a:hover,.search-results a:focus-visible{background:#E7E0D2}
.search-results small{color:#5E584E;font-size:12px}
.search-results li.none{padding:12px 14px;color:#5E584E}
body.is-locked{overflow:hidden}
@media (min-width:900px){.pill-links{display:flex}.pill-menu{display:none}.sheet{display:none}}
@media (prefers-reduced-motion:no-preference){
.sheet.is-open .sheet-links>*,.sheet.is-open .sheet-foot{animation:rise .5s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0) * 60ms)}
@keyframes rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
}
@media (prefers-reduced-motion:reduce){.nav,.menu,.pill-link,.pill-caret,.sheet-link,.pill-trigger svg,.pill-caret svg,.sheet-acc svg{transition:none}.nav.is-hidden{transform:none}}

/* Bar (the Aerobotics nav): a wide white bar, logo left, links in the middle, buttons right, menus with a small line under each link. */
.nav[data-nav="bar"]{--nav-accent:#0075e1;top:20px;padding:0 clamp(12px,6.7vw,144px)}
.nav[data-nav="bar"] .pill{flex:1;max-width:none;justify-content:space-between;gap:16px;min-height:52px;padding:8px 12px 8px 24px;border-radius:70px;background:#fff;color:#000;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.nav[data-nav="bar"].is-scrolled .pill{box-shadow:0 8px 28px rgba(11,27,46,.12)}
.nav[data-nav="bar"] .pill-logo{min-height:36px;margin-right:0}
.nav[data-nav="bar"] .pill-logo-img{display:block;height:22px;width:auto}
.nav[data-nav="bar"] .pill-links{flex:1;justify-content:flex-end;gap:4px}
/* links in the middle, buttons at the right */
.nav[data-nav="bar"] .pill-links>:first-child:not(.pill-cta){margin-left:auto}
.nav[data-nav="bar"] .pill-links>:not(.pill-cta)+.pill-cta{margin-left:auto}
.nav[data-nav="bar"] .pill-link,.nav[data-nav="bar"] .pill-caret{height:36px;padding:0 10px;font:400 16px var(--font-body);color:#000}
.nav[data-nav="bar"] .hv-tint:hover,.nav[data-nav="bar"] .pill-caret:hover{background:transparent;color:var(--nav-accent)}
.nav[data-nav="bar"][data-marker="pill"] .pill-link[aria-current],.nav[data-nav="bar"] .pill-link[data-current]{background:transparent;color:var(--nav-accent)}
.nav[data-nav="bar"] [aria-expanded="true"]{color:var(--nav-accent)}
.nav[data-nav="bar"] .pill-cta{height:36px;padding:0 18px;border:1px solid var(--nav-accent);font:600 14px var(--font-body)}
.nav[data-nav="bar"] .pill-cta-filled{background:var(--nav-accent);color:#fff}
.nav[data-nav="bar"] .pill-cta-filled:hover{background:var(--nav-accent);border-color:var(--nav-accent);filter:brightness(.9)}
.nav[data-nav="bar"] .pill-cta-outline{color:var(--nav-accent)}
.nav[data-nav="bar"] .pill-cta-outline:hover{background:var(--nav-accent);color:#fff}
.nav[data-nav="bar"] .menu{top:calc(100% + 18px);left:50%;translate:-50% 0;display:grid;grid-template-columns:repeat(2,minmax(230px,1fr));gap:4px 20px;padding:16px;background:#fff;color:#000;border:0;border-radius:8px;box-shadow:0 16px 40px rgba(11,27,46,.14)}
.nav[data-nav="bar"] .menu:not(:has(> :nth-child(4))){grid-template-columns:minmax(230px,1fr)}
.nav[data-nav="bar"] .menu-link{min-height:0;padding:8px 10px;border-radius:6px;color:#000;font:600 14px var(--font-body)}
.nav[data-nav="bar"] .menu-link:hover,.nav[data-nav="bar"] .menu-link[aria-current]{background:#f4f8fd;color:var(--nav-accent)}
.menu-text{display:flex;flex-direction:column;gap:2px}
.menu-desc{color:#6b7380;font:400 12px/1.35 var(--font-body)}
.nav[data-nav="bar"] .pill-menu{height:36px;background:var(--nav-accent);color:#fff}
.sheet[data-nav-sheet="bar"]{background:#fff;color:#000}
.sheet[data-nav-sheet="bar"] .sheet-top,.sheet[data-nav-sheet="bar"] .sheet-foot{border-color:#e4e8ee}
.sheet[data-nav-sheet="bar"] .pill-logo-img{display:block;height:22px;width:auto}
.sheet[data-nav-sheet="bar"] .sheet-link{color:#000;font:600 28px/1.15 var(--font-body)}
.sheet[data-nav-sheet="bar"] a.sheet-link:hover,.sheet[data-nav-sheet="bar"] .sheet-link[aria-current]{color:var(--nav-accent,#0075e1)}
.sheet[data-nav-sheet="bar"] .sheet-acc,.sheet[data-nav-sheet="bar"] .sheet-sub{border-color:#e4e8ee}
.sheet[data-nav-sheet="bar"] .sheet-sub .menu-link{color:#000}
.sheet[data-nav-sheet="bar"] .sheet-cta{border-color:#0075e1;color:#0075e1}
.sheet[data-nav-sheet="bar"] .sheet-cta.pill-cta-filled{background:#0075e1;color:#fff}
@media (max-width:899px){.nav[data-nav="bar"]{top:12px;padding:0 12px}}
.pill-lang{display:inline-flex;align-items:center;gap:2px;margin-left:6px;font-size:12px;font-weight:600;letter-spacing:.02em}
.pill-lang>*{padding:4px 6px;border-radius:999px;color:inherit;text-decoration:none;opacity:.6}
.pill-lang>[aria-current]{opacity:1;background:rgba(127,127,127,.18)}
.pill-lang>a:hover{opacity:1}
`;
