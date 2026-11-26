/**
 * The demo editor (/demo/): the same editor, served with a <meta name="aoost-demo"> tag. Its API,
 * previews and staging links answer under /demo (outside the paths Cloudflare Access guards), so
 * here every same-site address the editor asks for (/api/…, /preview/…, /staging/…) gets /demo
 * in front. Imported first by main.tsx, before anything can fetch.
 */
export const DEMO = typeof document !== "undefined" && !!document.querySelector('meta[name="aoost-demo"]');

const OURS = /^\/(api|preview|staging)(\/|$|\?)/;
/** An address as the demo needs it (unchanged outside the demo). */
export function demoPath(href: string): string {
  if (!DEMO) return href;
  if (href.startsWith("/")) return OURS.test(href) ? "/demo" + href : href;
  try {
    const u = new URL(href);
    if (u.host === location.host && OURS.test(u.pathname)) {
      u.pathname = "/demo" + u.pathname;
      return u.toString();
    }
  } catch {
    /* not an address */
  }
  return href;
}

if (DEMO) {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") return realFetch(demoPath(input), init);
    if (input instanceof URL) return realFetch(demoPath(input.toString()), init);
    const moved = demoPath(input.url);
    return realFetch(moved === input.url ? input : new Request(moved, input), init);
  };
  // Uploads use XMLHttpRequest (for progress), so they need moving too.
  const realXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    return (realXhrOpen as (...a: unknown[]) => void).call(this, method, demoPath(url.toString()), ...rest);
  } as typeof XMLHttpRequest.prototype.open;
  const RealSocket = window.WebSocket;
  window.WebSocket = class extends RealSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(demoPath(url.toString().replace(/^ws/, "http")).replace(/^http/, "ws"), protocols);
    }
  } as typeof WebSocket;
  if (navigator.sendBeacon) {
    const realBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => realBeacon(demoPath(url.toString()), data);
  }
  const realOpen = window.open.bind(window);
  window.open = (url?: string | URL, ...rest: [string?, string?]) => realOpen(url === undefined ? url : demoPath(url.toString()), ...rest);
  // Frames and links the editor makes (checks, compare, preview links).
  for (const [proto, attr] of [
    [HTMLIFrameElement.prototype, "src"],
    [HTMLAnchorElement.prototype, "href"],
  ] as const) {
    const desc = Object.getOwnPropertyDescriptor(proto, attr)!;
    Object.defineProperty(proto, attr, { ...desc, set(v: string) { desc.set!.call(this, demoPath(String(v))); } });
    const setAttr = Element.prototype.setAttribute;
    (proto as Element).setAttribute = function (name: string, value: string) {
      setAttr.call(this, name, name === attr ? demoPath(value) : value);
    };
  }
}
