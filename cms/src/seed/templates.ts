import type { Template } from "../schema";
import { node, section, text } from "./build";

/** The four built-in starters (SPEC §4). Ids inside are re-generated when a template is applied. */
export const starterTemplates: Template[] = [
  { id: "blank", name: "Blank", kind: "page", sections: [section("t-blank-1", "flow", [text("t-blank-title", "h1", "Untitled")], { padding: "120px 20px 64px" }, { padding: "160px 56px 96px" }, "Content")] },
  {
    id: "gallery",
    name: "Gallery",
    kind: "page",
    sections: [
      section("t-gal-head", "flow", [text("t-gal-title", "h1", "Gallery"), text("t-gal-blurb", "body", "A line about this body of work.", { color: "token:text" })], { padding: "120px 20px 12px" }, { padding: "160px 56px 20px" }, "Heading"),
      section("t-gal-grid", "flow", [node("t-gal-gg", "GalleryGrid", { items: [], columns: 2, columnsDesktop: 3, gap: 12, lightbox: true })], { padding: "12px 20px 64px" }, { padding: "20px 56px 96px" }, "Gallery"),
    ],
  },
  {
    id: "diary",
    name: "Diary entry",
    kind: "page",
    sections: [
      section(
        "t-diary-1",
        "flow",
        [text("t-diary-kicker", "label", "Diary", { color: "token:muted" }), text("t-diary-title", "h1", "Diary"), node("t-diary-list", "DiaryList", { limit: 0, showImages: true }, { margin: "20px 0 0" })],
        { padding: "120px 20px 64px" },
        { padding: "160px 56px 96px" },
        "Diary",
      ),
    ],
  },
  {
    id: "playlist",
    name: "Playlist",
    kind: "page",
    sections: [
      section(
        "t-pl-1",
        "flow",
        [text("t-pl-title", "h1", "Playlists"), node("t-pl-cards", "PlaylistCard", { source: "all", playlistId: "" }, { margin: "20px 0 0" })],
        { padding: "120px 20px 64px" },
        { padding: "160px 56px 96px" },
        "Playlists",
      ),
    ],
  },
];
