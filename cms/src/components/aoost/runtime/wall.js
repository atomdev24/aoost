/* THE WALL — pocket Photoshop.
   Ported from the original page. The paint, sticky-note and background colours come from the
   block's fields; everything else is the original script. */
import { blockData, C as BASE, IN_CLAUDE, paintNote, rng } from './shared.js';

export function initWall(){
const D=blockData('wall');if(!D)return;
const PAINT_F=(D.paint&&D.paint.length?D.paint:[{name:'Black',color:'#141516'}]),NOTE_F=(D.noteColors&&D.noteColors.length?D.noteColors:[{name:'Yellow',color:'#F2E36B'}]),BG_F=(D.backgrounds&&D.backgrounds.length?D.backgrounds:[{name:'White',color:'#FFFFFF'}]);
/* the palette, by key: p0, p1… are paints, n0, n1… sticky-note colours */
const C=Object.assign({},BASE);PAINT_F.forEach((p,i)=>C['p'+i]=p.color);NOTE_F.forEach((p,i)=>C['n'+i]=p.color);
/* ============================================================
   THE WALL — pocket Photoshop
   ============================================================ */
const OUT_W=1080,OUT_H=1350,NOTE_W=OUT_W*.24;
const ps=document.getElementById('ps');if(!ps)return;const board=document.getElementById('board'),bgC=document.getElementById('bg'),paintC=document.getElementById('paint'),stkLayer=document.getElementById('stkLayer');
bgC.width=paintC.width=OUT_W;bgC.height=paintC.height=OUT_H;const bctx=bgC.getContext('2d'),pctx=paintC.getContext('2d');
const live=document.createElement('canvas');live.width=OUT_W;live.height=OUT_H;const lctx=live.getContext('2d');
const PAINT=PAINT_F.map((p,i)=>['p'+i,p.name]);
const NOTECOLS=NOTE_F.map((p,i)=>['n'+i,p.name]);
const BG_COLORS=BG_F.map(p=>[String(p.color).toUpperCase(),p.name]);
const TOOLS={move:'Move',brush:'Brush',spray:'Spray can',marker:'Marker',eraser:'Eraser',note:'Sticky note'};
let tool='brush',color='p0',noteCol='n0',size=18,opacity=1,strokes=[],cur=null,base=null,bgColor=(BG_COLORS[0]||['#FFFFFF'])[0],notes=[],selNote=null,vis={bg:true,notes:true,paint:true};
const toastEl=document.getElementById('toast');let tt;const toast=t=>{toastEl.textContent=t;toastEl.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>toastEl.classList.remove('show'),1800);};

/* background: a plain colour, white by default */
function drawBg(){bctx.fillStyle=bgColor;bctx.fillRect(0,0,OUT_W,OUT_H);}
const bgTray=document.getElementById('bgTray'),imageMenu=document.getElementById('imageMenu'),bgPick=document.getElementById('bgPick'),bgHex=document.getElementById('bgHex');
const pickWrap=bgPick.parentElement;
BG_COLORS.forEach(([hex,name])=>{const btn=document.createElement('button');btn.dataset.hex=hex;btn.style.setProperty('--c',hex);btn.setAttribute('aria-label',name+' background');btn.setAttribute('aria-pressed',hex===bgColor);btn.addEventListener('click',()=>setBg(hex));bgTray.insertBefore(btn,pickWrap);
  const li=document.createElement('li');li.innerHTML=`<button role="menuitemradio" aria-checked="${hex===bgColor}" data-bg="${hex}">${name}<span>${hex}</span></button>`;imageMenu.appendChild(li);});
imageMenu.insertAdjacentHTML('beforeend','<li><hr></li><li><button data-act="pickbg">Custom colour…<span></span></button></li><li><button data-act="togglebg">Hide background<span></span></button></li>');
function setBg(hex){bgColor=hex.toUpperCase();vis.bg=true;bgC.style.visibility='';drawBg();renderLayers();bgHex.textContent=bgColor;
  let preset=false;bgTray.querySelectorAll('button').forEach(x=>{const on=x.dataset.hex===bgColor;if(on)preset=true;x.setAttribute('aria-pressed',on);});pickWrap.classList.toggle('on',!preset);
  imageMenu.querySelectorAll('[data-bg]').forEach(x=>x.setAttribute('aria-checked',x.dataset.bg===bgColor));}
