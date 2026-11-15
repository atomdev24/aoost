/* zoom viewer — the lightbox the projects table and the reel open artwork in */
import { overlays, placeholderCanvas } from './shared.js';

let viewer=null,vStage=null,lastFocus=null;
function ensure(){
  if(viewer)return;
  viewer=document.getElementById('viewer');
  if(!viewer){ /* no AoostViewer block on the page: make the same markup */
    viewer=document.createElement('div');viewer.className='viewer';viewer.id='viewer';viewer.hidden=true;viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','Artwork');
    viewer.innerHTML='<div class="vbar"><button class="btn vclose" id="vClose">close</button></div><div class="stage" id="vStage"></div>';}
  /* it sits above everything, outside the sections (their focus effect would otherwise trap it) */
  overlays().appendChild(viewer);
  vStage=viewer.querySelector('#vStage');
  viewer.querySelector('#vClose').addEventListener('click',closeViewer);viewer.addEventListener('click',e=>{if(e.target===viewer||e.target===vStage)closeViewer();});
}
export function openViewer(st){ensure();lastFocus=document.activeElement;vStage.innerHTML='';
  if(st.item.src){const img=new Image();img.alt=st.item.alt||'Artwork';img.src=st.item.src;vStage.appendChild(img);}
  else if(st.item.fnArt){const cv=document.createElement('canvas');cv.width=800;cv.height=1000;st.item.fnArt(cv.getContext('2d'),800,1000);vStage.appendChild(cv);}
  else{vStage.appendChild(placeholderCanvas(st.item.ph,1000));}
  /* a project with details (title, year, medium, tags, link) gets a caption; with none the viewer is the image alone, as before */
  const p=st.item.caption||{},bits=[p.title,p.year,p.medium].filter(Boolean),tags=(p.tags||[]).filter(Boolean);
  if(bits.length||tags.length||p.link){const cap=document.createElement('p');cap.className='vcap';cap.textContent=bits.concat(tags.map(t=>'#'+t)).join(' · ');
    if(p.link&&/^(https?:\/\/|\/)/.test(p.link)){const a=document.createElement('a');a.href=p.link;a.textContent='open ↗';if(/^https?:/.test(p.link)){a.target='_blank';a.rel='noopener';}if(cap.textContent)cap.append(' · ');cap.append(a);}
    vStage.appendChild(cap);}
  viewer.hidden=false;viewer.querySelector('#vClose').focus();}
export function closeViewer(){if(!viewer)return;viewer.hidden=true;vStage.innerHTML='';if(lastFocus)lastFocus.focus();}
export const viewerOpen=()=>!!viewer&&!viewer.hidden;
export function initViewer(){ensure();
  /* Escape closes it (on the original page this key lived with the wall's shortcuts) */
  addEventListener('keydown',e=>{if(e.key==='Escape'&&viewerOpen())closeViewer();});}
