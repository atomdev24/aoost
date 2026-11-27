/* aoost homepage runtime: starts whichever sections are on the page, in the original page's order. */
import { wrap, initUnderlines } from './shared.js';
import { initViewer } from './viewer.js';
import { initHero } from './hero.js';
import { initProjects } from './projects.js';
import { initJournals } from './journals.js';
import { initWindowLight } from './light.js';
import { initTools } from './tools.js';
import { initRodeo } from './rodeo.js';
import { initPlaylists } from './playlists.js';
import { initWall } from './wall.js';
import { initFocus, initMats } from './page.js';

const run=fn=>{try{fn();}catch(e){console.error('[aoost]',e);}};

/* Start a section's effects only when it comes within ~1.5 screens of view, so a phone shows the
   top of the page first instead of setting up the whole page at once (homepage blocking time). */
function whenNear(selector,fn){
  const els=[...document.querySelectorAll(selector)];
  if(!els.length||!('IntersectionObserver' in window)){run(fn);return;}
  const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();run(fn);}},{rootMargin:'150% 0px'});
  els.forEach(el=>io.observe(el));
}

function boot(){
  if(!wrap)return;
  // What the first screen needs, straight away.
  [initUnderlines,initViewer,initFocus,initHero,initMats].forEach(run);
  // Everything else as it comes near.
  whenNear('.ao-b[data-ao="projects"]',initProjects);
  whenNear('.ao-b[data-ao="rodeo"]',initRodeo);
  whenNear('.ao-b[data-ao="playlists"]',initPlaylists);
  whenNear('.ao-b[data-ao="wall"]',initWall);
  whenNear('.ao .skills',initTools);
  whenNear('.ao-b[data-ao="journals"]',initJournals);
  whenNear('.jr-light, .board-shadow[data-shadow="window"]',initWindowLight);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
