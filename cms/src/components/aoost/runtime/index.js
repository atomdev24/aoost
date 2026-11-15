/* aoost homepage runtime: starts whichever sections are on the page, in the original page's order. */
import { wrap, initUnderlines } from './shared.js';
import { initViewer } from './viewer.js';
import { initHero } from './hero.js';
import { initFocus, initMats } from './page.js';

function boot(){
  if(!wrap)return;
  const each=fns=>fns.forEach(fn=>{try{fn();}catch(e){console.error('[aoost]',e);}});
  each([initUnderlines,initViewer,initHero,initFocus,initMats]);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
