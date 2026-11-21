import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startLoadGuard } from "./load-guard";
import { startDisplay } from "./display";
import { guardPinch } from "./pinch-guard";
import "./editor.css";
import "./workspace/workspace.css";

// The service worker gives the home-screen app a fast start (it never caches the API).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" }).catch(() => undefined));
}

startDisplay();
guardPinch(window);
if (import.meta.env.PROD) startLoadGuard();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
