// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_DELAY, nextDelay, startTooltips, WARM_WINDOW } from "./tooltip";

describe("nextDelay", () => {
  it("waits 500ms on first appearance", () => {
    expect(nextDelay(1000, null, false)).toBe(FIRST_DELAY);
  });

  it("shows immediately if a tooltip is already visible", () => {
    expect(nextDelay(1000, null, true)).toBe(0);
    expect(nextDelay(5000, 1000, true)).toBe(0);
  });

  it("shows immediately within 300ms after the last tooltip hid", () => {
    expect(nextDelay(1200, 1000, false)).toBe(0);
    expect(nextDelay(1000 + WARM_WINDOW, 1000, false)).toBe(0);
  });

  it("waits 500ms again once more than 300ms have elapsed", () => {
    expect(nextDelay(1000 + WARM_WINDOW + 1, 1000, false)).toBe(FIRST_DELAY);
  });
});

function pointerEvent(type: string, props: { pointerType?: string; relatedTarget?: EventTarget | null } = {}) {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    pointerType?: string;
    relatedTarget?: EventTarget | null;
  };
  ev.pointerType = props.pointerType ?? "mouse";
  ev.relatedTarget = props.relatedTarget ?? null;
  return ev;
}

describe("startTooltips", () => {
  let stop: (() => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    stop?.();
    stop = null;
    vi.useRealTimers();
  });

  it("waits 500ms, swaps title to data-ed-tip, animates first appearance, and restores title on hide", () => {
    const btn = document.createElement("button");
    btn.title = "Undo (⌘Z)";
    btn.getBoundingClientRect = () => ({ left: 40, top: 20, right: 80, bottom: 50, width: 40, height: 30, x: 40, y: 20, toJSON: () => ({}) });
    document.body.appendChild(btn);

    stop = startTooltips(document);
    btn.dispatchEvent(pointerEvent("pointerover"));

    expect(btn.getAttribute("title")).toBeNull();
    expect(btn.getAttribute("data-ed-tip")).toBe("Undo (⌘Z)");
    expect(document.querySelector(".ed-tooltip")).toBeNull();

    vi.advanceTimersByTime(499);
    expect(document.querySelector(".ed-tooltip")).toBeNull();

    vi.advanceTimersByTime(1);
    const tip = document.querySelector<HTMLDivElement>(".ed-tooltip");
    expect(tip?.hidden).toBe(false);
    expect(tip?.textContent).toBe("Undo (⌘Z)");
    expect(tip?.classList.contains("is-anim")).toBe(true);

    btn.dispatchEvent(pointerEvent("pointerout"));
    expect(tip?.hidden).toBe(true);
    expect(btn.getAttribute("title")).toBe("Undo (⌘Z)");
    expect(btn.getAttribute("data-ed-tip")).toBeNull();
  });

  it("shows the next tooltip instantly with no animation within 300ms", () => {
    const a = document.createElement("button");
    a.title = "Undo";
    const b = document.createElement("button");
    b.title = "Redo";
    document.body.append(a, b);

    stop = startTooltips(document);
    a.dispatchEvent(pointerEvent("pointerover"));
    vi.advanceTimersByTime(FIRST_DELAY);
    a.dispatchEvent(pointerEvent("pointerout"));

    vi.advanceTimersByTime(150);
    b.dispatchEvent(pointerEvent("pointerover"));

    const tip = document.querySelector<HTMLDivElement>(".ed-tooltip");
    expect(tip?.hidden).toBe(false);
    expect(tip?.textContent).toBe("Redo");
    expect(tip?.classList.contains("is-anim")).toBe(false);
  });

  it("ignores touch pointers, rail buttons, and data-no-tip elements", () => {
    const touchBtn = document.createElement("button");
    touchBtn.title = "Touch";
    const railBtn = document.createElement("button");
    railBtn.className = "ed-rail-btn";
    railBtn.title = "Pages";
    const noTip = document.createElement("button");
    noTip.setAttribute("data-no-tip", "");
    noTip.title = "Custom";
    document.body.append(touchBtn, railBtn, noTip);

    stop = startTooltips(document);

    touchBtn.dispatchEvent(pointerEvent("pointerover", { pointerType: "touch" }));
    vi.advanceTimersByTime(FIRST_DELAY);
    expect(document.querySelector(".ed-tooltip")).toBeNull();
    expect(touchBtn.getAttribute("title")).toBe("Touch");

    railBtn.dispatchEvent(pointerEvent("pointerover"));
    vi.advanceTimersByTime(FIRST_DELAY);
    expect(document.querySelector(".ed-tooltip")).toBeNull();
    expect(railBtn.getAttribute("title")).toBe("Pages");

    noTip.dispatchEvent(pointerEvent("pointerover"));
    vi.advanceTimersByTime(FIRST_DELAY);
    expect(document.querySelector(".ed-tooltip")).toBeNull();
    expect(noTip.getAttribute("title")).toBe("Custom");
  });

  it("hides on Escape, pointerdown, and scroll", () => {
    const btn = document.createElement("button");
    btn.title = "Preview";
    document.body.appendChild(btn);

    stop = startTooltips(document);
    const tip = () => document.querySelector<HTMLDivElement>(".ed-tooltip");

    btn.dispatchEvent(pointerEvent("pointerover"));
    vi.advanceTimersByTime(FIRST_DELAY);
    expect(tip()?.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(tip()?.hidden).toBe(true);
    expect(btn.getAttribute("title")).toBe("Preview");

    vi.advanceTimersByTime(WARM_WINDOW + 1);
    btn.dispatchEvent(pointerEvent("pointerover"));
    vi.advanceTimersByTime(FIRST_DELAY);
    expect(tip()?.hidden).toBe(false);

    btn.dispatchEvent(pointerEvent("pointerdown"));
    expect(tip()?.hidden).toBe(true);

    vi.advanceTimersByTime(WARM_WINDOW + 1);
    btn.dispatchEvent(pointerEvent("pointerover"));
    vi.advanceTimersByTime(FIRST_DELAY);
    expect(tip()?.hidden).toBe(false);

    document.dispatchEvent(new Event("scroll", { bubbles: true }));
    expect(tip()?.hidden).toBe(true);
  });
});