bgPick.addEventListener('input',()=>setBg(bgPick.value));
drawBg();

/* tool + options */
const curTool=document.getElementById('curTool');
function setTool(t){tool=t;board.classList.toggle('move',t==='move');board.classList.toggle('note',t==='note');
  document.querySelectorAll('.tool[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));
  const src=document.querySelector(`.tool[data-tool="${t}"] svg`);curTool.innerHTML=(src?src.outerHTML:'')+TOOLS[t];
  document.getElementById('optSize').hidden=!['brush','spray','marker','eraser'].includes(t);document.getElementById('optOp').hidden=!['brush','spray','marker'].includes(t);document.getElementById('optNote').hidden=t!=='note';
  if(t!=='move')selectNote(null);}
document.querySelectorAll('.tool[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
const sizeIn=document.getElementById('size'),opIn=document.getElementById('op');
sizeIn.addEventListener('input',()=>{size=+sizeIn.value;document.getElementById('sizeOut').textContent=size+' px';});
opIn.addEventListener('input',()=>{opacity=+opIn.value/100;document.getElementById('opOut').textContent=opIn.value+'%';});
const pal=document.getElementById('palette'),fgBtn=document.getElementById('fgBtn');
function setColor(k){color=k;fgBtn.style.setProperty('--fg',C[k]);pal.querySelectorAll('.sw').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===k));if(tool==='eraser'||tool==='move'||tool==='note')setTool('brush');}
PAINT.forEach(([k,l])=>{const b=document.createElement('button');b.className='sw';b.dataset.k=k;b.style.setProperty('--c',C[k]);b.setAttribute('aria-label',l+' paint');b.addEventListener('click',()=>setColor(k));pal.appendChild(b);});
fgBtn.addEventListener('click',()=>{const i=PAINT.findIndex(p=>p[0]===color);setColor(PAINT[(i+1)%PAINT.length][0]);});
color='p0';fgBtn.style.setProperty('--fg',C.p0);pal.querySelector('.sw').setAttribute('aria-pressed','true');
const nc=document.getElementById('noteCols');NOTECOLS.forEach(([k,l])=>{const b=document.createElement('button');b.style.setProperty('--c',C[k]);b.setAttribute('aria-label',l+' note');b.setAttribute('aria-pressed',k===noteCol);b.addEventListener('click',()=>{noteCol=k;nc.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));});nc.appendChild(b);});
setTool('brush');
function zoomTxt(){document.getElementById('zoomTxt').textContent=`@ ${Math.round(board.clientWidth/OUT_W*100)}% (RGB/8)`;}
new ResizeObserver(()=>{zoomTxt();notes.forEach(placeNote);}).observe(board);

/* painting: each stroke draws opaque on `live`, then lands on the paint layer at its opacity */
function toOut(e){const r=paintC.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*OUT_W,y:(e.clientY-r.top)/r.height*OUT_H,t:performance.now()};}
function sprayAt(ctx,s,i){const p=s.pts[i],r=rng(s.seed+i*7919),R=s.size*2.2,n=Math.round(10+s.size*.9);ctx.fillStyle=C[s.color];
  for(let k=0;k<n;k++){const a=r()*Math.PI*2,d=Math.pow(r(),.6)*R;ctx.globalAlpha=.35+r()*.5;ctx.fillRect(p.x+Math.cos(a)*d,p.y+Math.sin(a)*d,1.6+r()*1.8,1.6+r()*1.8);}ctx.globalAlpha=1;
  if(r()<.012*s.size/16&&i>2){ctx.fillRect(p.x-1.5,p.y,3,s.size*(2+r()*4));}}
