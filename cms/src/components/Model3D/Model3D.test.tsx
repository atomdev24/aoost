import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

describe("Model3D", () => {
  it("renders a lazy <model-viewer> with alt text", () => {
    const html = renderNode("Model3D", { src: "/media/2026/ring.glb", alt: "Hear no evil ring", autoRotate: true, controls: false });
    expect(html).toContain('<model-viewer class="m3d" src="/media/2026/ring.glb" alt="Hear no evil ring" loading="lazy"');
    expect(html).toContain('auto-rotate=""');
    expect(html).not.toContain("camera-controls");
  });
});
