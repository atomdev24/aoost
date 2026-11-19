// The playlists band: chips, a sleeve with its disc half out, and the tracklist with Spotify's compact player.
// Written by hand (no longer ported from the original page). Mobile first: sleeve on top, tracklist under it.
export const css = `
.ao .pl{position:relative;margin-inline:calc(50% - 50vw);background:#1E1E1E;color:#EDEDED;gap:0}
.ao .pl-in{position:relative;width:100%;max-width:1106px;margin:0 auto;box-sizing:border-box;padding:clamp(18px,4vw,28px) max(16px,env(safe-area-inset-right,0px)) clamp(40px,8vw,72px) max(16px,env(safe-area-inset-left,0px))}
.ao .pl .head h2{color:#fff}
.ao .pl-head{margin-bottom:clamp(14px,3vw,20px)}
.ao .pl-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 clamp(28px,6vw,44px)}
.ao .pl-chip{font:500 12px/1 Inter,var(--body);padding:8px 14px;border-radius:999px;border:1px solid #3A3A3A;background:none;color:#9A9A9A;cursor:var(--cur-hand);transition:background .2s,color .2s,border-color .2s}
.ao .pl-chip:hover{color:#EDEDED;border-color:#5A5A5A}
.ao .pl-chip[aria-pressed="true"]{background:#EDEDED;border-color:#EDEDED;color:#141516}
.ao .pl-chip:focus-visible,.ao .pl-track:focus-visible,.ao .pl-more:focus-visible{outline:2px solid #4CB3FF;outline-offset:2px}
.ao .pl-stage{display:grid;gap:clamp(28px,6vw,56px)}
@media (min-width:760px){.ao .pl-stage{grid-template-columns:minmax(0,5fr) minmax(0,6fr);align-items:start}}
.ao .pl-rec{position:relative;margin:0;width:100%;max-width:540px;aspect-ratio:3/2}
.ao .pl-rec[hidden],.ao .pl-list[hidden]{display:none!important}
.ao .pl-sleeve{position:absolute;z-index:2;left:0;top:0;width:66.667%;aspect-ratio:1/1;background:#2A2A2A;overflow:hidden;box-shadow:0 14px 30px -12px rgba(0,0,0,.7)}
.ao .pl-sleeve img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.ao .pl-disc{position:absolute;z-index:1;left:2%;top:2%;width:62.667%;aspect-ratio:1/1;border-radius:50%;
  background:radial-gradient(circle,transparent 0 31%,#0b0b0b 31.5% 33%,transparent 33.5%),repeating-radial-gradient(circle,#151515 0 1px,#0d0d0d 1px 3px);
  box-shadow:0 8px 24px -10px rgba(0,0,0,.8);transform:translateX(50%);animation:pl-out .9s cubic-bezier(.2,.8,.2,1) .05s both}
.ao .pl-lbl{position:absolute;inset:34%;border-radius:50%;overflow:hidden;background:#2A2A2A}
.ao .pl-lbl img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.ao .pl-lbl::after{content:"";position:absolute;left:50%;top:50%;width:10%;height:10%;transform:translate(-50%,-50%);border-radius:50%;background:#1E1E1E}
@keyframes pl-out{from{transform:translateX(0) rotate(-50deg)}to{transform:translateX(50%) rotate(0)}}
@media (prefers-reduced-motion:reduce){.ao .pl-disc{animation:none}.ao .pl-chip{transition:none}}
.ao .pl-side{min-width:0}
.ao .pl-tracks{list-style:none;margin:0;padding:0;border-top:1px solid #2E2E2E}
.ao .pl-tracks li{margin:0;padding:0}
.ao .pl-track{display:grid;grid-template-columns:2.4em minmax(0,1fr) auto;gap:12px;align-items:baseline;width:100%;box-sizing:border-box;padding:11px 2px;border:0;border-bottom:1px solid #2E2E2E;background:none;color:#BDBDBD;text-align:left;font:400 13px/1.35 Inter,var(--body)}
.ao button.pl-track{cursor:var(--cur-hand)}
.ao button.pl-track:hover{color:#fff}
.ao .pl-n,.ao .pl-du{font:400 11px/1 var(--mono);color:#6E6E6E;font-variant-numeric:tabular-nums}
.ao .pl-tt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ao .pl-ar{color:#7E7E7E}
.ao .pl-track[aria-current="true"]{color:#fff}
.ao .pl-track[aria-current="true"] .pl-n{color:#4CB3FF}
.ao .pl-more{display:inline-block;margin-top:14px;font:400 11px/1.4 var(--mono);color:#8C8C8C;text-decoration:none}
.ao .pl-more:hover{color:#fff}
.ao .pl-player{margin-top:clamp(20px,4vw,28px);height:80px;border-radius:12px;background:#2A2A2A;overflow:hidden}
.ao .pl-player iframe{display:block;border:0}
`;
