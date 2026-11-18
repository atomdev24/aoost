/* projects: the table of loose work (drag a piece, tap to zoom), the sticky note, the monkey keychain */
import { blockData, doodle, fit, PH, placeholderCanvas, reduce, rng, wrap } from './shared.js';
import { openViewer } from './viewer.js';

export function initProjects(){
  const D=blockData('projects');if(!D)return;
  const list=(D.projects||[]).filter(p=>p&&p.image&&!p.hidden);
  const STICKER_ART=new Set(list.filter(p=>p.sticker).map(p=>p.image));
  const ARTWORK=list.map(p=>p.image);
  const META=new Map(list.map(p=>[p.image,p]));
  const SITE_NOTES=[(D.note||{}).image||null];

  /* ---------- sticky notes on the page ---------- */
  document.querySelectorAll('.ao .sticky[data-note]').forEach(el=>{const i=+el.dataset.note,src=SITE_NOTES[i];
    if(src){const img=new Image();img.alt='';img.src=src;el.style.background='transparent';el.appendChild(img);return;}
    if(el.dataset.noteStyle==='plain')return; /* plain: the neon note with nothing drawn on it */
    const cv=document.createElement('canvas');el.appendChild(cv);new ResizeObserver(()=>{const[c,w,h]=fit(cv);c.clearRect(0,0,w,h);doodle(c,w,h,i?'bolt':'eye',9+i);}).observe(cv);});

  /* ---------- projects table ---------- */
  const table=document.getElementById('table');if(!table)return;
  table.innerHTML='';table.classList.remove('ao-static');
  let z=1,els=[];
  function addPiece(item){const el=document.createElement('div');el.className='piece'+(item.src&&STICKER_ART.has(item.src)?' stk':'');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',item.alt?'Open artwork: '+item.alt:'Open artwork');
    const tape=document.createElement('span');tape.className='tape';el.appendChild(tape);
    const st={el,item,x:0,y:0,rot:0,a:1.25};
    if(item.src){const img=new Image();img.alt='';img.draggable=false;img.decoding='async';img.src=item.src;img.onload=()=>{st.a=img.naturalHeight/img.naturalWidth||1.25;layout(false);};el.appendChild(img);}
    else{el.appendChild(placeholderCanvas(item.ph,240));}
    table.appendChild(el);els.push(st);bindDrag(st);return st;}
  function layout(animate){const W=table.clientWidth,n=els.length;if(!n)return;
    const cols=W<560?(n<=2?1:n<=6?2:n<=12?3:4):(n<=4?n:n<=8?4:n<=15?5:6);
    const cellW=W/cols, pw=Math.min(240,cellW*(n<=2?.7:.84)), rows=Math.ceil(n/cols);
    const rowH=els.reduce((m,s)=>Math.max(m,pw*s.a+12),0)*0.86;
    const H=Math.max(W<560?Math.min(640,W*1.2):600, rows*rowH+60); table.style.height=H+'px';
    const r=rng(7+n);
    els.forEach((st,i)=>{const col=i%cols,row=Math.floor(i/cols),ph=pw*st.a+12;st.el.style.width=pw+'px';
      const cx=col*cellW+(cellW-pw)/2,cy=24+row*((H-48-ph)/Math.max(1,rows-1||1));
      st.x=Math.max(6,Math.min(W-pw-6,cx+(r()-.5)*cellW*.18));st.y=Math.max(14,Math.min(H-ph-6,(rows===1?(H-ph)/2:cy)+(r()-.5)*28));st.rot=(r()-.5)*12;
      st.el.style.transition=animate&&!reduce?'transform .6s cubic-bezier(.2,.8,.2,1), box-shadow .2s':'box-shadow .2s';place(st);st.el.style.zIndex=i+1;});}
  function place(st){st.el.style.transform=`translate(${st.x}px,${st.y}px) rotate(${st.rot}deg)`+(st.el.classList.contains('lifted')?' scale(1.04)':'');}
  function bindDrag(st){const el=st.el;let sx,sy,ox,oy,moved=false,id=null;
    el.addEventListener('pointerdown',e=>{id=e.pointerId;el.setPointerCapture(id);sx=e.clientX;sy=e.clientY;ox=st.x;oy=st.y;moved=false;el.style.zIndex=++z+10;el.style.transition='box-shadow .2s';el.classList.add('lifted');st.rot*=.4;place(st);});
    el.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.hypot(dx,dy)>6)moved=true;const W=table.clientWidth,H=table.clientHeight;st.x=Math.max(-el.offsetWidth*.3,Math.min(W-el.offsetWidth*.7,ox+dx));st.y=Math.max(-20,Math.min(H-el.offsetHeight*.6,oy+dy));st.rot=Math.max(-10,Math.min(10,dx*.04));place(st);});
    const up=e=>{if(e.pointerId!==id)return;id=null;el.classList.remove('lifted');st.rot=(Math.random()-.5)*8;el.style.transition=reduce?'none':'transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .2s';place(st);if(!moved)openViewer(st);};
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',e=>{moved=true;up(e);});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openViewer(st);}});}
  /* a piece carries its project's details, so the viewer can caption it */
  const itemOf=src=>{const p=META.get(src)||{};return {src,alt:p.title||'',caption:p};};
  (ARTWORK.length?ARTWORK.map(itemOf):PH.map(ph=>({ph}))).forEach(addPiece);
  requestAnimationFrame(()=>layout(false));
  let lastTW=table.clientWidth;new ResizeObserver(()=>{if(Math.abs(table.clientWidth-lastTW)>40){lastTW=table.clientWidth;layout(false);}}).observe(table);
  /* preview your own files: open the page with #edit */
  const addIn=document.getElementById('addArt');
  if(addIn){function syncEdit(){wrap.classList.toggle('editing',location.hash==='#edit');}addEventListener('hashchange',syncEdit);syncEdit();
    addIn.addEventListener('change',()=>{const files=[...addIn.files];if(!files.length)return;if(!ARTWORK.length&&els.every(s=>!s.item.src)){els.forEach(s=>s.el.remove());els=[];}
      files.forEach(f=>addPiece({src:URL.createObjectURL(f)}));layout(true);addIn.value='';});}

  /* monkey keychain: give it a swing */
  const k=document.getElementById('keychain');
  if(k){k.addEventListener('click',()=>{k.classList.remove('kick');void k.offsetWidth;k.classList.add('kick');});k.addEventListener('animationend',e=>{if(e.animationName==='kc-kick')k.classList.remove('kick');});}
}
