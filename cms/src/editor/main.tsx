import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./editor.css";
import "./workspace/workspace.css";

// The service worker gives the home-screen app a fast start (it never caches the API).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" }).catch(() => undefined));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
