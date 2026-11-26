import { mergeTranslatedEdit, withoutFit } from "../model/i18n";
import { FeedbackToast } from "./workspace/FeedbackToast";
import { BlogWriter } from "./writer/BlogWriter";
import { Puck, useGetPuck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { useEffect, useMemo, useRef } from "react";
import { deepEqual } from "../responsive/resolve";
import { DESIGN_WIDTH } from "../schema";
import { Board } from "./board/Board";
import { activateBreakpoint, connectPuck } from "./board/bridge";
import { isPhone } from "./touch/device";
import { attachKeys } from "./board/keys";
import { PuckFrame } from "./board/PuckFrame";
import { fitFrame, useBoard } from "./board/store";
import "./editor.css";
import { pageToPuck, puckToPage, type PuckData } from "./puck/adapter";
import { puckConfig } from "./puck/config";
import { markFromPuck } from "./puck/PuckSync";
import { currentPage, getState, updatePage, useEditor } from "./store";
import { QuickInsert } from "./insert/QuickInsert";
import { PaletteHost } from "./commands/PaletteHost";
import { MediaPickerHost } from "./ui/MediaPicker";
import { ActionBar } from "./workspace/ActionBar";
import { FieldLabel } from "./workspace/FieldLabel";
import { Inspector } from "./workspace/Inspector";
import { LeftPanel } from "./workspace/LeftPanel";
import { SyncNotice } from "./workspace/SyncNotice";
import { UploadTrayHost } from "./ui/UploadTrayHost";
import { CompareView, BrowserZoomNotice, DesignsBoard, VariantBand } from "./parts";
import { useDesignsOpen } from "./templates/designs-open";
import { useCompare } from "./workspace/compare";
import { TopBar } from "./workspace/TopBar";
import { warmUp } from "./warmup";
import "./workspace/workspace.css";
import "./workspace/phone.css";
import "./workspace/refresh.css";

const VIEWPORTS = [
  { width: DESIGN_WIDTH.desktop, height: "auto" as const, label: "Desktop", icon: "Monitor" as const },
  { width: DESIGN_WIDTH.mobile, height: "auto" as const, label: "Mobile", icon: "Smartphone" as const },
  { width: DESIGN_WIDTH.tablet, height: "auto" as const, label: "Tablet", icon: "Tablet" as const },
  { width: DESIGN_WIDTH.widescreen, height: "auto" as const, label: "Widescreen", icon: "Monitor" as const },
];

/** Lets code outside Puck's tree (frames, tools, shortcuts) reach Puck. */
function PuckBridge() {
  const getPuck = useGetPuck();
  useEffect(() => {
    connectPuck(getPuck);
    // A phone opens on the Mobile frame, fitted to the screen. The other frames stay on the board.
    if (isPhone()) {
      activateBreakpoint("mobile");
      fitFrame("mobile");
    }
  }, [getPuck]);
  return null;
}

/**
 * The desktop editor (direction B, "dark Pro"): top bar, Pages / Layers /
 * Assets on the left, the breakpoint board in the middle and the inspector
 * on the right. Puck runs in composition mode; its preview is the active
 * frame on the board.
 */
export function Editor() {
  const pageId = useEditor((s) => s.pageId);
  const lang = useEditor((s) => s.lang);
  const bp = useEditor((s) => s.bp);
  const interacting = useBoard((s) => s.interacting);
  const moving = useBoard((s) => s.moving);
  const onVariant = useEditor((s) => !!currentPage(s).variantOf);
  const comparing = !!useCompare();
  const designsOpen = !!useDesignsOpen();
  useEffect(() => attachKeys(document), []);
  useEffect(() => warmUp(), []);
  useEffect(() => void performance.mark("aoost:shell"), []);

  // Initial data per page; later store changes reach Puck through <PuckSync>.
  const initial = useMemo(() => pageToPuck(currentPage(getState())), [pageId, lang]);
  const pendingLabel = useRef<{ label: string; merge?: string } | null>(null);

  return (
    <>
      <MediaPickerHost />
      <Puck
        key={`${pageId}:${lang ?? ""}`}
        config={puckConfig}
        data={initial as never}
        viewports={VIEWPORTS}
        iframe={{ enabled: true, waitForStyles: false }}
        ui={{ viewports: { current: { width: DESIGN_WIDTH[bp], height: "auto" }, controlsVisible: false, options: VIEWPORTS } }}
        overrides={{ iframe: PuckFrame, actionBar: ActionBar, fieldLabel: FieldLabel as never }}
        onAction={(action) => {
          if (action.type === "insert") pendingLabel.current = { label: `Add ${action.componentType}` };
          else if (action.type === "remove") pendingLabel.current = { label: "Delete" };
          else if (action.type === "duplicate") pendingLabel.current = { label: "Duplicate" };
          else if (action.type === "move" || action.type === "reorder") pendingLabel.current = { label: "Move" };
          else if (action.type === "replace") pendingLabel.current = { label: "Edit", merge: `edit:${action.destinationZone}:${action.destinationIndex}` };
        }}
        onChange={(data) => {
          const page = currentPage(getState());
          const next = puckToPage(data as unknown as PuckData, page);
          // A translation's text-fit factor is drawn only; it never counts as a change.
          if (deepEqual(next.sections, withoutFit(page.sections))) return;
          const step = pendingLabel.current ?? { label: "Edit" };
          pendingLabel.current = null;
          markFromPuck(next);
          const editing = getState().lang;
          // In another language, changed values go to that language; structure stays shared.
          updatePage(page.id, editing && page.lang === editing ? (base) => mergeTranslatedEdit(base, next, editing) : () => next, step.label, { merge: step.merge });
        }}
      >
        <PuckBridge />
        <div className={`ed-shell${interacting ? " is-interacting" : ""}${moving ? " is-moving" : ""}${onVariant ? " is-variant" : ""}`}>
          <TopBar />
          <SyncNotice />
          <VariantBand />
          {comparing ? <CompareView /> : null}
          {designsOpen ? <DesignsBoard /> : null}
          <LeftPanel />
          <Board />
          <Inspector />
          <QuickInsert />
          <PaletteHost />
          <BrowserZoomNotice />
          <UploadTrayHost />
          <FeedbackToast />
          <BlogWriter />
        </div>
      </Puck>
    </>
  );
}
