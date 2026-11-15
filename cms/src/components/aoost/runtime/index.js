/* aoost homepage runtime: starts whichever sections are on the page, in the original page's order. */
import { wrap, initUnderlines } from './shared.js';
import { initViewer } from './viewer.js';
import { initHero } from './hero.js';
import { initProjects } from './projects.js';
import { initJournals } from './journals.js';
import { initTools } from './tools.js';
import { initRodeo } from './rodeo.js';
import { initPlaylists } from './playlists.js';
import { initWall } from './wall.js';
import { initFocus, initMats } from './page.js';

function boot(){
  if(!wrap)return;
  const each=fns=>fns.forEach(fn=>{try{fn();}catch(e){console.error('[aoost]',e);}});
  each([initUnderlines,initViewer,initProjects,initFocus,initRodeo,initPlaylists,initHero,initWall,initMats,initTools,initJournals]);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
