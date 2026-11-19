/* the dark room: the full-screen viewer the projects table and the reel open artwork in.
   A near-black room with the piece as large as fits, a counter, close, previous/next, swipe and keys.
   No labels unless a piece has plaque text: then a small "i" shows its plaque card. */
import { overlays, placeholderCanvas, reduce } from './shared.js';
import { plaqueParts } from './plaque.js';
import { viewerInner } from '../AoostViewer/viewer.markup';

let viewer=null,vStage=null,vCount,vPrev,vNext,vInfo,vPlaque,lastFocus=null;
let items=[],idx=0;
const $=id=>viewer.querySelector('#'+id);

function ensure(){
  if(viewer)return;
  viewer=document.getElementById('viewer');
  if(!viewer){ /* no AoostViewer block on the page: make the same markup */
    viewer=document.createElement('div');viewer.className='viewer';viewer.id='viewer';viewer.hidden=true;viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','Artwork');
    viewer.innerHTML=viewerInner;}
  /* it sits above everything, outside the sections (their focus effect would otherwise trap it) */
  overlays().appendChild(viewer);
  vStage=$('vStage');vCount=$('vCount');vPrev=$('vPrev');vNext=$('vNext');vInfo=$('vInfo');vPlaque=$('vPlaque');
  $('vClose').addEventListener('click',closeViewer);
  vPrev.addEventListener('click',()=>step(-1));
  vNext.addEventListener('click',()=>step(1));
  vInfo.addEventListener('click',()=>setPlaque(vPlaque.hidden));
  /* the empty room closes it */
  viewer.addEventListener('click',e=>{if(e.target===viewer||e.target===vStage)closeViewer();});
  /* swipe: a mostly-horizontal drag of 40px or more turns */
  let sx=0,sy=0,sid=null;
  vStage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;sid=e.pointerId;sx=e.clientX;sy=e.clientY;});
  vStage.addEventListener('pointerup',e=>{if(e.pointerId!==sid)return;sid=null;const dx=e.clientX-sx,dy=e.clientY-sy;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.2&&items.length>1)step(dx<0?1:-1);});
  vStage.addEventListener('pointercancel',()=>{sid=null;});
}

/** The piece itself: an image, a drawn canvas, or a placeholder. */
function pieceEl(item){
  if(item.src){const img=new Image();img.alt=item.alt||'Artwork';img.decoding='async';img.src=item.src;return img;}
  if(item.fnArt){const cv=document.createElement('canvas');cv.width=800;cv.height=1000;item.fnArt(cv.getContext('2d'),800,1000);cv.setAttribute('role','img');cv.setAttribute('aria-label','Artwork');return cv;}
  const cv=placeholderCanvas(item.ph,1000);cv.setAttribute('role','img');cv.setAttribute('aria-label','Artwork');return cv;
}

function setPlaque(open){vPlaque.hidden=!open;vInfo.setAttribute('aria-expanded',String(open));vInfo.classList.toggle('on',open);}

function fillPlaque(item){
  const p=plaqueParts(item.plaque);
  vPlaque.textContent='';setPlaque(false);
  vInfo.hidden=!p;
  if(!p)return;
  const line=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;el.textContent=text;vPlaque.appendChild(el);return el;};
  if(p.title)line('p','vp-t',p.title);
  if(p.meta)line('p','vp-m',p.meta);
  if(p.note)line('p','vp-n',p.note);
  if(p.link){const a=line('a','vp-l','open ↗');a.href=p.link;if(/^https?:/.test(p.link)){a.target='_blank';a.rel='noopener';}}
}

/** Show items[i]. Returns the new piece element. */
function show(i){
  idx=(i+items.length)%items.length;
  const item=items[idx];
  vStage.textContent='';
  const el=pieceEl(item);vStage.appendChild(el);
  vCount.textContent=items.length>1?`${idx+1} / ${items.length}`:'';
  vPrev.hidden=vNext.hidden=items.length<2;
  fillPlaque(item);
  return el;
}

function step(d){if(!viewerOpen()||items.length<2)return;const el=show(idx+d);
  if(!reduce&&el.animate)el.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'});}

/* the piece grows from where it lay on the table (FLIP), the room fades in from black */
function openMotion(el,origin){
  if(reduce||!el.animate)return;
  viewer.animate([{opacity:0},{opacity:1}],{duration:280,easing:'ease-out'});
  const from=origin&&origin.getBoundingClientRect?origin.getBoundingClientRect():null;
  const run=()=>{const to=el.getBoundingClientRect();
    if(from&&from.width&&to.width){
      const dx=from.left+from.width/2-(to.left+to.width/2),dy=from.top+from.height/2-(to.top+to.height/2),s=Math.max(.05,Math.min(from.width/to.width,from.height/to.height));
      el.animate([{transform:`translate(${dx}px,${dy}px) scale(${s})`,opacity:.6},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});}
    else el.animate([{transform:'scale(.96)',opacity:0},{transform:'none',opacity:1}],{duration:320,easing:'cubic-bezier(.2,.8,.2,1)'});};
  /* an image needs its size before it can grow from the table; a canvas has one now */
  if(el.tagName==='IMG'&&!el.complete){el.style.opacity='0';const go=()=>{el.style.opacity='';run();};el.addEventListener('load',go,{once:true});el.addEventListener('error',go,{once:true});}
  else run();
}

/** Open the room on items[index] (each {src | fnArt | ph, alt?, plaque?}); origin is the element tapped. */
export function openViewer(list,index=0,origin=null){
  ensure();
  /* the older call shape, openViewer({item}), still works */
  if(!Array.isArray(list)){list=[list.item];index=0;}
  items=list.filter(Boolean);if(!items.length)return;
  if(!viewerOpen())lastFocus=document.activeElement;
  const el=show(index);
  viewer.hidden=false;document.documentElement.classList.add('ao-viewer-open');
  $('vClose').focus({preventScroll:true});
  openMotion(el,origin);
}
export function closeViewer(){if(!viewer||viewer.hidden)return;viewer.hidden=true;vStage.textContent='';setPlaque(false);document.documentElement.classList.remove('ao-viewer-open');if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true});}
export const viewerOpen=()=>!!viewer&&!viewer.hidden;

/* focus stays in the room while it's open */
function trap(e){
  const f=[...viewer.querySelectorAll('button,a[href]')].filter(b=>!b.hidden&&!b.closest('[hidden]')&&b.offsetParent!==null);
  if(!f.length)return;
  const first=f[0],last=f[f.length-1],a=document.activeElement;
  if(!viewer.contains(a)){e.preventDefault();first.focus();}
  else if(e.shiftKey&&a===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&a===last){e.preventDefault();first.focus();}
}
export function initViewer(){ensure();
  addEventListener('keydown',e=>{if(!viewerOpen())return;
    if(e.key==='Escape'){e.preventDefault();closeViewer();}
    else if(e.key==='ArrowRight'){e.preventDefault();step(1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}
    else if(e.key==='Tab')trap(e);});}
