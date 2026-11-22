import { part } from "./lazy";

/** Everything that loads after the board (see lazy.tsx). Import from here, never the files directly. */
export const PagesPanel = part("Pages panel", () => import("./ui/PagesPanel").then((m) => m.PagesPanel));
export const HistoryPanel = part("History panel", () => import("./ui/HistoryPanel").then((m) => m.HistoryPanel));
export const InsertPanel = part("Insert panel", () => import("./insert/InsertPanel").then((m) => m.InsertPanel));
export const MediaLibrary = part("Media library", () => import("./ui/MediaLibrary").then((m) => m.MediaLibrary));
export const NavPanel = part("Navigation panel", () => import("./ui/NavPanel").then((m) => m.NavPanel));
export const ThemePanel = part("Theme panel", () => import("./ui/ThemePanel").then((m) => m.ThemePanel));
export const FontsPanel = part("Fonts panel", () => import("./ui/FontsPanel").then((m) => m.FontsPanel));
export const LibraryPanel = part("Global panel", () => import("./ui/LibraryPanel").then((m) => m.LibraryPanel));
export const PublishSheet = part("publish sheet", () => import("./workspace/PublishSheet").then((m) => m.PublishSheet));
export const CompareView = part("compare view", () => import("./workspace/CompareView").then((m) => m.CompareView));
// The palette and the shortcuts sheet stay in the start-up file: ⌘K then typing at once must not lose letters.
export const GlobalPanel = part("global block settings", () => import("./ui/GlobalPanel").then((m) => m.GlobalPanel));
export const OverlayPanel = part("overlay settings", () => import("./ui/OverlayPanel").then((m) => m.OverlayPanel));
export const CommentLayer = part("comments", () => import("./comments/CommentLayer").then((m) => m.CommentLayer));
export const CommentsPanel = part("Comments panel", () => import("./comments/CommentsPanel").then((m) => m.CommentsPanel));
export const PresenceLayer = part("people here", () => import("./presence/PresenceLayer").then((m) => m.PresenceLayer));
export const Avatars = part("people here", () => import("./presence/PresenceLayer").then((m) => m.Avatars));
export const AdjustImage = part("image adjusting", () => import("./canvas/AdjustImage").then((m) => m.AdjustImage));
export const DemoBar = part("demo notice", () => import("./workspace/DemoBar").then((m) => m.DemoBar));
export const ProblemsDialog = part("problem log", () => import("./commands/ProblemsDialog").then((m) => m.ProblemsDialog));
