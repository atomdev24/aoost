import { DEMO } from "./demo";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startLoadGuard } from "./load-guard";
import { isChromium, startDisplay } from "./display";
import { guardPinch } from "./pinch-guard";
import { startTooltips } from "./ui/tooltip";
import "./editor.css";
import "./workspace/workspace.css";

// Opening timings (scripts/probes/open.mjs reads them): every module of the first layer has run.
performance.mark("aoost:modules");

// The service worker gives the home-screen app a fast start (it never caches the API).
if (import.meta.env.PROD && !DEMO && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" }).catch(() => undefined));
}

startDisplay();
startTooltips(document);
// Liquid glass only works in Chromium, so only Chromium downloads it (ui/liquid.ts).
if (isChromium()) void import("./ui/liquid").then((m) => m.startLiquid(document)).catch(() => undefined);
guardPinch(window);
if (import.meta.env.PROD) startLoadGuard();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