function brushSeg(ctx,s,i){const a=s.pts[i-1],b=s.pts[i],v=Math.hypot(b.x-a.x,b.y-a.y)/Math.max(1,b.t-a.t);ctx.strokeStyle=C[s.color];ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(s.size*.4,s.size*(1.2-v*.06));ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
function pathOf(ctx,s){const p=s.pts;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length-1;i++)ctx.quadraticCurveTo(p[i].x,p[i].y,(p[i].x+p[i+1].x)/2,(p[i].y+p[i+1].y)/2);const l=p[p.length-1];ctx.lineTo(l.x+.01,l.y);}
function strokeOpaque(ctx,s){
  if(s.tool==='spray'){for(let i=0;i<s.pts.length;i++)sprayAt(ctx,s,i);return;}
  if(s.tool==='brush'){ctx.fillStyle=C[s.color];ctx.beginPath();ctx.arc(s.pts[0].x,s.pts[0].y,s.size*.55,0,7);ctx.fill();for(let i=1;i<s.pts.length;i++)brushSeg(ctx,s,i);return;}
  ctx.strokeStyle=s.tool==='eraser'?'#000':C[s.color];ctx.lineWidth=s.tool==='marker'?s.size*1.6:s.size*2;ctx.lineCap=s.tool==='marker'?'square':'round';ctx.lineJoin=s.tool==='marker'?'miter':'round';pathOf(ctx,s);ctx.stroke();}
function commit(ctx,s){lctx.clearRect(0,0,OUT_W,OUT_H);strokeOpaque(lctx,s);ctx.save();if(s.tool==='eraser')ctx.globalCompositeOperation='destination-out';else ctx.globalAlpha=s.op*(s.tool==='marker'?.6:1);ctx.drawImage(live,0,0);ctx.restore();}
function redrawPaint(){pctx.clearRect(0,0,OUT_W,OUT_H);strokes.forEach(s=>commit(pctx,s));renderLayers();}
function showLive(){pctx.clearRect(0,0,OUT_W,OUT_H);pctx.drawImage(base,0,0);commit(pctx,cur);}
paintC.addEventListener('pointerdown',e=>{if(!['brush','spray','marker','eraser'].includes(tool))return;if(!vis.paint){vis.paint=true;paintC.style.visibility='';}
  paintC.setPointerCapture(e.pointerId);cur={tool,color,size,op:opacity,seed:(Math.random()*1e9)|0,pts:[toOut(e)]};
  base=document.createElement('canvas');base.width=OUT_W;base.height=OUT_H;base.getContext('2d').drawImage(paintC,0,0);showLive();});
let raf=0;paintC.addEventListener('pointermove',e=>{const p0=toOut(e);document.getElementById('xy').textContent=`x ${Math.round(p0.x)} y ${Math.round(p0.y)}`;if(!cur)return;
  (e.getCoalescedEvents?e.getCoalescedEvents():[e]).forEach(ev=>{const p=toOut(ev),l=cur.pts[cur.pts.length-1];if(Math.hypot(p.x-l.x,p.y-l.y)>=1.5)cur.pts.push(p);});
  if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(cur)showLive();});});
const endStroke=()=>{if(!cur)return;cancelAnimationFrame(raf);raf=0;showLive();strokes.push(cur);cur=null;base=null;renderLayers();};
paintC.addEventListener('pointerup',endStroke);paintC.addEventListener('pointercancel',endStroke);
function undo(){if(!strokes.length){toast('Nothing to undo');return;}strokes.pop();redrawPaint();toast('Undo stroke');}

