import type { Theme } from "../schema";

/** Starting design tokens (SPEC §9). */
export const seedTheme: Theme = {
  colors: {
    bone: "#F3EFE6",
    sand: "#E7E0D2",
    ink: "#141414",
    text: "#3D3830",
    muted: "#5E584E",
    rust: "#B5421A",
    rustOnDark: "#E2683A",
    line: "#141414",
  },
  fonts: {
    display: "'Facile Sans', 'Space Grotesk', Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  fontFaces: [],
  googleFonts: ["Inter:wght@400;500;600", "Space Grotesk:wght@500;700"],
  typeStyles: {
    hero: { name: "Hero", font: "display", size: { base: 44, desktop: 88 }, weight: 700, lineHeight: 1.02, tracking: -0.03 },
    h1: { name: "Heading 1", font: "display", size: { base: 36, desktop: 64 }, weight: 700, lineHeight: 1.05, tracking: -0.03 },
    h2: { name: "Heading 2", font: "display", size: { base: 26, desktop: 34 }, weight: 700, lineHeight: 1.1, tracking: -0.02 },
    h3: { name: "Heading 3", font: "display", size: { base: 19, desktop: 22 }, weight: 500, lineHeight: 1.2, tracking: -0.01 },
    body: { name: "Body", font: "body", size: { base: 15, desktop: 16 }, weight: 400, lineHeight: 1.55, tracking: 0 },
    small: { name: "Small", font: "body", size: { base: 13 }, weight: 400, lineHeight: 1.5, tracking: 0 },
    label: { name: "Label", font: "body", size: { base: 12 }, weight: 600, lineHeight: 1.3, tracking: 0.12, uppercase: true },
  },
  radii: { none: 0, sm: 6, md: 12, lg: 18, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 28, xl: 48, xxl: 96 },
};
