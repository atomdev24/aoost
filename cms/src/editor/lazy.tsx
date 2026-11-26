import { Component, lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { noteProblem } from "./problems";

/**
 * Parts of the editor that load after the board (faster opening, phase 1): panels,
 * sheets and dialogs. Each loads on first use, or earlier in idle time once the
 * board is up (prefetchParts), or as soon as a pointer heads for its button.
 * A failed download is retried once (a deploy can briefly swap files); if it still
 * fails, the part says so with a Reload button instead of leaving a blank space.
 */
const loaders = new Map<string, () => Promise<unknown>>();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Part<P> = ComponentType<P> & { prefetch: () => Promise<unknown> };

export function part<P extends object>(name: string, load: () => Promise<ComponentType<P>>): Part<P> {
  let pending: Promise<ComponentType<P>> | null = null;
  const get = () =>
    (pending ??= load()
      .catch(async () => {
        await wait(600);
        return load();
      })
      .catch((e: unknown) => {
        pending = null;
        noteProblem("request", `The ${name} part didn't load`, e instanceof Error ? e.message : String(e));
        throw e;
      }));
  loaders.set(name, get);
  const Lazy = lazy(() => get().then((C) => ({ default: C })));
  const Wrapped = (props: P) => (
    <PartBoundary name={name}>
      <Suspense fallback={<div className="ed-part-loading" aria-busy="true" aria-label={`Loading ${name}`} />}>
        <Lazy {...props} />
      </Suspense>
    </PartBoundary>
  );
  return Object.assign(Wrapped, { prefetch: () => get().catch(() => undefined) });
}

class PartBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    // Kept in the problem log so a part that breaks while drawing can be traced.
    noteProblem("request", `The ${this.props.name} broke while drawing`, error instanceof Error ? `${error.message}\n${error.stack ?? ""}`.slice(0, 2000) : String(error));
    console.error(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="ed-part-failed" role="alert">
        <p>The {this.props.name} couldn't load (the editor may have just been updated).</p>
        <button type="button" className="ed-btn ed-btn-sm" onClick={() => location.reload()}>
          Reload the editor
        </button>
      </div>
    );
  }
}

let started = false;
/** After the board is up: fetch every part, one per idle moment, so first opens are instant. */
export function prefetchParts() {
  if (started) return;
  started = true;
  const queue = [...loaders.values()];
  const idle = (fn: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 200));
  const next = () => {
    const load = queue.shift();
    if (!load) return;
    void load().catch(() => undefined).finally(() => idle(next));
  };
  setTimeout(() => idle(next), 1200);
}