/* sticky notes on the wall (blank — draw or write on them) */
function placeNote(n){const k=board.clientWidth/OUT_W;n.el.style.transform=`translate(${n.x*k}px,${n.y*k}px) rotate(${n.rot}deg)`;}
function selectNote(n){selNote=n;notes.forEach(x=>x.el.classList.toggle('sel',x===n));}
function addNote(x,y){const el=document.createElement('div');el.className='stk';const cv=document.createElement('canvas');cv.width=300;cv.height=300;paintNote(cv.getContext('2d'),300,300,C[noteCol]);el.appendChild(cv);stkLayer.appendChild(el);
  const n={el,cv,col:noteCol,x:(x??OUT_W*(.38+Math.random()*.1))-NOTE_W/2,y:(y??OUT_H*(.4+Math.random()*.1))-NOTE_W/2,rot:(Math.random()-.5)*12};notes.push(n);placeNote(n);vis.notes=true;stkLayer.style.visibility='';
  let sx,sy,ox,oy,id=null;
  el.addEventListener('pointerdown',e=>{if(tool!=='move')return;id=e.pointerId;el.setPointerCapture(id);sx=e.clientX;sy=e.clientY;ox=n.x;oy=n.y;selectNote(n);stkLayer.appendChild(el);notes.push(notes.splice(notes.indexOf(n),1)[0]);e.stopPropagation();});
  el.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;const k=OUT_W/board.clientWidth;n.x=Math.max(-NOTE_W*.5,Math.min(OUT_W-NOTE_W*.5,ox+(e.clientX-sx)*k));n.y=Math.max(-NOTE_W*.5,Math.min(OUT_H-NOTE_W*.5,oy+(e.clientY-sy)*k));placeNote(n);document.getElementById('xy').textContent=`x ${Math.round(n.x)} y ${Math.round(n.y)}`;});
  const up=()=>{id=null;};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);renderLayers();return n;}
function delNote(){if(!selNote){toast('Select a note with the Move tool');return;}selNote.el.remove();notes.splice(notes.indexOf(selNote),1);selNote=null;renderLayers();toast('Note deleted');}
board.addEventListener('pointerdown',e=>{if(tool==='note'){const r=board.getBoundingClientRect(),k=OUT_W/r.width;addNote((e.clientX-r.left)*k,(e.clientY-r.top)*k);toast('Note added. Draw on it, or V to move it');}
  else if(tool==='move'&&!e.target.closest('.stk'))selectNote(null);});

/* layers panel */
const eye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeOff='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4"/><path d="M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/></svg>';
const layersEl=document.getElementById('layers');
function renderLayers(){const rows=[{k:'paint',nm:'Paint',ct:strokes.length+(strokes.length===1?' stroke':' strokes'),th:c=>{c.fillStyle='#fff';c.fillRect(0,0,68,52);c.drawImage(paintC,0,0,68,52);}},
  {k:'notes',nm:'Sticky notes',ct:String(notes.length),th:c=>{c.fillStyle='#fff';c.fillRect(0,0,68,52);c.fillStyle=C.n0;c.fillRect(22,12,24,24);}},
  {k:'bg',nm:'Background',ct:'locked',th:c=>{c.drawImage(bgC,0,0,68,52);}}];
  layersEl.innerHTML='';rows.forEach(r=>{const li=document.createElement('li');if((r.k==='paint'&&['brush','spray','marker','eraser'].includes(tool))||(r.k==='notes'&&(tool==='note'||tool==='move')))li.className='cur';
    li.innerHTML=`<button class="eye" aria-pressed="${vis[r.k]}" aria-label="Show or hide ${r.nm}">${vis[r.k]?eye:eyeOff}</button><span class="th"><canvas width="68" height="52"></canvas></span><span class="nm">${r.nm}</span><span class="ct">${r.ct}</span>`;
    r.th(li.querySelector('canvas').getContext('2d'));li.querySelector('.eye').addEventListener('click',()=>toggleVis(r.k));layersEl.appendChild(li);});}
function toggleVis(k){vis[k]=!vis[k];({bg:bgC,notes:stkLayer,paint:paintC})[k].style.visibility=vis[k]?'':'hidden';renderLayers();}
renderLayers();

