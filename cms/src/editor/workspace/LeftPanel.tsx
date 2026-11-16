import { Puck } from "@puckeditor/core";
import { useEffect, useRef, useState } from "react";
import { addSection, createSection, locate } from "../../model/page-ops";
import type { Section } from "../../schema";
import { selectBlock } from "../board/bridge";
import { currentPage, getState, updatePage, useEditor } from "../store";
import { LayersPanel } from "../ui/LayersPanel";
import { LibraryPanel } from "../ui/LibraryPanel";
import { MediaLibrary } from "../ui/MediaLibrary";
import { PagesPanel } from "../ui/PagesPanel";
import { ThemePanel } from "../ui/ThemePanel";

type Tab = "pages" | "layers" | "assets";
type AssetTab = "blocks" | "media" | "library" | "theme";

const TABS: { id: Tab; label: string }[] = [
  { id: "pages", label: "Pages" },
  { id: "layers", label: "Layers" },
  { id: "assets", label: "Assets" },
];
const ASSET_TABS: { id: AssetTab; label: string }[] = [
  { id: "blocks", label: "Blocks" },
  { id: "media", label: "Media" },
  { id: "library", label: "Saved" },
  { id: "theme", label: "Theme" },
];

const remembered = <T extends string>(key: string, fallback: T): T => {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
};
const remember = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* not remembered in a private window */
  }
};

function Segmented<T extends string>({ value, options, onChange, label, small }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string; small?: boolean }) {
  return (
    <div className={`ed-segctl${small ? " ed-segctl-sm" : ""}`} role="tablist" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const KINDS: { kind: Section["kind"]; label: string; hint: string }[] = [
  { kind: "flow", label: "Section", hint: "Blocks stacked in a column" },
  { kind: "grid", label: "Grid section", hint: "Blocks in columns" },
  { kind: "canvas", label: "Free-layout section", hint: "Place layers anywhere" },
];

/** "+ Add section" at the foot of the layers list: after the selected section, or at the end. */
function AddSection() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const add = (kind: Section["kind"]) => {
    setOpen(false);
    const page = currentPage(getState());
    const at = getState().selection[0] ? locate(page, getState().selection[0]!) : null;
    const index = at && at.kind !== "overlay" ? page.sections.indexOf(at.section) + 1 : page.sections.length;
    const section = createSection(kind);
    updatePage(page.id, (p) => addSection(p, section, index), "Add section");
    selectBlock(section.id);
  };
  return (
    <div className="ed-addsection" ref={box}>
      {open ? (
        <ul className="ed-menu ed-menu-up" role="menu" aria-label="Add a section">
          {KINDS.map((k) => (
            <li key={k.kind} role="none">
              <button type="button" role="menuitem" onClick={() => add(k.kind)}>
                <span>{k.label}</span>
                <small>{k.hint}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="ed-dashed" aria-expanded={open} onClick={() => setOpen(!open)}>
        + Add section
      </button>
    </div>
  );
}

/** The 248px left panel: Pages, Layers and Assets as one segmented control. */
export function LeftPanel() {
  const [tab, setTabState] = useState<Tab>(() => remembered("aoost.left", "layers"));
  const [assets, setAssetsState] = useState<AssetTab>(() => remembered("aoost.assets", "blocks"));
  const pageId = useEditor((s) => s.pageId);
  const setTab = (t: Tab) => {
    setTabState(t);
    remember("aoost.left", t);
  };
  const setAssets = (t: AssetTab) => {
    setAssetsState(t);
    remember("aoost.assets", t);
  };
  return (
    <aside className="ed-left" aria-label="Pages, layers and assets">
      <Segmented value={tab} options={TABS} onChange={setTab} label="Left panel" />
      <div className="ed-left-body">
        {tab === "pages" ? <PagesPanel /> : null}
        {tab === "layers" ? <LayersPanel key={pageId} /> : null}
        {tab === "assets" ? (
          <>
            <Segmented value={assets} options={ASSET_TABS} onChange={setAssets} label="Assets" small />
            {assets === "blocks" ? (
              <div className="ed-panel ed-blocks">
                <p className="ed-hint">Drag a block onto the frame you are editing.</p>
                <Puck.Components />
              </div>
            ) : null}
            {assets === "media" ? (
              <div className="ed-panel ed-theme">
                <MediaLibrary compact />
              </div>
            ) : null}
            {assets === "library" ? <LibraryPanel /> : null}
            {assets === "theme" ? <ThemePanel /> : null}
          </>
        ) : null}
      </div>
      {tab === "layers" ? <AddSection /> : null}
    </aside>
  );
}
