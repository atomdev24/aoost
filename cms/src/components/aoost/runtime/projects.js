/* projects: the table of loose work (drag a piece, tap to zoom), the sticky note, the monkey keychain */
import { blockData, doodle, fit, PH, placeholderCanvas, reduce, rng, wrap } from './shared.js';
import { openViewer } from './viewer.js';
import { centreRange, clamp, rubber, turnedHalf } from './bounds.js';
import { clearLayout, pieceTransform, placeOf, separate } from './table.js';

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
  function addPiece(item){const el=document.createElement('div');el.className='piece'+(item.src&&STICKER_ART.has(item.src)?' stk':'');if(D.viewer===false){el.setAttribute('role','img');el.setAttribute('aria-label',item.alt||'Artwork');}else{el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',item.alt?'Open artwork: '+item.alt:'Open artwork');}
    const tape=document.createElement('span');tape.className='tape';el.appendChild(tape);
    const st={el,item,x:0,y:0,rot:0,a:1.25};
    if(item.src){const img=new Image();img.alt='';img.draggable=false;img.decoding='async';img.src=item.src;img.onload=()=>{st.a=img.naturalHeight/img.naturalWidth||1.25;layout(false);};el.appendChild(img);}
    else{el.appendChild(placeholderCanvas(item.ph,240));}
    table.appendChild(el);els.push(st);bindDrag(st);return st;}
  /* a piece's size on this screen (the editor's per-size "size" is a CSS scale) */
  const scaleOf=el=>{const v=getComputedStyle(el).scale;return v&&v!=='none'?(+v.split(' ')[0]||1):1;};
  /* the layout is shared with the editor's frames (table.js), so the editor shows the same table */
  function layout(animate){const W=table.clientWidth,n=els.length;if(!n)return;
    const L=clearLayout(W,els.map(s=>s.a),els.map(s=>scaleOf(s.el)),els.map(s=>placeOf(getComputedStyle(s.el))));table.style.height=L.H+'px';
    els.forEach((st,i)=>{const it=L.items[i];st.el.style.width=L.pw+'px';st.x=it.x;st.y=it.y;st.rot=it.rot;
      st.el.style.transition=animate&&!reduce?'transform .6s cubic-bezier(.2,.8,.2,1), box-shadow .2s':'box-shadow .2s';place(st);st.el.style.zIndex=i+1;});}
  /* put down on (or near) another piece: the others shift until every piece is clear */
  function makeRoom(st){const i=els.indexOf(st),W=table.clientWidth,H=table.clientHeight;
    const res=separate(els.map(s=>({x:s.x,y:s.y,rot:s.rot,w:s.el.offsetWidth,h:s.el.offsetHeight,s:scaleOf(s.el)})),W,H,{pinned:i});
    res.forEach((b,k)=>{if(k===i||!b.moved)return;const o=els[k];o.x=b.x;o.y=b.y;o.el.style.transition=reduce?'none':'transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .2s';place(o);});}
  /* the range a piece's centre may take so all of it (turned) stays on the table */
  function range(st,rot,w,h){w=w??st.el.offsetWidth;h=h??st.el.offsetHeight;const s=scaleOf(st.el),{hx,hy}=turnedHalf(w*s,h*s,rot);return{w,h,...centreRange(table.clientWidth,table.clientHeight,hx,hy)};}
  /* move a piece to the nearest spot where it's fully on the table; true if it had to move */
  function settle(st,w,h){const r=range(st,st.rot,w,h),cx=st.x+r.w/2,cy=st.y+r.h/2,nx=clamp(cx,r.x0,r.x1),ny=clamp(cy,r.y0,r.y1);st.x=nx-r.w/2;st.y=ny-r.h/2;return Math.hypot(nx-cx,ny-cy)>1;}
  /* A piece's size is a CSS scale, which would scale its translate too (pulling resized pieces toward
     the table's corner and making them trail the pointer); dividing by it keeps the piece's centre
     exactly where it's put. pieceTransform is shared with the editor. */
  function place(st){st.el.style.transform=pieceTransform(st.x,st.y,st.rot,scaleOf(st.el))+(st.el.classList.contains('lifted')?' scale(1.04)':'');}
  /* Picking things up. With a mouse or pen a piece lifts at once. On touch it waits for a press and hold
     (HOLD ms, a light buzz where the phone can), so a swipe that starts on a piece still scrolls the page;
     moving more than 10 px first gives the gesture back to the page. A quick tap is a tap. Once lifted,
     the page stays put until the piece is let go. */
  const HOLD=300;
  function pressDrag(el,h){let id=null,timer=0,held=false,sx=0,sy=0,lx=0,ly=0;
    const end=()=>{clearTimeout(timer);id=null;held=false;el.classList.remove('pressing');};
    el.addEventListener('pointerdown',e=>{if(id!==null||(h.busy&&h.busy())||e.button>0)return;id=e.pointerId;sx=lx=e.clientX;sy=ly=e.clientY;
      const go=()=>{held=true;el.classList.remove('pressing');try{el.setPointerCapture(id);}catch(_){}h.lift(sx,sy);if(lx!==sx||ly!==sy)h.drag(lx,ly);};
      if(e.pointerType==='touch'){el.classList.add('pressing');timer=setTimeout(()=>{go();try{navigator.vibrate&&navigator.vibrate(10);}catch(_){}},HOLD);}
      else{if(h.prevent)e.preventDefault();go();}});
    el.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;lx=e.clientX;ly=e.clientY;if(held)h.drag(lx,ly);else if(Math.hypot(lx-sx,ly-sy)>10)end();});
    el.addEventListener('pointerup',e=>{if(e.pointerId!==id)return;const was=held;end();if(was)h.drop();else if(h.tap)h.tap();});
    el.addEventListener('pointercancel',e=>{if(e.pointerId!==id)return;const was=held;end();if(was)(h.cancel||h.drop)();});
    el.addEventListener('touchmove',e=>{if(held&&e.cancelable)e.preventDefault();},{passive:false});
    el.addEventListener('contextmenu',e=>{if(id!==null||held)e.preventDefault();});
    return {active:()=>id!==null};}
  function bindDrag(st){const el=st.el;let sx,sy,ox,oy,moved=false,ghost=false;
    const lift=(x,y)=>{sx=x;sy=y;ox=st.x;oy=st.y;moved=false;el.style.zIndex=++z+10;el.style.transition='box-shadow .2s';el.classList.add('lifted');st.rot*=.4;place(st);};
    const drag=(x,y)=>{const dx=x-sx,dy=y-sy;if(Math.hypot(dx,dy)>6)moved=true;st.rot=Math.max(-10,Math.min(10,dx*.04));
      /* past an edge it drags with growing resistance */
      const r=range(st,st.rot);st.x=rubber(ox+dx+r.w/2,r.x0,r.x1)-r.w/2;st.y=rubber(oy+dy+r.h/2,r.y0,r.y1)-r.h/2;place(st);};
    /* let go off the edge: it springs back to where it's fully on the table */
    const drop=tap=>{el.classList.remove('lifted');st.rot=(Math.random()-.5)*8;const back=settle(st);
      el.style.transition=reduce?'none':back?'transform .55s cubic-bezier(.34,1.45,.5,1), box-shadow .2s':'transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .2s';place(st);if(tap&&!moved)open(st);else makeRoom(st);};
    const press=pressDrag(el,{lift,drag,drop:()=>drop(true),cancel:()=>{moved=true;drop(false);},tap:()=>open(st),busy:()=>ghost});
    /* a simulated visitor (phantoms.js) moving the piece: the same drag, never a tap; ignored while someone real holds it */
    el.addEventListener('ghostdrag',e=>{const d=e.detail||{};if(press.active())return;
      if(d.type==='down'){ghost=true;lift(d.x,d.y);moved=true;}
      else if(d.type==='move'&&ghost)drag(d.x,d.y);
      else if(d.type==='up'&&ghost){ghost=false;moved=true;drop(false);}});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(st);}});}
  /* the whole table is the room's sequence, starting from the piece tapped */
  function open(st){if(D.viewer===false)return;openViewer(els.map(s=>s.item),els.indexOf(st),st.el);}
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
    const put=(x,y)=>{cx=x;cy=y;const px=x/table.clientWidth*100+'%',py=y/table.clientHeight*100+'%';f.style.setProperty('--fx',px);f.style.setProperty('--fy',py);f.style.setProperty('--fxp',px);f.style.setProperty('--fyp',py);};
    const tilt=(d)=>f.style.setProperty('--fr',rot+d+'deg');
    pressDrag(f,{prevent:true,
      lift:(x,y)=>{sx=x;sy=y;[ocx,ocy]=centre();cx=ocx;cy=ocy;id=1;f.style.transition='filter .2s';f.classList.add('lifted');},
      drag:(x,y)=>{const dx=x-sx,dy=y-sy,r=lim();put(rubber(ocx+dx,r.x0,r.x1),rubber(ocy+dy,r.y0,r.y1));tilt(Math.max(-8,Math.min(8,dx*.03)));},
      drop:()=>{id=null;f.classList.remove('lifted');const r=lim(),nx=clamp(cx,r.x0,r.x1),ny=clamp(cy,r.y0,r.y1),back=Math.hypot(nx-cx,ny-cy)>1;
        f.style.transition=reduce?'none':back?'left .55s cubic-bezier(.34,1.45,.5,1), top .55s cubic-bezier(.34,1.45,.5,1), transform .4s, filter .2s':'transform .4s cubic-bezier(.2,.8,.2,1), filter .2s';put(nx,ny);tilt(0);}});
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
