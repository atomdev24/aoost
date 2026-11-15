import { describe, expect, it } from "vitest";
import { renderNode } from "../test-utils";

describe("Lottie", () => {
  it("renders a labelled placeholder the runtime fills in", () => {
    const html = renderNode("Lottie", { src: "/media/2026/spin.json", loop: true, autoplay: false, alt: "Spinning sun" });
    expect(html).toBe('<div class="lottie" data-lottie="/media/2026/spin.json" data-loop="" role="img" aria-label="Spinning sun"></div>');
  });
});
