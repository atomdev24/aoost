// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { DOCK_ORDER, InDock } from "./Dock";

describe("Dock", () => {
  it("gives every note its own place in each dock", () => {
    for (const slot of Object.values(DOCK_ORDER)) {
      const orders = Object.values(slot);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });
  it("stacks notes in one column instead of each picking a spot", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() =>
      root.render(
        <>
          <InDock slot="bottom" name="toast">
            <div className="ed-toast">Duplicated</div>
          </InDock>
          <InDock slot="bottom" name="variant">
            <div className="ed-variant-band">Variant 1</div>
          </InDock>
          <InDock slot="top" name="demo">
            <div className="ed-demo-strip">Demo</div>
          </InDock>
        </>,
      ),
    );
    const bottom = document.getElementById("ed-dock-bottom")!;
    expect(bottom.querySelectorAll(".ed-dock-item")).toHaveLength(2);
    expect((bottom.querySelector(".ed-dock-variant") as HTMLElement).style.order).toBe("1");
    expect((bottom.querySelector(".ed-dock-toast") as HTMLElement).style.order).toBe(String(DOCK_ORDER.bottom.toast));
    expect(document.getElementById("ed-dock-top")!.textContent).toBe("Demo");
    act(() => root.unmount());
  });
});
