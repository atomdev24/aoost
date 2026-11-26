/**
 * Every editor action, by id: what the palette lists and searches, what the
 * shortcuts run, and what the cheat sheet shows. Pure data; `run.ts` holds
 * what each one does.
 */
export const ACTION_IDS = [
  "palette.open",
  "help.shortcuts",
  "help.report",
  "help.problems",
  "help.tips",
  "tool.select",
  "tool.frame",
  "tool.text",
  "tool.image",
  "tool.comment",
  "tool.section",
  "canvas.zoomIn",
  "canvas.zoomOut",
  "canvas.zoom100",
  "canvas.fitAll",
  "canvas.grid",
  "frame.widescreen",
  "frame.desktop",
  "frame.tablet",
  "frame.mobile",
  "block.duplicate",
  "block.delete",
  "block.moveUp",
  "block.moveDown",
  "block.hide",
  "block.edit",
  "block.stepOut",
  "block.toBoard",
  "block.resetOverrides",
  "panel.layers",
  "panel.pages",
  "panel.media",
  "panel.history",
  "panel.insert",
  "panel.nav",
  "panel.theme",
  "panel.fonts",
  "panel.global",
  "insert.quick",
  "history.undo",
  "history.redo",
  "draft.save",
  "publish.sheet",
  "publish.now",
  "page.preview",
  "variant.new",
  "variant.elect",
  "variant.review",
  "variant.propose",
  "staging.send",
  "staging.push",
  "claude.ask",
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export type Group = "Palette and help" | "Tools" | "Canvas" | "Blocks" | "Panels" | "History and publishing";
export const GROUPS: Group[] = ["Palette and help", "Tools", "Canvas", "Blocks", "Panels", "History and publishing"];

export type ActionMeta = {
  id: ActionId;
  title: string;
  group: Group;
  /** Extra words the palette search matches. */
  keywords?: string;
  /** Needs a selected block. */
  needsSelection?: boolean;
  /** Listed under Actions when the palette opens. */
  common?: boolean;
  /** Not offered as a palette row (it's how you got there, or it needs the palette's query). */
  hidden?: boolean;
};

export const ACTIONS: ActionMeta[] = [
  { id: "palette.open", title: "Search and commands", group: "Palette and help", hidden: true },
  { id: "help.shortcuts", title: "Show keyboard shortcuts", group: "Palette and help", keywords: "cheat sheet keys help", common: true },
  { id: "help.report", title: "Report a problem", group: "Palette and help", keywords: "bug issue broken flicker feedback" },
  { id: "help.problems", title: "Problem log", group: "Palette and help", keywords: "errors issues diagnostics log bugs" },
  { id: "help.tips", title: "Show tips again", group: "Palette and help", keywords: "helper hints onboarding first time" },

  { id: "tool.select", title: "Select tool", group: "Tools", keywords: "pointer move" },
  { id: "tool.frame", title: "Add a free-layout section (Frame)", group: "Tools", keywords: "frame canvas" },
  { id: "tool.text", title: "Add text", group: "Tools", keywords: "type copy words" },
  { id: "tool.image", title: "Add an image", group: "Tools", keywords: "picture photo" },
  { id: "tool.comment", title: "Comment on something", group: "Tools", keywords: "note feedback review pin" },
  { id: "tool.section", title: "Add a section", group: "Tools", keywords: "flow stack" },

  { id: "canvas.zoomIn", title: "Zoom in", group: "Canvas" },
  { id: "canvas.zoomOut", title: "Zoom out", group: "Canvas" },
  { id: "canvas.zoom100", title: "Zoom to 100%", group: "Canvas", keywords: "actual size reset zoom" },
  { id: "canvas.fitAll", title: "Fit all frames", group: "Canvas", keywords: "zoom to fit overview" },
  { id: "canvas.grid", title: "Toggle the dot grid", group: "Canvas", keywords: "grid dots" },
  { id: "frame.widescreen", title: "Show the Widescreen frame", group: "Canvas", keywords: "breakpoint wide 1920" },
  { id: "frame.desktop", title: "Show the Desktop frame", group: "Canvas", keywords: "breakpoint 1440", common: true },
  { id: "frame.tablet", title: "Show the Tablet frame", group: "Canvas", keywords: "breakpoint 834" },
  { id: "frame.mobile", title: "Show the Mobile frame", group: "Canvas", keywords: "breakpoint phone 390", common: true },

  { id: "block.duplicate", title: "Duplicate block", group: "Blocks", keywords: "copy clone", needsSelection: true },
  { id: "block.delete", title: "Delete block", group: "Blocks", keywords: "remove", needsSelection: true },
  { id: "block.moveUp", title: "Move block up", group: "Blocks", keywords: "order earlier", needsSelection: true },
  { id: "block.moveDown", title: "Move block down", group: "Blocks", keywords: "order later", needsSelection: true },
  { id: "block.hide", title: "Hide block on this size", group: "Blocks", keywords: "show visible visibility", needsSelection: true },
  { id: "block.edit", title: "Edit or adjust the selection", group: "Blocks", keywords: "adjust crop step in", needsSelection: true },
  { id: "block.stepOut", title: "Step out of the selection", group: "Blocks", keywords: "parent deselect escape" },
  { id: "block.toBoard", title: "Move to the board (off the page)", group: "Blocks", keywords: "reference park out canvas picture", needsSelection: true },
  { id: "block.resetOverrides", title: "Reset overrides on this size", group: "Blocks", keywords: "reset changes breakpoint", needsSelection: true },

  { id: "panel.layers", title: "Layers", group: "Panels", keywords: "panel tree outline" },
  { id: "panel.pages", title: "Pages", group: "Panels", keywords: "panel sitemap" },
  { id: "panel.media", title: "Media", group: "Panels", keywords: "panel library images uploads" },
  { id: "panel.history", title: "Version history", group: "Panels", keywords: "versions revert restore undo publish past rollback" },
  { id: "panel.insert", title: "Add (Insert)", group: "Panels", keywords: "panel blocks components insert" },
  { id: "panel.nav", title: "Navigation", group: "Panels", keywords: "panel menu nav" },
  { id: "panel.theme", title: "Theme", group: "Panels", keywords: "panel colours colors" },
  { id: "panel.fonts", title: "Fonts", group: "Panels", keywords: "panel type typography" },
  { id: "panel.global", title: "Global components", group: "Panels", keywords: "panel shared footer" },
  { id: "insert.quick", title: "Quick insert", group: "Panels", keywords: "add block", common: true },

  { id: "history.undo", title: "Undo", group: "History and publishing" },
  { id: "history.redo", title: "Redo", group: "History and publishing" },
  { id: "draft.save", title: "Save the draft now", group: "History and publishing", keywords: "save" },
  { id: "publish.sheet", title: "Open the publish sheet", group: "History and publishing", keywords: "changes review" },
  { id: "publish.now", title: "Publish", group: "History and publishing", keywords: "go live deploy release", common: true },
  { id: "page.preview", title: "Preview this page", group: "History and publishing", keywords: "open view", common: true },
  { id: "variant.new", title: "New variant of this page", group: "History and publishing", keywords: "version copy try idea alternative a/b" },
  { id: "variant.elect", title: "Pick this variant…", group: "History and publishing", keywords: "variant choose promote stage elect pick" },
  { id: "variant.review", title: "Review this page's versions side by side", group: "History and publishing", keywords: "variant compare designs vote review" },
  { id: "variant.propose", title: "Propose this variant for review", group: "History and publishing", keywords: "variant propose review team vote" },
  { id: "staging.send", title: "Send the draft to staging", group: "History and publishing", keywords: "stage share link preview review" },
  { id: "staging.push", title: "Push staging to production", group: "History and publishing", keywords: "go live publish staging" },
  { id: "claude.ask", title: "Ask Claude", group: "Palette and help", hidden: true },
];

export const actionById = (id: ActionId) => ACTIONS.find((a) => a.id === id)!;
