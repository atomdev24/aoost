import type { ContentFiles } from "../schema";

/**
 * A three-way merge of the content files, at the JSON level, with the base
 * (what the draft last matched) as the common ancestor. Used when a newer
 * deploy lands while a draft is open: changes made only in the deploy are
 * taken, changes made only in the draft are kept, and when both changed the
 * same value differently the draft wins and the clash is recorded.
 *
 * `undefined` means "absent" throughout: a missing key, array item or file.
 */
export type PathSeg = string | { id: string };
export type Clash = { path: PathSeg[]; base: unknown; draft: unknown; live: unknown };
export type Conflict = Clash & { file: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  if (!isObj(a) || !isObj(b)) return false;
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
}

/** Arrays whose items all have a unique string id are merged item by item. */
function ids(arr: unknown[]): string[] | null {
  const out: string[] = [];
  for (const item of arr) {
    if (!isObj(item) || typeof item.id !== "string") return null;
    out.push(item.id);
  }
  return new Set(out).size === out.length ? out : null;
}

/** Order for a merged id-array: one side's order, with the other side's new items after their predecessor. */
function weave(skeleton: string[], other: string[]): string[] {
  const out = [...skeleton];
  const seen = new Set(skeleton);
  other.forEach((id, i) => {
    if (seen.has(id)) return;
    const prev = other.slice(0, i).reverse().find((p) => out.includes(p));
    out.splice(prev === undefined ? 0 : out.indexOf(prev) + 1, 0, id);
    seen.add(id);
  });
  return out;
}

const inOrder = (sub: string[], of: string[]) => {
  const pos = sub.map((id) => of.indexOf(id));
  return pos.every((p, i) => i === 0 || p > pos[i - 1]!);
};

export function merge3(base: unknown, draft: unknown, live: unknown, path: PathSeg[] = []): { value: unknown; conflicts: Clash[] } {
  if (deepEqual(draft, live)) return { value: draft, conflicts: [] };
  if (deepEqual(draft, base)) return { value: live, conflicts: [] };
  if (deepEqual(live, base)) return { value: draft, conflicts: [] };

  if (isObj(base) && isObj(draft) && isObj(live)) {
    const value: Obj = {};
    const conflicts: Clash[] = [];
    const keys = [...Object.keys(draft), ...Object.keys(live).filter((k) => !(k in draft)), ...Object.keys(base).filter((k) => !(k in draft) && !(k in live))];
    for (const k of keys) {
      const r = merge3(base[k], draft[k], live[k], [...path, k]);
      if (r.value !== undefined) value[k] = r.value;
      conflicts.push(...r.conflicts);
    }
    return { value, conflicts };
  }

  if (Array.isArray(base) && Array.isArray(draft) && Array.isArray(live)) {
    const [bi, di, li] = [ids(base), ids(draft), ids(live)];
    if (bi && di && li) {
      const byId = (arr: unknown[]) => new Map(arr.map((item) => [(item as Obj).id as string, item]));
      const [bm, dm, lm] = [byId(base), byId(draft), byId(live)];
      // If the draft kept the base order, follow the deploy's order; otherwise keep the draft's.
      const draftKept = inOrder(di.filter((id) => bm.has(id)), bi);
      const order = draftKept ? weave(li, di) : weave(di, li);
      const value: unknown[] = [];
      const conflicts: Clash[] = [];
      for (const id of order) {
        const r = merge3(bm.get(id), dm.get(id), lm.get(id), [...path, { id }]);
        if (r.value !== undefined) value.push(r.value);
        conflicts.push(...r.conflicts);
      }
      return { value, conflicts };
    }
  }

  // Scalars, arrays without ids, a type change, or removed on one side and changed on the other.
  return { value: draft, conflicts: [{ path, base, draft, live }] };
}

const parse = (text: string | undefined): unknown => (text === undefined ? undefined : JSON.parse(text));
export const serialize = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

export function mergeFiles(base: ContentFiles, draft: ContentFiles, live: ContentFiles): { files: ContentFiles; conflicts: Conflict[] } {
  const files: ContentFiles = {};
  const conflicts: Conflict[] = [];
  const paths = new Set([...Object.keys(draft), ...Object.keys(live), ...Object.keys(base)]);
  for (const file of paths) {
    const d = parse(draft[file]);
    const r = merge3(parse(base[file]), d, parse(live[file]));
    conflicts.push(...r.conflicts.map((c) => ({ file, ...c })));
    if (r.value === undefined) continue;
    files[file] = deepEqual(r.value, d) && draft[file] !== undefined ? draft[file]! : serialize(r.value);
  }
  return { files, conflicts };
}

export function getAt(root: unknown, path: PathSeg[]): unknown {
  let at = root;
  for (const seg of path) {
    if (typeof seg === "string") at = isObj(at) ? at[seg] : undefined;
    else at = Array.isArray(at) ? at.find((item) => isObj(item) && item.id === seg.id) : undefined;
    if (at === undefined) return undefined;
  }
  return at;
}

/** A copy of `root` with `value` at `path` (`undefined` removes it). Missing parents are created as objects. */
export function setAt(root: unknown, path: PathSeg[], value: unknown): unknown {
  if (!path.length) return value;
  const [seg, ...rest] = path as [PathSeg, ...PathSeg[]];
  if (typeof seg === "string") {
    const obj: Obj = isObj(root) ? { ...root } : {};
    const next = setAt(obj[seg], rest, value);
    if (next === undefined) delete obj[seg];
    else obj[seg] = next;
    return obj;
  }
  const arr = Array.isArray(root) ? [...root] : [];
  const i = arr.findIndex((item) => isObj(item) && item.id === seg.id);
  const next = setAt(i >= 0 ? arr[i] : undefined, rest, value);
  if (next === undefined) {
    if (i >= 0) arr.splice(i, 1);
  } else if (i >= 0) arr[i] = next;
  else arr.push(next);
  return arr;
}

/** "pages/home.json › sections › hero-1 › props › title" */
export const pathLabel = (file: string, path: PathSeg[]) => [file.replace(/^content\//, ""), ...path.map((s) => (typeof s === "string" ? s : s.id))].join(" › ");
