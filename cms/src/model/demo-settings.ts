/**
 * The demo editor's settings, kept with the real draft and changed from the real editor:
 * whether /demo/ is open, and how often it goes back to its sample site.
 */
export type DemoReset = "nightly" | "weekly" | "never";
export type DemoSettings = { enabled: boolean; reset: DemoReset };
export const DEMO_DEFAULTS: DemoSettings = { enabled: true, reset: "nightly" };
export const DEMO_SETTINGS_KEY = "demo:settings";

export function cleanDemoSettings(v: unknown): DemoSettings {
  const o = (v && typeof v === "object" ? v : {}) as Partial<DemoSettings>;
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : DEMO_DEFAULTS.enabled,
    reset: o.reset === "weekly" || o.reset === "never" || o.reset === "nightly" ? o.reset : DEMO_DEFAULTS.reset,
  };
}

/** Whether the nightly run (03:00 in Cape Town) should reset the demo: every night, Mondays only, or never. */
export function resetsTonight(s: DemoSettings, now: Date): boolean {
  if (s.reset === "never") return false;
  if (s.reset === "weekly") return new Date(now.getTime() + 2 * 3600_000).getUTCDay() === 1;
  return true;
}
