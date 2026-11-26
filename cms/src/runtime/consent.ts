/**
 * The cookie notice for visitor insights (Microsoft Clarity). Shown once, small, bottom left; the
 * answer is kept on this device and passed to Clarity's consent API. Only on pages that carry the
 * Clarity tag with the notice switched on (render/document.tsx).
 */
const KEY = "aoost.consent";

type ClarityFn = (cmd: string, arg: Record<string, string>) => void;

function tell(choice: "yes" | "no") {
  const c = (window as unknown as { clarity?: ClarityFn }).clarity;
  c?.("consentv2", { ad_Storage: "denied", analytics_Storage: choice === "yes" ? "granted" : "denied" });
}

const CSS = `.ck{position:fixed;left:12px;bottom:12px;z-index:1000;max-width:min(340px,calc(100vw - 24px));display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;border-radius:12px;background:var(--c-ink,#161618);color:var(--c-bone,#f3efe6);font:13px/1.4 var(--font-body,system-ui);box-shadow:0 8px 24px rgba(0,0,0,.18);transition:opacity .2s,transform .2s}
.ck p{margin:0;flex:1 1 180px}.ck-b{display:flex;gap:4px;margin-left:auto}.ck button{font:inherit;border:0;border-radius:999px;padding:6px 12px;cursor:pointer}
.ck .ck-yes{background:var(--c-bone,#f3efe6);color:var(--c-ink,#161618)}.ck .ck-no{background:transparent;color:inherit;text-decoration:underline;text-underline-offset:3px}
.ck.ck-out{opacity:0;transform:translateY(8px)}@media (prefers-reduced-motion:reduce){.ck{transition:none}}`;

export function initConsent() {
  const tag = document.getElementById("clarity-tag");
  if (!tag || !tag.hasAttribute("data-notice")) return;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    return;
  }
  if (stored) return;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  const box = document.createElement("div");
  box.className = "ck";
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", "Cookies");
  box.innerHTML = `<p>This site counts visits with Microsoft Clarity to see how pages are used.</p><span class="ck-b"><button type="button" class="ck-no">No thanks</button><button type="button" class="ck-yes">OK</button></span>`;
  const answer = (choice: "yes" | "no") => {
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      /* private mode: ask again next time */
    }
    tell(choice);
    box.classList.add("ck-out");
    setTimeout(() => box.remove(), 250);
  };
  box.querySelector(".ck-yes")!.addEventListener("click", () => answer("yes"));
  box.querySelector(".ck-no")!.addEventListener("click", () => answer("no"));
  document.body.appendChild(box);
}
