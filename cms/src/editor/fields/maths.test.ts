import { describe, expect, it } from "vitest";
import { evalLengthInput, evalNumberInput, looksLikeSum } from "./maths";

describe("evalNumberInput", () => {
  it("reads plain numbers", () => {
    expect(evalNumberInput("12", 0)).toBe(12);
    expect(evalNumberInput("-8", 4)).toBe(-8);
    expect(evalNumberInput(".5", 0)).toBe(0.5);
  });
  it("follows precedence and brackets", () => {
    expect(evalNumberInput("120+24", 0)).toBe(144);
    expect(evalNumberInput("2+3*4", 0)).toBe(14);
    expect(evalNumberInput("(16+8)*2", 0)).toBe(48);
    expect(evalNumberInput("10-2-3", 0)).toBe(5);
    expect(evalNumberInput("-(2+3)", 0)).toBe(-5);
  });
  it("rounds decimals", () => {
    expect(evalNumberInput("100/3", 0)).toBe(33.3333);
    expect(evalNumberInput("0.1+0.2", 0)).toBe(0.3);
  });
  it("adds to the current value with a leading +", () => {
    expect(evalNumberInput("+8", 40)).toBe(48);
    expect(evalNumberInput("+8*2", 40)).toBe(56);
    expect(evalNumberInput("+8", undefined)).toBe(8);
  });
  it("gives null for junk and divide by zero", () => {
    expect(evalNumberInput("4/0", 0)).toBeNull();
    expect(evalNumberInput("abc", 0)).toBeNull();
    expect(evalNumberInput("2+", 0)).toBeNull();
    expect(evalNumberInput("(2+3", 0)).toBeNull();
    expect(evalNumberInput("2)", 0)).toBeNull();
    expect(evalNumberInput("", 0)).toBeNull();
    expect(evalNumberInput("alert(1)", 0)).toBeNull();
  });
});

describe("evalLengthInput", () => {
  it("keeps the typed unit", () => {
    expect(evalLengthInput("24px*2", "10px")).toBe("48px");
    expect(evalLengthInput("10vw+2", "5px")).toBe("12vw");
  });
  it("keeps the current unit when none is typed", () => {
    expect(evalLengthInput("50*2", "20%")).toBe("100%");
    expect(evalLengthInput("+8", "40px")).toBe("48px");
    expect(evalLengthInput("8*2", undefined)).toBe("16px");
    expect(evalLengthInput("+8", "auto")).toBe("8px");
  });
  it("refuses mixed units", () => {
    expect(evalLengthInput("10px+2vw", "0px")).toBeNull();
  });
});

describe("looksLikeSum", () => {
  it("spots sums but leaves plain CSS values alone", () => {
    expect(looksLikeSum("24px*2")).toBe(true);
    expect(looksLikeSum("+8")).toBe(true);
    expect(looksLikeSum("(1+2)")).toBe(true);
    expect(looksLikeSum("-8px")).toBe(false);
    expect(looksLikeSum("auto")).toBe(false);
    expect(looksLikeSum("50%")).toBe(false);
    expect(looksLikeSum("calc(100% - 20px)")).toBe(false);
  });
});
