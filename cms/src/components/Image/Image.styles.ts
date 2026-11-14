// .frame is the InDesign-style frame; .media is the content fitted inside it.
// The node wrapper owns size, radius, border and shadow; the frame clips to it.
export const css = `
.frame{position:relative;margin:0;width:100%;height:100%;overflow:hidden;border-radius:inherit}
.frame::after{content:"";display:none;position:absolute;inset:0;mix-blend-mode:lighten;pointer-events:none}
.frame>.media,.frame>a>.media{display:block;width:100%;height:100%;object-fit:cover}
.frame>a{display:block;width:100%;height:100%}
.frame figcaption{position:absolute;left:10px;bottom:10px;padding:4px 8px;border-radius:6px;background:rgba(20,20,20,.78);color:var(--c-bone)}
.frame[data-lightbox]{cursor:zoom-in}
.frame-empty{display:flex;align-items:center;justify-content:center;min-height:120px;border:1.5px dashed #9C9486;border-radius:4px;color:var(--c-muted);font:500 13px var(--font-body)}
`;
