import { plainOf } from "../../model/markdown-doc";

/*
 * Which of a block's words fields a double-clicked bit of text came from. The blocks don't label
 * their elements, so it's matched by what a visitor reads: the element's text against each text
 * field (or one paragraph of it). No match means it isn't editable text (a number, a label made
 * by the block), and the double-click does what it did before.
 */
export type FieldPath = (string | number)[];
export type FieldHit = { path: FieldPath; value: string; paragraphs: boolean };

// Fields that hold addresses, choices or settings rather than words.
const NOT_WORDS = /^(id|src|href|url|link|image|images|video|poster|alt|align|bg|icon|tone|kind|variant|style|styleid|layout|theme|mode|size|logo|tag|anchor|color|colour|rich|lang|format|type|target)$|(url|src|image|href|icon|logo|colou?r|id)$/i;
const NOT_TEXT_VALUE = /^(\/|https?:|#|token:|mailto:|tel:)/i;

/** Every words field in a block's content, with its path. */
export function wordFields(content: unknown, path: FieldPath = []): { path: FieldPath; value: string }[] {
  if (typeof content === "string") {
    const key = String(path[path.length - 1] ?? "");
    return content.trim() && !NOT_WORDS.test(key) && !NOT_TEXT_VALUE.test(content.trim()) ? [{ path, value: content }] : [];
  }
  if (Array.isArray(content)) return content.flatMap((v, i) => wordFields(v, [...path, i]));
  if (content && typeof content === "object") return Object.entries(content).flatMap(([k, v]) => (NOT_WORDS.test(k) && typeof v === "string" ? [] : wordFields(v, [...path, k])));
  return [];
}

// Quote marks a block adds around words (a testimonial) don't count.
const norm = (s: string) => s.replace(/\s+/g, " ").trim().replace(/^[“"‘']+|[”"’']+$/g, "").trim().toLowerCase();

/** The field whose words are exactly `shown`, or one of whose paragraphs is. */
export function findField(content: unknown, shown: string): FieldHit | null {
  const t = norm(shown);
  if (!t) return null;
  const fields = wordFields(content);
  for (const f of fields) if (norm(plainOf(f.value)) === t) return { ...f, paragraphs: /\n[ \t]*\n/.test(f.value) };
  for (const f of fields) {
    const paras = f.value.split(/\n[ \t]*\n/);
    if (paras.length > 1 && paras.some((p) => norm(plainOf(p)) === t)) return { ...f, paragraphs: true };
  }
  return null;
}

/** Set one field's words, copying only the objects on the way. */
export function setField<T>(content: T, path: FieldPath, value: string): T {
  if (!path.length) return value as unknown as T;
  const [k, ...rest] = path;
  if (Array.isArray(content)) return content.map((v, i) => (i === k ? setField(v, rest, value) : v)) as unknown as T;
  const obj = (content ?? {}) as Record<string, unknown>;
  return { ...obj, [k as string]: setField(obj[k as string], rest, value) } as T;
}

/**
 * Fields a block draws with render/inline, so **bold**, *italic* and [links](/x) show as such.
 * Only these get the formatting buttons; every other field is edited as plain words.
 */
const MARKED: Record<string, string[]> = {
  AeroText: ["body"],
  AeroFaq: ["answer"],
  AeroPageHeader: ["text"],
  AeroPricing: ["text"],
  AeroSplit: ["text"],
  AeroSteps: ["cardText"],
  AeroFeatures: ["text"],
  AeroHero: ["text"],
  AeroShowcase: ["text"],
  AeroStories: ["text"],
};
export const takesMarks = (type: string, path: FieldPath) => (MARKED[type] ?? []).includes(String(path[path.length - 1]));
