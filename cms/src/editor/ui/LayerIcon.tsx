import type { SVGProps } from "react";

export type LayerIconType = "section" | "text" | "media" | "embed" | "nav";

export function resolveLayerIconType(typeOrKind: string): LayerIconType {
  switch (typeOrKind) {
    case "flow":
    case "grid":
    case "canvas":
    case "section":
      return "section";
    case "Text":
    case "Button":
    case "DiaryList":
    case "Divider":
    case "Spacer":
    case "AoostJournals":
    case "AoostTools":
    case "AoostAbout":
      return "text";
    case "Image":
    case "Video":
    case "Audio":
    case "GalleryGrid":
    case "Cards":
    case "Lottie":
    case "Model3D":
    case "PlaylistCard":
    case "AoostHero":
    case "AoostProjects":
    case "AoostViewer":
    case "AoostPlaylistBand":
    case "AoostDrawingWall":
      return "media";
    case "Embed":
    case "SpotifyEmbed":
    case "Code":
    case "FileDownload":
    case "AoostRodeo":
      return "embed";
    case "Footer":
    case "AoostFooter":
    case "Global":
    case "Nav":
      return "nav";
    default:
      return "media";
  }
}

export function LayerIcon({ type, className, style, ...props }: { type: LayerIconType | string } & SVGProps<SVGSVGElement>) {
  const resolved = resolveLayerIconType(type);
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: "none", color: "var(--ed-sub)", ...style }}
      aria-hidden="true"
      {...props}
    >
      {resolved === "section" && (
        <rect x="1.5" y="1.5" width="10" height="10" rx="1.5" strokeWidth="1.2" />
      )}
      {resolved === "text" && (
        <path d="M2.5 3h8M6.5 3v7.5" strokeWidth="1.3" />
      )}
      {resolved === "media" && (
        <>
          <rect x="1.5" y="2" width="10" height="9" rx="1.5" strokeWidth="1.2" />
          <circle cx="4" cy="4.5" r="1" fill="currentColor" stroke="none" />
          <path d="M1.5 8.5l3-3 2.5 2.5 2-2 2.5 2.5" strokeWidth="1.1" />
        </>
      )}
      {resolved === "embed" && (
        <>
          <path d="M4 4.5L1.5 6.5l2.5 2" strokeWidth="1.2" />
          <path d="M9 4.5l2.5 2-2.5 2" strokeWidth="1.2" />
          <path d="M7.5 3.5l-2 6" strokeWidth="1.2" />
        </>
      )}
      {resolved === "nav" && (
        <>
          <path d="M2 3.5h9" strokeWidth="1.2" />
          <path d="M2 6.5h9" strokeWidth="1.2" />
          <path d="M2 9.5h9" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}
