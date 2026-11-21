/* projects: the table of loose work (drag a piece, tap to zoom), the sticky note, the monkey keychain */
import { blockData, doodle, fit, PH, placeholderCanvas, reduce, rng, wrap } from './shared.js';
import { openViewer } from './viewer.js';
import { centreRange, clamp, rubber, turnedHalf } from './bounds.js';
import { clearLayout, separate } from './table.js';

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
  /* a piece's size on this screen (the editor's per-size "size" is a CSS scale) */
  const scaleOf=el=>{const v=getComputedStyle(el).scale;return v&&v!=='none'?(+v.split(' ')[0]||1):1;};
  /* the layout is shared with the editor's frames (table.js), so the editor shows the same table */
  function layout(animate){const W=table.clientWidth,n=els.length;if(!n)return;
    const L=clearLayout(W,els.map(s=>s.a),els.map(s=>scaleOf(s.el)));table.style.height=L.H+'px';
    els.forEach((st,i)=>{const it=L.items[i];st.el.style.width=L.pw+'px';st.x=it.x;st.y=it.y;st.rot=it.rot;
      st.el.style.transition=animate&&!reduce?'transform .6s cubic-bezier(.2,.8,.2,1), box-shadow .2s':'box-shadow .2s';place(st);st.el.style.zIndex=i+1;});}
  /* put down on (or near) another piece: the others shift until every piece is clear */
  function makeRoom(st){const i=els.indexOf(st),W=table.clientWidth,H=table.clientHeight;
    const res=separate(els.map(s=>({x:s.x,y:s.y,rot:s.rot,w:s.el.offsetWidth,h:s.el.offsetHeight,s:scaleOf(s.el)})),W,H,{pinned:i});
    res.forEach((b,k)=>{if(k===i||!b.moved)return;const o=els[k];o.x=b.x;o.y=b.y;o.el.style.transition=reduce?'none':'transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .2s';place(o);});}
  /* the range a piece's centre may take so all of it (turned) stays on the table */
  function range(st,rot,w,h){w=w??st.el.offsetWidth;h=h??st.el.offsetHeight;const{hx,hy}=turnedHalf(w,h,rot);return{w,h,...centreRange(table.clientWidth,table.clientHeight,hx,hy)};}
  /* move a piece to the nearest spot where it's fully on the table; true if it had to move */
  function settle(st,w,h){const r=range(st,st.rot,w,h),cx=st.x+r.w/2,cy=st.y+r.h/2,nx=clamp(cx,r.x0,r.x1),ny=clamp(cy,r.y0,r.y1);st.x=nx-r.w/2;st.y=ny-r.h/2;return Math.hypot(nx-cx,ny-cy)>1;}
  function place(st){st.el.style.transform=`translate(${st.x}px,${st.y}px) rotate(${st.rot}deg)`+(st.el.classList.contains('lifted')?' scale(1.04)':'');}
  function bindDrag(st){const el=st.el;let sx,sy,ox,oy,moved=false,id=null;
    el.addEventListener('pointerdown',e=>{id=e.pointerId;el.setPointerCapture(id);sx=e.clientX;sy=e.clientY;ox=st.x;oy=st.y;moved=false;el.style.zIndex=++z+10;el.style.transition='box-shadow .2s';el.classList.add('lifted');st.rot*=.4;place(st);});
    el.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.hypot(dx,dy)>6)moved=true;st.rot=Math.max(-10,Math.min(10,dx*.04));
      /* past an edge it drags with growing resistance */
      const r=range(st,st.rot);st.x=rubber(ox+dx+r.w/2,r.x0,r.x1)-r.w/2;st.y=rubber(oy+dy+r.h/2,r.y0,r.y1)-r.h/2;place(st);});
    const up=e=>{if(e.pointerId!==id)return;id=null;el.classList.remove('lifted');st.rot=(Math.random()-.5)*8;
      /* let go off the edge: it springs back to where it's fully on the table */
      const back=settle(st);el.style.transition=reduce?'none':back?'transform .55s cubic-bezier(.34,1.45,.5,1), box-shadow .2s':'transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .2s';place(st);if(moved)makeRoom(st);else open(st);};
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',e=>{moved=true;up(e);});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(st);}});}
  /* the whole table is the room's sequence, starting from the piece tapped */
  function open(st){openViewer(els.map(s=>s.item),els.indexOf(st),st.el);}
  /* a piece carries its project's plaque (title, medium, year, note, link); the viewer shows it only if there's text */
  const itemOf=src=>{const p=META.get(src)||{};return {src,alt:p.title||'',plaque:{title:p.title,medium:p.medium,year:p.year,note:p.note,link:p.link}};};
  (ARTWORK.length?ARTWORK.map(itemOf):PH.map(ph=>({ph}))).forEach(addPiece);
  requestAnimationFrame(()=>layout(false));
  let lastTW=table.clientWidth;new ResizeObserver(()=>{if(Math.abs(table.clientWidth-lastTW)>40){lastTW=table.clientWidth;layout(false);}}).observe(table);

  /* ---------- fixtures: objects on top of everything (the metal clover). Pick one up and move it; it stays on top ---------- */
  const wrapEl=table.parentElement;
  wrapEl.querySelectorAll('.fixture').forEach(f=>{
    let id=null,sx,sy,ocx,ocy,cx,cy;
    const rot=parseFloat(getComputedStyle(f).getPropertyValue('--fr'))||0;
    /* the clover's body, not its transparent margin and shadow, is what must stay on the table */
    const lim=()=>{const W=table.clientWidth,H=table.clientHeight;return centreRange(W,H,f.offsetWidth*.27,f.offsetHeight*.3,4);};
    const centre=()=>{const a=f.getBoundingClientRect(),b=wrapEl.getBoundingClientRect();return[a.left+a.width/2-b.left,a.top+a.height/2-b.top];};
    const put=(x,y)=>{cx=x;cy=y;f.style.setProperty('--fx',x/table.clientWidth*100+'%');f.style.setProperty('--fy',y/table.clientHeight*100+'%');};
    const tilt=(d)=>f.style.setProperty('--fr',rot+d+'deg');
    f.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;f.setPointerCapture(id);sx=e.clientX;sy=e.clientY;[ocx,ocy]=centre();cx=ocx;cy=ocy;f.style.transition='filter .2s';f.classList.add('lifted');});
    f.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;const dx=e.clientX-sx,dy=e.clientY-sy,r=lim();put(rubber(ocx+dx,r.x0,r.x1),rubber(ocy+dy,r.y0,r.y1));tilt(Math.max(-8,Math.min(8,dx*.03)));});
    const up=e=>{if(e.pointerId!==id)return;id=null;f.classList.remove('lifted');const r=lim(),nx=clamp(cx,r.x0,r.x1),ny=clamp(cy,r.y0,r.y1),back=Math.hypot(nx-cx,ny-cy)>1;
      f.style.transition=reduce?'none':back?'left .55s cubic-bezier(.34,1.45,.5,1), top .55s cubic-bezier(.34,1.45,.5,1), transform .4s, filter .2s':'transform .4s cubic-bezier(.2,.8,.2,1), filter .2s';put(nx,ny);tilt(0);};
    f.addEventListener('pointerup',up);f.addEventListener('pointercancel',up);
    /* a narrower screen: keep it on the table */
    new ResizeObserver(()=>{if(id!==null)return;const[x,y]=centre(),r=lim();f.style.transition='none';put(clamp(x,r.x0,r.x1),clamp(y,r.y0,r.y1));}).observe(table);
  });
  /* preview your own files: open the page with #edit */
  const addIn=document.getElementById('addArt');
  if(addIn){function syncEdit(){wrap.classList.toggle('editing',location.hash==='#edit');}addEventListener('hashchange',syncEdit);syncEdit();
    addIn.addEventListener('change',()=>{const files=[...addIn.files];if(!files.length)return;if(!ARTWORK.length&&els.every(s=>!s.item.src)){els.forEach(s=>s.el.remove());els=[];}
      files.forEach(f=>addPiece({src:URL.createObjectURL(f)}));layout(true);addIn.value='';});}

  /* monkey keychain: give it a swing */
  const k=document.getElementById('keychain');
  if(k){k.addEventListener('click',()=>{k.classList.remove('kick');void k.offsetWidth;k.classList.add('kick');});k.addEventListener('animationend',e=>{if(e.animationName==='kc-kick')k.classList.remove('kick');});}
}