/* menus */
const menus=[...ps.querySelectorAll('.menu')];
function closeMenus(){menus.forEach(m=>{m.querySelector('ul').hidden=true;m.firstElementChild.setAttribute('aria-expanded','false');});}
menus.forEach(m=>{const b=m.firstElementChild,ul=m.querySelector('ul');b.addEventListener('click',e=>{e.stopPropagation();const open=ul.hidden;closeMenus();ul.hidden=!open;b.setAttribute('aria-expanded',open);if(open){const f=ul.querySelector('button');f&&f.focus();}});});
document.addEventListener('click',e=>{if(!e.target.closest('.menu'))closeMenus();});
ps.addEventListener('click',e=>{const b=e.target.closest('.menu li button');if(!b)return;closeMenus();
  if(b.dataset.bg){setBg(b.dataset.bg);return;}if(b.dataset.act==='pickbg'){bgPick.click();return;}
  ({new:()=>{strokes=[];notes.forEach(n=>n.el.remove());notes=[];selNote=null;redrawPaint();toast('New wall');},save:exportPng,undo,clearpaint:()=>{strokes=[];redrawPaint();toast('Paint layer cleared');},
    addnote:()=>{addNote();setTool('move');toast('Note added');},delnote:delNote,togglebg:()=>toggleVis('bg')})[b.dataset.act]?.();});
addEventListener('keydown',e=>{if(e.target.closest('input,textarea'))return;const k=e.key.toLowerCase(),r=board.getBoundingClientRect(),inView=r.top<innerHeight&&r.bottom>0;if(!inView)return;
  if((e.metaKey||e.ctrlKey)&&k==='z'){e.preventDefault();undo();return;}if((e.metaKey||e.ctrlKey)&&k==='s'){e.preventDefault();exportPng();return;}if(e.metaKey||e.ctrlKey)return;
  const t={v:'move',b:'brush',s:'spray',m:'marker',e:'eraser',n:'note'}[k];if(t){setTool(t);return;}
  if((k==='backspace'||k==='delete')&&selNote){e.preventDefault();delNote();}if(k==='escape'){closeMenus();}
  if(k==='['){sizeIn.value=Math.max(2,size-4);sizeIn.dispatchEvent(new Event('input'));}if(k===']'){sizeIn.value=Math.min(120,size+4);sizeIn.dispatchEvent(new Event('input'));}});

/* export: background + notes + paint at 1080 × 1350 */
function compose(){const out=document.createElement('canvas');out.width=OUT_W;out.height=OUT_H;const o=out.getContext('2d');o.fillStyle='#fff';o.fillRect(0,0,OUT_W,OUT_H);if(vis.bg)o.drawImage(bgC,0,0);
  if(vis.notes)notes.forEach(n=>{o.save();o.translate(n.x+NOTE_W/2,n.y+NOTE_W/2);o.rotate(n.rot*Math.PI/180);o.shadowColor='rgba(20,21,22,.3)';o.shadowBlur=18;o.shadowOffsetY=8;o.drawImage(n.cv,-NOTE_W/2,-NOTE_W/2,NOTE_W,NOTE_W);o.restore();});
  if(vis.paint)o.drawImage(paintC,0,0);o.font='500 22px "JetBrains Mono", monospace';o.fillStyle='rgba(20,21,22,.5)';o.textAlign='right';o.fillText('aoost · the wall',OUT_W-28,OUT_H-28);return out;}
const saveBtn=document.getElementById('save');let downloads=null;
if(IN_CLAUDE&&window.claude.use){window.claude.use('downloads').then(d=>{downloads=d;}).catch(()=>{});}
function exportPng(){const name=`aoost-wall-${new Date().toISOString().slice(0,10)}.png`;
  compose().toBlob(async blob=>{if(!blob){toast('Could not make the image. Try again');return;}
    if(IN_CLAUDE){if(!downloads){toast('Export is not available in this view');return;}
      try{await downloads.save({filename:name,data:blob});toast('Exported '+name);}catch(err){toast(err&&err.code==='declined'?'Export cancelled':err&&err.code==='rate_limited'?'One moment, then try again':'Export is not available here');}return;}
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast('Exported '+name);},'image/png');}
saveBtn.addEventListener('click',exportPng);
}
