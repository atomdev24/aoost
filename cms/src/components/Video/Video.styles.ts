export const css = `
.vid{background:#0F0F11}
.vid>.media{display:block;width:100%;height:100%;border:0;object-fit:cover}
.vid-facade{position:relative;display:block;width:100%;height:100%;padding:0;border:0;background:transparent;color:#F3EFE6;cursor:pointer}
.vid-facade .media{display:block;width:100%;height:100%;object-fit:cover}
.vid-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(20,20,20,.25);transition:background-color .2s}
.vid-facade:hover .vid-play{background:rgba(20,20,20,.1)}
.vid-still{display:none!important}
@media (max-width:899px){.vid-still-mobile>video{display:none}.vid-still-mobile>.vid-still{display:block!important}}
`;
