/**
 * Simple sums in number fields: "120+24", "48*2", "(16+8)*2", "100/3".
 * A leading "+" adds to the current value ("+8"). A leading "-" is just a
 * negative number, since negative offsets and margins are common.
 * A small parser, never eval.
 */

const UNITS = "px|%|rem|em|vw|vh|svh|dvh|fr|ch";
const TOKEN = new RegExp(`\\s*(?:(\\d*\\.?\\d+)(${UNITS})?|([-+*/()]))`, "y");

type Token = { num: number } | { op: string };

/** Splits text into numbers and operators. Collects the units it saw. Null on anything else. */
function tokenize(input: string, units: Set<string>): Token[] | null {
  const out: Token[] = [];
  TOKEN.lastIndex = 0;
  let at = 0;
  while (at < input.length) {
    if (input.slice(at).trim() === "") break;
    TOKEN.lastIndex = at;
    const m = TOKEN.exec(input);
    if (!m) return null;
    if (m[1] !== undefined) {
      out.push({ num: Number(m[1]) });
      if (m[2]) units.add(m[2]);
    } else out.push({ op: m[3]! });
    at = TOKEN.lastIndex;
  }
  return out;
}

/** Recursive descent: sum = product (± product)*, product = unary (×÷ unary)*, unary = -unary | atom. */
function evaluate(tokens: Token[]): number | null {
  let i = 0;
  const peek = () => tokens[i] as (Token & { op?: string; num?: number }) | undefined;
  const sum = (): number => {
    let v = product();
    while (peek()?.op === "+" || peek()?.op === "-") {
      const op = (tokens[i++] as { op: string }).op;
      const r = product();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const product = (): number => {
    let v = unary();
    while (peek()?.op === "*" || peek()?.op === "/") {
      const op = (tokens[i++] as { op: string }).op;
      const r = unary();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  };
  const unary = (): number => {
    if (peek()?.op === "-") return i++, -unary();
    if (peek()?.op === "+") return i++, unary();
    return atom();
  };
  const atom = (): number => {
    const t = tokens[i++];
    if (!t) throw new Error("end");
    if ("num" in t) return t.num;
    if (t.op === "(") {
      const v = sum();
      if (peek()?.op !== ")") throw new Error("bracket");
      i++;
      return v;
    }
    throw new Error("unexpected");
  };
  try {
    const v = sum();
    return i === tokens.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/** Works out what was typed, plus the unit it used (if any). Null when it isn't a sum. */
function work(input: string, current: number | undefined): { n: number; unit?: string } | null {
  const text = input.trim();
  if (text === "") return null;
  const units = new Set<string>();
  const tokens = tokenize(text, units);
  if (!tokens || tokens.length === 0 || units.size > 1) return null;
  const relative = text.startsWith("+");
  const v = evaluate(tokens);
  if (v === null) return null;
  return { n: round(relative ? (current ?? 0) + v : v), unit: [...units][0] };
}

/** A typed number field: the result, or null to put the old value back. */
export function evalNumberInput(input: string, current: number | undefined): number | null {
  return work(input, current)?.n ?? null;
}

/** Does this text look like a sum rather than a plain CSS value? */
export function looksLikeSum(input: string): boolean {
  const t = input.trim();
  if (/[a-z]\s*\(/i.test(t)) return false; // calc(), minmax() and friends are CSS, not sums
  return t.startsWith("+") || /[\d)a-z%]\s*[-+*/]/.test(t) || t.startsWith("(");
}

/**
 * A typed length field ("24px*2" gives "48px", "10vw+2" gives "12vw"). Without a unit it keeps
 * the current one (px by default). Null when it isn't a sum or mixes units.
 */
export function evalLengthInput(input: string, current: string | undefined): string | null {
  const now = /^(-?\d*\.?\d+)([a-z%]*)$/.exec((current ?? "").trim());
  const r = work(input, now ? Number(now[1]) : undefined);
  if (!r) return null;
  return `${r.n}${r.unit ?? (now?.[2] || "px")}`;
}
