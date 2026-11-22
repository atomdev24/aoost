import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS runtime module
import { shouldPlay, T } from "./intro.js";

const win = (reduce: boolean) => {
  const store = new Map<string, string>();
  return { matchMedia: () => ({ matches: reduce }), sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } };
};

describe("hero opening", () => {
  it("plays when set, never with reduced motion, and 'session' only once per visit", () => {
    expect(shouldPlay("off", win(false))).toBe(false);
    expect(shouldPlay(undefined, win(false))).toBe(false);
    expect(shouldPlay("always", win(true))).toBe(false);
    const w = win(false);
    expect(shouldPlay("always", w)).toBe(true);
    expect(shouldPlay("always", w)).toBe(true);
    expect(shouldPlay("session", w)).toBe(true);
    expect(shouldPlay("session", w)).toBe(false);
  });
  it("runs in order: dot, clover, line, artwork, in about six seconds", () => {
    const order = [T.dot, T.clover, T.hold, T.collapse, T.lines, T.art, T.settle, T.end];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(T.end).toBeLessThanOrEqual(6.5);
  });
});
