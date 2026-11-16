import type { Page } from "../schema";
import { image, node, section, text } from "./build";

/**
 * /sample: one page with every section kind and media type, used for the
 * screenshots in docs/, the Lighthouse check, and as a reference when
 * building real pages. It is unlisted: live by link, not in the nav or search.
 */
export const samplePage: Page = {
  id: "sample",
  title: "Sample",
  slug: "/sample",
  parentId: null,
  status: "unlisted",
  template: "blank",
  seo: { title: "aoost sample page", description: "Every section kind and media type on one page." },
  isHome: false,
  showInNav: false,
  sections: [
    section(
      "sample-hero",
      "flow",
      [
        text("sample-kicker", "label", "Sample · everything on one page", { color: "token:muted" }),
        text("sample-title", "hero", "Dust and neon."),
        text("sample-lede", "body", "A flow section stacks its content. This one has **bold**, *italic* and a [link](/work), a button, and scroll effects further down.", { color: "token:text", maxWidth: "560px" }),
        node("sample-cta", "Button", { label: "Back home", target: { kind: "page", pageId: "home" }, variant: "filled" }, { margin: "8px 0 0" }),
      ],
      { padding: "120px 20px 40px" },
      { padding: "180px 56px 64px" },
      "Flow section",
    ),
    section(
      "sample-grid",
      "grid",
      [
        text("sample-grid-h", "h2", "A grid section", { base: {}, desktop: { colSpan: 3 } }, "h2"),
        image("sample-img-fill", "/art/grillz.jpg", "Grillz, filling its frame", { aspectRatio: "4/3", radius: [18, 18, 18, 18], border: { width: 1.5, style: "solid", color: "token:ink" }, shadow: "hard" }, { caption: "Fill, focal point lower left" }, { focalX: 20, focalY: 80 }),
        image("sample-img-duo", "/art/monkey-figure.jpg", "Monkey figure in duotone", { aspectRatio: "4/3", radius: [18, 0, 18, 0], filter: { kind: "duotone", dark: "token:ink", light: "token:rustOnDark" } }, { caption: "Duotone" }),
        image("sample-img-fit", "/art/flower-skull.png", "Flower skull, fitted inside its frame", { aspectRatio: "4/3", background: "token:bone", radius: [6, 6, 6, 6] }, { caption: "Fit" }, { fit: "fit" }),
      ],
      { columns: 1, gap: 16, background: { color: "token:sand" } },
      { columns: 3, padding: "72px 56px" },
      "Grid section",
    ),
    section(
      "sample-canvas",
      "canvas",
      [
        image("sample-desert", "/seed/desert.svg", "Line drawing of a desert", { base: { x: 0, y: 60, w: 390, h: 300, z: 1 }, desktop: { x: 80, y: 40, w: 600, h: 462 } }, { lightbox: false }),
        image("sample-photo", "/art/hero.jpg", "Studio piece", { base: { x: 170, y: 20, w: 200, h: 143, z: 2, rotation: 4, radius: [18, 18, 18, 18], shadow: "hard" }, desktop: { x: 820, y: 60, w: 480, h: 343, rotation: -2 } }),
        text("sample-canvas-t", "h2", "A free canvas", { base: { x: 20, y: 372, w: 300, h: 40, z: 3 }, desktop: { x: 820, y: 440, w: 480, h: 50 } }, "h2"),
        node("sample-lottie", "Lottie", { src: "/seed/spin.json", loop: true, autoplay: true, alt: "A turning square" }, { base: { x: 20, y: 0, w: 72, h: 72, z: 4 }, desktop: { x: 700, y: 380, w: 96, h: 96 } }),
      ],
      { padding: "0px", height: 430 },
      { height: 540 },
      "Canvas section",
    ),
    section(
      "sample-media",
      "grid",
      [
        text("sample-media-h", "h2", "Video, audio, 3D", { base: {}, desktop: { colSpan: 2 } }, "h2"),
        node("sample-video", "Video", { source: "upload", src: "/seed/sunrise.webm", alt: "A sun crossing the desert", autoplay: true, loop: true, controls: false, playInView: true }, { aspectRatio: "16/9", radius: [12, 12, 12, 12] }, { frame: { base: { fit: "fill", focalX: 50, focalY: 50, zoom: 1, panX: 0, panY: 0 } }, effects: { enter: "slide-up" } }),
        node("sample-model", "Model3D", { src: "/seed/cube.glb", alt: "A rust-coloured cube", autoRotate: true, controls: true }, { aspectRatio: "16/9", background: "token:sand", radius: [12, 12, 12, 12] }),
        node("sample-audio", "Audio", { src: "/seed/tone.wav", title: "Desert static", artist: "A short test tone" }, {}, { effects: { enter: "fade" } }),
        node("sample-file", "FileDownload", { src: "/seed/desert.svg", label: "Desert line art", note: "vector" }),
      ],
      { columns: 1, gap: 16 },
      { columns: 2, padding: "72px 56px" },
      "Media",
    ),
    section(
      "sample-embeds",
      "flow",
      [
        text("sample-embeds-h", "h2", "Embeds and code", {}, "h2"),
        node("sample-spotify", "SpotifyEmbed", { url: "2FeVxQ6ZPLOAuoejGJj9Fb", compact: true }),
        node("sample-youtube", "Video", { source: "link", src: "", url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", poster: "/art/storefront.png", alt: "Big Buck Bunny", autoplay: false, loop: false, controls: true }, { aspectRatio: "16/9", radius: [12, 12, 12, 12] }),
        node("sample-map", "Embed", { url: "https://www.google.com/maps/place/Marfa,+TX" }, { radius: [12, 12, 12, 12] }),
        node("sample-divider", "Divider", { variant: "drawn" }, { margin: "12px 0" }),
        node("sample-code", "Code", {
          html: '<div class="ticker"><span>NOW SHOWING · DUST AND NEON · NOW SHOWING · DUST AND NEON · </span></div>',
          css: ".ticker{overflow:hidden;white-space:nowrap;font:600 14px Inter,system-ui,sans-serif;letter-spacing:.12em;color:#141414;padding:10px 0}.ticker span{display:inline-block;animation:slide 12s linear infinite}@keyframes slide{to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){.ticker span{animation:none}}",
          js: "",
          mode: "sandboxed",
        }),
        node("sample-spacer", "Spacer", {}, { base: { height: "16px" }, desktop: { height: "40px" } }),
        node("sample-gallery", "GalleryGrid", { items: [{ src: "/art/keychain.png", alt: "Keychain", title: "Keychain" }, { src: "/art/hear-no-evil-3d.png", alt: "Hear no evil, 3D", title: "Hear no evil" }, { src: "/art/j-star1.jpg", alt: "Sketchbook 01", title: "Sketchbook 01" }, { src: "/art/j-star3.jpg", alt: "Sketchbook 03", title: "Sketchbook 03" }], columns: 2, columnsDesktop: 4, gap: 12, lightbox: true }),
        node("sample-diary", "DiaryList", { limit: 1, showImages: false }),
        node("sample-playlist", "PlaylistCard", { source: "one", playlistId: "pl-rock" }),
      ],
      { padding: "56px 20px", maxWidth: 760 },
      { padding: "72px 56px 96px" },
      "Embeds and code",
    ),
    section("sample-footer", "flow", [node("sample-footer-ref", "Global", { globalId: "footer" })], { padding: "0px", maxWidth: undefined }, undefined, "Footer"),
  ],
  overlays: [
    {
      id: "sample-badge",
      node: text("sample-badge-text", "label", "Overlay · straddles two sections", { background: "token:rust", color: "token:bone", padding: "8px 14px", radius: [999, 999, 999, 999], textAlign: "center" }),
      anchor: { sectionId: "sample-grid", edge: "top" },
      place: { base: { h: "center", v: "top", dx: 0, dy: 0, width: 280 }, desktop: { h: "right", dx: -56, width: 300 } },
      z: 6,
    },
  ],
};
