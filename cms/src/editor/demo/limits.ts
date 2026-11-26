/** What the demo editor (/demo/) can't do, and why, in one place: the strip, its card and the lock marks read it. */
export type DemoLimit = "uploads" | "publish" | "history" | "claude" | "code" | "shared";

export const DEMO_LIMITS: Record<DemoLimit, { title: string; why: string }> = {
  uploads: { title: "Uploads", why: "Uploads need the real editor. Use a sample picture instead." },
  publish: { title: "Publishing", why: "Publish and Push to production only pretend: nothing reaches a real site." },
  history: { title: "Version history", why: "Past versions come from the real site, so they're off here." },
  claude: { title: "Claude", why: "Claude connects to the real editor only." },
  code: { title: "Code on the page", why: "Code blocks run sandboxed only, so nothing can reach the page." },
  shared: { title: "Shared and temporary", why: "Anyone with the link edits this same demo, and it goes back to the sample site from time to time." },
};

/** The strip's one line, with how often this demo goes back to its sample site. */
export const demoStrip = (reset: string) =>
  `Demo · uploads, history and Claude are off · ${reset === "never" ? "kept until reset" : reset === "weekly" ? "resets Mondays at 03:00" : "resets at 03:00"}`;
