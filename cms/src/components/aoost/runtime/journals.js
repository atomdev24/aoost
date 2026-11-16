/* journals: A6 books on the mat, opened in a 3D viewer.
   Ported from the original page. The journals come from the block's fields (fromFields below);
   everything after that is the original script, including the Atom app's preview hook. */
import { blockData, overlays } from './shared.js';

/* ---- journals ----
   Each journal: title, cover (image or colour), sticker, band colour, and pages.
   A page can be a scan ('art/journal-1/p01.jpg' fills the page), {pic, note, date}, or {wip:true} for a blank page.
   Pages can also carry placed items (stickers, photos, GIFs, tape, text, doodles, clips, flaps) and a
   paper type: {scan, items, props}. Items are placed in page fractions (x/y = centre, w = width), so they look the
   same at any size. Keep an even number of pages. */
const wip=n=>Array.from({length:n},()=>({wip:true}));
const isObj=o=>o&&typeof o==='object'&&!Array.isArray(o);
const hasKeys=o=>isObj(o)&&Object.keys(o).length>0;
/* site_content journal -> the viewer's shape (pages without items or props stay exactly as before) */
function mapJournal(j){
  const pages=(j.pages||[]).map(p=>{const items=Array.isArray(p.items)?p.items:[],props=isObj(p.props)?p.props:{};
    if(!items.length&&!hasKeys(props))return p.image_url?p.image_url:{wip:true};
    return {id:p.id,scan:p.image_url||null,items,props};});
  const all=pages.length?pages:wip(8);
  if(all.length%2)all.push({wip:true});
  return {id:j.id,title:j.title,year:j.year||'',cover:j.cover_url||null,cbg:j.cover_color||'#222',sticker:j.sticker_url||null,band:j.band||'#141516',dark:!!j.dark,r:+j.rot||0,
    props:isObj(j.props)?j.props:{},citems:coverSide(j,false),bitems:coverSide(j,true),pages:all};}
/* cover items: page_id null; props.side 'back' = the back cover, anything else = the front (and the shelf) */
function coverSide(j,back){return (Array.isArray(j.cover_items)?j.cover_items:[]).filter(i=>((isObj(i.props)?i.props:{}).side==='back')===back);}

/* a journal from the block's fields -> the viewer's shape */
function fromFields(j,n){
  const pages=(j.pages||[]).map((p,i)=>{p=p||{};const items=Array.isArray(p.items)?p.items:[],props=Object.assign({},isObj(p.props)?p.props:{});
    if(p.paper)props.paper=p.paper;if(p.spread)props.spread=true;
    if(items.length||hasKeys(props))return {id:p.id||('p'+i),scan:p.image||null,items,props};
    if(p.photo||p.note||p.date)return {pic:p.photo||undefined,note:p.note||'',date:p.date||''};
    return p.image?p.image:{wip:true};});
  const all=pages.length?pages:wip(8);
  if(all.length%2)all.push({wip:true});
  const o=isObj(j.options)?j.options:{},props={};
  if(o.ribbon)props.ribbon=o.ribbon;if(o.wear&&o.wear!=='none')props.wear=o.wear;if(o.titleStamp)props.title_stamp=true;if(o.coverText==='light')props.cover_text='light';if(o.sound)props.sound=true;if(o.backCover)props.back_cover_url=o.backCover;
  const cov=Array.isArray(j.coverItems)?j.coverItems:[],side=back=>cov.filter(i=>((isObj(i.props)?i.props:{}).side==='back')===back);
  return {id:j.id||('j'+n),title:j.title||'',year:j.year||'',cover:j.cover||null,cbg:j.coverColor||'#222',sticker:j.sticker||null,band:j.band||'#141516',dark:!!j.dark,r:+j.tilt||0,link:j.link||'',
    props,citems:side(false),bitems:side(true),pages:all};}

export function initJournals(){
const D=blockData('journals');if(!D)return;
const JOURNALS=(D.journals||[]).filter(j=>j&&!j.hidden).map(fromFields);
const shelf=document.getElementById('jrShelf');if(!shelf)return;
shelf.innerHTML='';

const PREVIEW=new URLSearchParams(location.search).get('atom-preview')==='1';
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=(v,d)=>{const n=+v;return Number.isFinite(n)?n:d;};
const col=(v,d)=>/^#[0-9a-f]{3,8}$|^rgba?\([\d\s.,%]+\)$|^[a-z]+$/i.test(String(v||''))?v:d;
const url=u=>String(u||'').replace(/'/g,'%27');

/* Caveat (the "hand" font) loads only when a text item uses it */
let caveat=false;function needHand(){if(caveat)return;caveat=true;const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&display=swap';document.head.appendChild(l);}

/* ---------- items ---------- */
const TAPE={masking:'jt-mask','washi-dots':'jt-dots','washi-stripes':'jt-stripes',clear:'jt-clear'};
const CLIPS={
  paperclip:c=>`<svg viewBox="0 0 24 64" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"><path d="M17 20v28a5 5 0 0 1-10 0V12a8 8 0 0 1 16 0v38a11 11 0 0 1-22 0V22"/></svg>`,
  staple:c=>`<svg viewBox="0 0 64 16"><path d="M4 12V5h56v7" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/><path d="M4 5h56" stroke="rgba(255,255,255,.5)" stroke-width="1"/></svg>`,
  pin:c=>`<svg viewBox="0 0 40 40"><ellipse cx="22" cy="24" rx="11" ry="5" fill="rgba(0,0,0,.18)"/><circle cx="18" cy="18" r="12" fill="${c}"/><circle cx="14" cy="13" r="4" fill="rgba(255,255,255,.45)"/></svg>`,
  binderclip:c=>`<svg viewBox="0 0 64 56"><path d="M8 26h48l-6 26H14z" fill="${c}"/><path d="M14 26C14 6 22 2 32 2s18 4 18 24" fill="none" stroke="#9A9AA0" stroke-width="3"/><path d="M8 26h48" stroke="rgba(255,255,255,.35)" stroke-width="2"/></svg>`,
};
const CLIP_ASPECT={paperclip:24/64,staple:4,pin:1,binderclip:64/56};
function tapes(p){const t=p.tape||'none';if(t==='none')return '';const c=TAPE[p.tapeStyle]||'jt-mask';
  return t==='top'?`<i class="jt ${c} jt-top"></i>`:`<i class="jt ${c} jt-tl"></i><i class="jt ${c} jt-br"></i>`;}
function media(it,p){const src=esc(it.src),poster=p.poster?` poster="${esc(p.poster)}"`:'';
  return /\.(mp4|webm|mov)(\?|$)/i.test(it.src||'')?`<video muted loop playsinline preload="none" data-src="${src}"${poster}></video>`:`<img alt="" data-src="${src}"${p.poster?` src="${esc(p.poster)}"`:''}>`;}
function inner(it){const p=isObj(it.props)?it.props:{};
  switch(it.kind){
    case 'sticker':case 'photo':{const sh=p.shadow==='none'?'':' sh',lift=num(p.lift,0);
      return {cls:`ji-${it.kind}${sh}`,style:lift?`--lift:${lift}`:'',html:`<img alt="" src="${esc(it.src)}" loading="lazy" draggable="false">${tapes(p)}`};}
    case 'gif':case 'video':{const m=['circle','star','blob','polaroid','tv','torn'].includes(p.mask)?p.mask:'none';
      return {cls:`ji-media jm-${m}`,style:`--ar:${num(p.aspect,1)}`,html:`<span class="jm-fr"><span class="jm-in">${media(it,p)}</span></span>`};}
    case 'tape':{const c=TAPE[p.style]||'jt-mask';return {cls:'ji-tape',style:p.color?`--tc:${col(p.color,'')}`:'',html:`<i class="jt ${c}"></i>`};}
    case 'text':{const f=['hand','mono','display'].includes(p.font)?p.font:'hand';if(f==='hand')needHand();
      return {cls:`ji-text jf-${f}`,style:`--fs:${num(p.size,.06)};color:${col(p.color,'#2A2A2C')}`,html:esc(p.text||'').replace(/\n/g,'<br>')};}
    case 'doodle':{const vb=Array.isArray(p.vb)&&p.vb.length===4?p.vb.map(v=>num(v,0)):[0,0,1000,1000];
      const paths=(Array.isArray(p.paths)?p.paths:[]).map(q=>`<path d="${esc(q.d)}" stroke="${col(q.color,'#2A2A2C')}" stroke-width="${num(q.width,6)}" pathLength="1"/>`).join('');
      return {cls:'ji-doodle'+(p.draw?' jd-draw':''),style:`--ar:${vb[2]/Math.max(1,vb[3])}`,html:`<svg viewBox="${vb.join(' ')}" fill="none" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="none">${paths}</svg>`};}
    case 'clip':{const s=CLIPS[p.style]?p.style:'paperclip';return {cls:'ji-clip',style:`--ar:${CLIP_ASPECT[s]}`,html:CLIPS[s](col(p.color,s==='pin'?'#E5484D':'#8E9196'))};}
    case 'flap':{const b=isObj(p.back)?p.back:{},hinge=p.hinge==='left'?'left':'top';
      const back=b.kind==='text'?`<span class="jf-txt">${esc(b.text||'').replace(/\n/g,'<br>')}</span>`:b.src?`<img alt="" src="${esc(b.src)}" loading="lazy">`:'';
      return {cls:`ji-flap jh-${hinge}`,style:`--ar:${num(p.aspect,1)}`,html:`<span class="jf-back">${back}</span><span class="jf-front"><img alt="" src="${esc(p.front||it.src||'')}" loading="lazy"></span>`};}
  }
  return null;}
/* one item's box: position, size, rotation, skew, stacking */
function boxStyle(it){return `left:calc(var(--ux) * ${num(it.x,.5)});top:${num(it.y,.5)*100}%;width:calc(var(--ux) * ${num(it.w,.3)});z-index:${Math.round(num(it.z,1))};transform:translate(-50%,-50%) rotate(${num(it.rot,0)}deg) skewX(${num(it.skew,0)}deg)`;}
/* keyed fill of an item layer: unchanged items only get their box moved (no reload, no re-animation) */
function fillLayer(layer,items){
  const keep=new Map([...layer.children].map(e=>[e.dataset.id,e]));
  (items||[]).forEach((it,n)=>{const r=inner(it);if(!r)return;const id=String(it.id||'i'+n),sig=it.kind+'|'+it.src+'|'+JSON.stringify(it.props||{});
    let e=keep.get(id);keep.delete(id);
    if(!e||e.dataset.sig!==sig){const ne=document.createElement('div');ne.dataset.id=id;ne.dataset.sig=sig;ne.className='ji '+r.cls;ne.innerHTML=r.html;
      if(e)e.replaceWith(ne);else layer.appendChild(ne);e=ne;e._style=r.style;}
    e.style.cssText=boxStyle(it)+(e._style?';'+e._style:'');});
  keep.forEach(e=>e.remove());}
function layerHTML(off){return `<div class="it-l${off?' sp':''}"${off?` style="--off:${off}"`:''}></div>`;}

/* ---------- covers ---------- */
/* an image cover sits on the cover colour, so a transparent image (a library sticker) never shows what's behind the board */
const coverStyle=j=>(j.cover?`--cbg:url('${url(j.cover)}') center/cover no-repeat,${j.cbg||'#222'}`:`--cbg:${j.cbg||'#222'}`)+`;--tone:${j.tone||'#333'};--band:${j.band||'#141516'}`;
function coverExtras(j,shelfCover){const p=j.props||{};let h='';
  if(p.wear==='light'||p.wear==='heavy')h+=`<span class="jw jw-${p.wear}"></span>`;
  if(p.title_stamp)h+=`<span class="jstamp${p.cover_text==='light'?' lt':''}">${esc(j.title)}</span>`;
  if((j.citems||[]).length)h+=layerHTML(0);
  return h;}
const coverInner=j=>`${j.sticker?`<img class="st" src="${esc(j.sticker)}" alt="">`:''}<span class="jr-coil"></span><span class="jr-tip"><img src="${esc(j.cover||j.sticker||'')}" alt=""></span><span class="jr-deb">${esc(j.title)}</span><span class="jr-stk">${(j.stk||[]).map((u,k)=>`<img src="${u}" alt="" style="--k:${k}">`).join('')}</span><span class="jr-band"></span>${coverExtras(j)}<span class="jr-lbl">${esc(j.title)}</span>`;
const ribbon=j=>{const r=(j.props||{}).ribbon;return r&&r!=='none'?`<span class="jrib" style="--rib:${col(r,'#C8161F')}"></span>`:'';};

function shelfButton(j,i){const b=document.createElement('button');b.type='button';b.className='jr';b.style.setProperty('--r',(j.r||0)+'deg');
  b.setAttribute('aria-label',`Open journal: ${j.title}`);
  b.style.setProperty('--i',i);b.innerHTML=`${ribbon(j)}<span class="jr-cv cvx" style="${coverStyle(j)}">${coverInner(j)}</span><span class="jr-n">0${i+1}</span><span class="jr-cap"><i>0${i+1}</i><b>${esc(j.title)}</b><span>${j.pages.length} pages · ${j.year||''}</span></span>`;
  const l=b.querySelector('.it-l');if(l){fillLayer(l,j.citems);l.querySelectorAll('[data-src]').forEach(m=>{m.src=m.dataset.src;if(m.tagName==='VIDEO'){m.autoplay=true;m.play&&m.play().catch(()=>{});}});}
  b.addEventListener('click',()=>openJ(j,b));return b;}
JOURNALS.forEach((j,i)=>shelf.appendChild(shelfButton(j,i)));

/* ---------- pages ---------- */
const PAPERS=['dots','lined','graph','blank','kraft','black','tracing'];
function page(p,n,dark){
  if(typeof p==='string')return {cls:'',html:`<img class="full" src="${esc(p)}" alt="">`};
  if(p.wip)return {cls:dark?'dark':'dots',html:`<span class="wip">work in progress</span><span class="pn">${n}</span>`};
  if('items' in p||'scan' in p){
    const pr=p.props||{},paper=PAPERS.includes(pr.paper)?pr.paper:null;
    const cls=paper?'pp-'+paper:(p.scan?'':(dark?'dark':'dots'));
    return {cls,ed:true,html:(p.scan?`<img class="full" src="${esc(p.scan)}" alt="">`:'')+(p.scan?'':`<span class="pn">${n}</span>`),items:p.items||[]};}
  const date=p.date?`<span class="date">${esc(p.date)}</span>`:'';
  const note=p.note?`<span class="hand">${esc(p.note).replace(/\n/g,'<br>')}</span>`:'';
  let mid='';
  if(p.pic)mid=`<div class="pic" style="--t:${p.t||'-2deg'}"><img src="${p.pic}" alt="" loading="lazy"></div>`;
  else if(p.raw)mid=`<div class="pic raw"><img src="${p.raw}" alt="" loading="lazy"></div>`;
  else if(p.sw)mid=`<div class="sw">${p.sw.map(c=>`<i style="--c:${c}"></i>`).join('')}</div>`;
  return {cls:dark?'dark':'dots',html:`<div class="in">${date}${mid}${note}</div><span class="pn">${n}</span>`};}

/* where page index i (0-based) sits: leaf k, front (right side) or back (left side) */
const leafOf=i=>i%2===0?{k:i/2+1,bk:false}:{k:(i+1)/2,bk:true};
const curFor=i=>Math.floor(i/2)+1+(i%2);
/* a spread page's items (and scan) run across both pages of its spread; coordinates are from the spread's left page */
function spreadOf(P,i){const p=P[i];if(!isObj(p)||!(p.props||{}).spread)return null;const L=i%2?i:i-1;if(L<1)return null;return {L,R:L+1,owner:i};}

function build(j){
  const leaves=[];const P=j.pages,pr=j.props||{};
  const back=pr.back_cover_url?`--cbg:url('${url(pr.back_cover_url)}') center/cover no-repeat,${j.cbg||'#222'};--band:${j.band||'#141516'}`:coverStyle(j);
  leaves.push({f:{cls:'cover cvx',style:coverStyle(j),html:coverInner(j),citems:j.citems},b:{cls:'end',style:`--end:${j.band||'#141516'}`,html:`<span class="endtxt" style="color:#ffffffaa">if found, return to<br>aoost — cape town</span>`}});
  const faces=[];
  for(let k=0;k<P.length;k+=2){const a=page(P[k],k+1,j.dark),c=page(P[k+1]||{blank:true},k+2,j.dark);faces[k]=a;faces[k+1]=c;leaves.push({f:a,b:c});}
  // own items go in each page's layer; spreads add a second, two-page-wide layer to both pages of the spread
  P.forEach((p,i)=>{const f=faces[i];if(!f)return;f.layers=[];if(f.ed)f.layers.push({items:f.items,off:0});});
  P.forEach((p,i)=>{const s=spreadOf(P,i);if(!s)return;const items=p.items||[];
    if(faces[s.L])faces[s.L].layers.push({items,off:0,sp:true,scan:p.scan,side:'L',owner:i});
    if(faces[s.R])faces[s.R].layers.push({items,off:1,sp:true,scan:p.scan,side:'R',owner:i});
    if(faces[i]){faces[i].layers=faces[i].layers.filter(l=>l.sp);if(p.scan)faces[i].html=faces[i].html.replace(/<img class="full"[^>]*>/,'');}
    // one sheet across the fold: the facing page takes the spread's paper
    const other=i===s.L?s.R:s.L;if(faces[other]&&faces[i]){faces[other].cls=faces[i].cls;faces[other].html=faces[other].html.replace(/<span class="wip">[^<]*<\/span>/,'');}});
  leaves.push({f:{cls:'end',style:`--end:${j.band||'#141516'}`,html:''},b:{cls:'backcover cvx',style:back,html:(pr.wear&&pr.wear!=='none'?`<span class="jw jw-${pr.wear}"></span>`:'')+((j.bitems||[]).length?layerHTML(0):''),citems:j.bitems}});
  return leaves;}
function faceHTML(f,bk){
  const layers=(f.layers||[]).map(l=>l.sp?`<div class="it-l sp" style="--off:${l.off}">${l.scan?`<img class="full sp-scan" src="${esc(l.scan)}" alt="">`:''}</div>`:layerHTML(0)).join('');
  return `<div class="jv-pg ${bk?'bk ':''}${f.cls||''}" style="${f.style||''}">${f.html}${layers}</div>`;}
function fillFace(el,f){const ls=el.querySelectorAll(':scope > .it-l');(f.layers||[]).forEach((l,n)=>ls[n]&&fillLayer(ls[n],l.items));
  if(f.citems&&f.citems.length){const l=el.querySelector('.it-l');if(l)fillLayer(l,f.citems);}}

/* ---------- page sound: a 250 ms filtered-noise sweep, after the visitor's first interaction ---------- */
let actx=null,touched=false;['pointerdown','keydown'].forEach(e=>addEventListener(e,()=>{touched=true;},{once:true,capture:true}));
function turnSound(){if(!touched)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const t=actx.currentTime,len=.25,
  buf=actx.createBuffer(1,Math.ceil(actx.sampleRate*len),actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const src=actx.createBufferSource();src.buffer=buf;const f=actx.createBiquadFilter();f.type='bandpass';f.Q.value=.8;f.frequency.setValueAtTime(3200,t);f.frequency.exponentialRampToValueAtTime(700,t+len);
  const g=actx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.22,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+len);
  src.connect(f).connect(g).connect(actx.destination);src.start(t);src.stop(t+len);}catch(e){}}

/* ---------- viewer ---------- */
let V=null;
function openJ(j,trigger,opts={}){
  const leaves=build(j);
  const el=document.createElement('div');el.className='jv'+(PREVIEW?' jv-prev':'');el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',`Journal: ${j.title}`);
  el.innerHTML=`${j.link&&/^(https?:\/\/|\/)/.test(j.link)?`<a class="jv-t" href="${esc(j.link)}"${/^https?:/.test(j.link)?' target="_blank" rel="noopener"':''}>${esc(j.title)} ↗</a>`:`<span class="jv-t">${esc(j.title)}</span>`}<button class="jv-x" type="button" aria-label="Close journal">×</button>
    <div class="jv-stage"><div class="jv-book">${leaves.map((l,k)=>`<div class="jv-lf" data-k="${k}">${faceHTML(l.f,false)}${faceHTML(l.b,true)}</div>`).join('')}${ribbon(j)}</div></div>
    <span class="jv-hint">tap a page to zoom · tap the edge, swipe or scroll to turn</span>
    <div class="jv-bar"><button type="button" class="pv" aria-label="Previous page">‹</button><span class="ct" aria-live="polite"></span><button type="button" class="nx" aria-label="Next page">›</button></div>`;
  overlays().appendChild(el);
  const stage=el.querySelector('.jv-stage'),book=el.querySelector('.jv-book'),lfs=[...el.querySelectorAll('.jv-lf')],ct=el.querySelector('.ct'),pv=el.querySelector('.pv'),nx=el.querySelector('.nx'),hint=el.querySelector('.jv-hint');
  const fill=()=>leaves.forEach((l,k)=>{const fs=lfs[k].children;fillFace(fs[0],l.f);fillFace(fs[1],l.b);});fill();
  const N=lfs.length;let cur=0,W=0,H=0;
  function size(){const vw=innerWidth,vh=innerHeight;H=Math.min(vh*(PREVIEW?.86:.68),(vw*.94/2)*148/105);W=H*105/148;book.style.width=2*W+'px';book.style.height=H+'px';
    el.style.setProperty('--pw',W+'px');place();}
  function place(){const shift=cur===0?-W/2:cur===N?W/2:0;book.style.transform=`translateX(${shift}px)`;
    lfs.forEach((l,k)=>{const f=k<cur;l.classList.toggle('fl',f);if(!l._busy)l.style.zIndex=f?k+1:N-k;});book.classList.toggle('at-back',cur===N);
    const P=j.pages.length;ct.textContent=cur===0?'cover':cur===N?'back cover':cur===1?`inside cover · p. 1`:(cur*2-2>=P?`p. ${P}`:`p. ${cur*2-2} – ${cur*2-1} / ${P}`);
    pv.disabled=cur===0;nx.disabled=cur===N;activate();}
  /* only the open spread's media play; doodles there draw in once */
  function activate(){lfs.forEach((l,k)=>{const fs=l.children;[[fs[0],k===cur],[fs[1],k===cur-1]].forEach(([f,on])=>{
      f.querySelectorAll('video[data-src],img[data-src]').forEach(m=>{if(on){if(m.getAttribute('src')!==m.dataset.src)m.src=m.dataset.src;if(m.tagName==='VIDEO'){const pr=m.play();pr&&pr.catch(()=>{});}}
        else if(m.tagName==='VIDEO'){m.pause();if(m.getAttribute('src')){m.removeAttribute('src');m.load();}}else if(m.getAttribute('src')===m.dataset.src){m.removeAttribute('src');}});
      if(on)f.querySelectorAll('.jd-draw:not(.drawn)').forEach(d=>{if(PREVIEW&&opts.noAnim)d.classList.add('drawn','now');else requestAnimationFrame(()=>d.classList.add('drawn'));});});});}
  function go(d){const n=Math.max(0,Math.min(N,cur+d));if(n===cur)return;const l=lfs[d>0?cur:n];l._busy=1;l.style.zIndex=N+5;clearTimeout(l._t);l._t=setTimeout(()=>{l._busy=0;place();},900);cur=n;place();hint.style.opacity=0;
    if((j.props||{}).sound)turnSound();}
  size();addEventListener('resize',size);
  if(opts.cur!=null){book.classList.add('jv-now');lfs.forEach(l=>l.classList.add('jv-now'));cur=opts.cur;place();el.classList.add('on');requestAnimationFrame(()=>requestAnimationFrame(()=>{book.classList.remove('jv-now');lfs.forEach(l=>l.classList.remove('jv-now'));}));}
  else requestAnimationFrame(()=>{el.classList.add('on');setTimeout(()=>{if(cur===0)go(1);},650);});
  // tilt the book a little with the pointer: it reads as an object, not a picture (flat in Atom's preview, so taps map exactly)
  const tilt=e=>{if(PREVIEW||zoomed||matchMedia('(hover:none)').matches)return;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;stage.style.transform=`rotateX(${8-y*8}deg) rotateY(${x*10}deg)`;};
  stage.style.transform=PREVIEW?'none':'rotateX(8deg)';el.addEventListener('pointermove',tilt);
  /* tap a page to zoom it (2x, drag to pan, tap again to return); tap near a page's outer edge, swipe, wheel or keys turn */
  let zoomed=false,zx=0,zy=0,sx=null,sy=null,ox=0,oy=0,moved=false;
  const setZoom=()=>{stage.style.transition=moved?'none':'';stage.style.transform=zoomed?`translate(${zx}px,${zy}px) scale(2)`:(PREVIEW?'none':'rotateX(8deg)');el.classList.toggle('zoomed',zoomed);};
  book.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY;ox=zx;oy=zy;moved=false;});
  book.addEventListener('pointermove',e=>{if(sx===null||!zoomed)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.hypot(dx,dy)>6)moved=true;if(moved){zx=ox+dx;zy=oy+dy;setZoom();}});
  book.addEventListener('pointerup',e=>{if(sx===null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;
    if(zoomed){if(!moved){zoomed=false;zx=zy=0;moved=false;setZoom();}return;}
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){go(dx<0?1:-1);return;}
    if(e.target.closest('.ji-flap,a,button,video'))return;
    const r=book.getBoundingClientRect(),edge=W*.16,right=e.clientX>r.left+r.width/2;
    const atEdge=e.clientX<r.left+edge||e.clientX>r.right-edge;
    if(cur===0||cur===N||atEdge||PREVIEW){if(!PREVIEW)go(right?1:-1);return;}
    // zoom so the tapped point comes to the centre of the screen
    const sr=stage.getBoundingClientRect(),cx=sr.left+sr.width/2,cy=sr.top+sr.height/2;zx=(cx-e.clientX)*2;zy=(cy-e.clientY)*2;zoomed=true;moved=false;setZoom();hint.style.opacity=0;});
  el.addEventListener('click',e=>{const f=e.target.closest('.ji-flap');if(f){e.stopPropagation();f.classList.toggle('open');}});
  let acc=0,lock=0;el.addEventListener('wheel',e=>{e.preventDefault();if(zoomed)return;const n=performance.now();if(n<lock)return;acc+=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(Math.abs(acc)>70){go(acc>0?1:-1);acc=0;lock=n+700;}},{passive:false});
  pv.onclick=()=>go(-1);nx.onclick=()=>go(1);
  const key=e=>{if(e.key==='ArrowRight')go(1);else if(e.key==='ArrowLeft')go(-1);else if(e.key==='Escape'){if(zoomed){zoomed=false;zx=zy=0;setZoom();}else close();}};addEventListener('keydown',key);
  el.addEventListener('click',e=>{if(e.target===el&&!PREVIEW)close();});
  const x=el.querySelector('.jv-x');x.onclick=close;x.focus({preventScroll:true});
  const prevOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
  function close(){if(cur>0){cur=0;place();}el.classList.remove('on');removeEventListener('keydown',key);removeEventListener('resize',size);V=null;
    lfs.forEach(l=>l.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');}));
    setTimeout(()=>{el.remove();document.documentElement.style.overflow=prevOverflow;trigger&&trigger.focus({preventScroll:true});},cur>0?900:350);}
  /* Atom's preview: new data for the same journal re-renders in place (items keyed, nothing re-animates) */
  function update(nj){j=nj;const nl=build(nj);if(nl.length!==leaves.length)return false;
    nl.forEach((l,k)=>[[l.f,0],[l.b,1]].forEach(([f,s])=>{const fe=lfs[k].children[s],old=s?leaves[k].b:leaves[k].f;
      const sig=f=>(f.cls||'')+'|'+(f.style||'')+'|'+(f.html||'')+'|'+(f.layers||[]).map(l=>(l.sp?'s'+l.off+(l.scan||''):'o')).join(',');
      if(sig(f)!==sig(old)){const t=document.createElement('div');t.innerHTML=faceHTML(f,!!s);const ne=t.firstElementChild;fe.replaceWith(ne);}
      fillFace(lfs[k].children[s],f);}));
    leaves.splice(0,leaves.length,...nl);
    const rb=book.querySelector(':scope > .jrib'),nr=ribbon(nj);if(rb)rb.remove();if(nr)book.insertAdjacentHTML('beforeend',nr);
    activate();return true;}
  function goTo(c){if(c===cur)return;book.classList.add('jv-now');lfs.forEach(l=>l.classList.add('jv-now'));cur=c;place();requestAnimationFrame(()=>requestAnimationFrame(()=>{book.classList.remove('jv-now');lfs.forEach(l=>l.classList.remove('jv-now'));}));}
  V={el,j:()=>j,update,goTo,cur:()=>cur,lfs,W:()=>W,H:()=>H};
  return V;
}

/* ---------- Atom preview (?atom-preview=1): the app posts the journal it is editing ---------- */
if(PREVIEW){
  document.documentElement.classList.add('atom-preview');
  let pending=null;
  function report(pageNo,spread){if(!V)return;const i=pageNo-1,{k,bk}=leafOf(i),face=V.lfs[k]&&V.lfs[k].children[bk?1:0];if(!face)return;
    let r=face.getBoundingClientRect(),frame={x:r.left,y:r.top,w:r.width,h:r.height};
    const s=spreadOf(V.j().pages,i);
    if(s){const L=leafOf(s.L),R=leafOf(s.R),a=V.lfs[L.k].children[1].getBoundingClientRect(),b=V.lfs[R.k].children[0].getBoundingClientRect();frame={x:a.left,y:a.top,w:a.width,h:a.height};}
    const layer=s?(V.lfs[leafOf(s.L).k].children[1].querySelector('.it-l.sp')):face.querySelector(':scope > .it-l');
    // sizes in the page's own layout px (the preview scales the stage, so screen rects would be off by that scale)
    const pw=face.offsetWidth||1,ph=face.offsetHeight||1;
    const items=layer?[...layer.children].map(e=>({id:e.dataset.id,wf:e.offsetWidth/pw,hf:e.offsetHeight/ph})):[];
    const out={frame,spread:!!s,dpr:devicePixelRatio,items};
    try{window.AtomBridge&&AtomBridge.layout(JSON.stringify(out));}catch(e){}
    window.__atomLayout=out;}
  /* scale the flat stage so the page (or spread) being edited fills the screen */
  function fit(pageNo){if(!V)return;const st=V.el.querySelector('.jv-stage');st.style.transition='none';st.style.transform='none';
    const i=pageNo-1,s=spreadOf(V.j().pages,i);let r;
    if(s){const a=V.lfs[leafOf(s.L).k].children[1].getBoundingClientRect(),b=V.lfs[leafOf(s.R).k].children[0].getBoundingClientRect();r={left:a.left,top:a.top,right:b.right,bottom:b.bottom};}
    else{const {k,bk}=leafOf(i),f=V.lfs[k]&&V.lfs[k].children[bk?1:0];if(!f)return;r=f.getBoundingClientRect();}
    const sr=st.getBoundingClientRect(),cx=sr.left+sr.width/2,cy=sr.top+sr.height/2,fw=r.right-r.left,fh=r.bottom-r.top;
    const sc=Math.min(innerWidth*.94/fw,innerHeight*.94/fh),fx=(r.left+r.right)/2,fy=(r.top+r.bottom)/2;
    st.style.transform=`translate(${innerWidth/2-cx-(fx-cx)*sc}px,${innerHeight/2-cy-(fy-cy)*sc}px) scale(${sc})`;}
  /* the cover editor: page 'cover' / 'back' shows the closed book, that side big and centred above a shelf strip */
  const coverFace=side=>side==='back'?V.lfs[V.lfs.length-1].children[1]:V.lfs[0].children[0];
  function fitCover(side){if(!V)return;const st=V.el.querySelector('.jv-stage');st.style.transition='none';st.style.transform='none';
    const r=coverFace(side).getBoundingClientRect(),sr=st.getBoundingClientRect(),cx=sr.left+sr.width/2,cy=sr.top+sr.height/2;
    const top=96,bottom=innerHeight-368,sc=Math.min(innerWidth*.84/r.width,(bottom-top)/r.height),fx=r.left+r.width/2,fy=r.top+r.height/2;
    st.style.transform=`translate(${innerWidth/2-cx-(fx-cx)*sc}px,${(top+bottom)/2-cy-(fy-cy)*sc}px) scale(${sc})`;}
  function reportCover(side){if(!V)return;const face=coverFace(side),r=face.getBoundingClientRect(),pw=face.offsetWidth||1,ph=face.offsetHeight||1;
    const layer=face.querySelector(':scope > .it-l'),items=layer?[...layer.children].map(e=>({id:e.dataset.id,wf:e.offsetWidth/pw,hf:e.offsetHeight/ph})):[];
    const st=side==='back'?null:face.querySelector(':scope > img.st');   // the old cover sticker: a locked layer in Atom
    if(st)items.push({id:'__sticker',wf:st.offsetWidth/pw,hf:st.offsetHeight/ph});
    const out={frame:{x:r.left,y:r.top,w:r.width,h:r.height},spread:false,dpr:devicePixelRatio,items,side};
    try{window.AtomBridge&&AtomBridge.layout(JSON.stringify(out));}catch(e){}
    window.__atomLayout=out;}
  /* how the book looks on the shelf, at its real size, under the editor */
  function shelfStrip(nj){let sh=document.getElementById('atomShelf');
    if(!sh){sh=document.createElement('div');sh.id='atomShelf';sh.innerHTML='<span class="as-l">on the shelf</span><div class="as-b"></div>';overlays().appendChild(sh);}
    const b=sh.querySelector('.as-b');b.innerHTML='';b.appendChild(shelfButton(nj,0));}
  function showCover(msg,side){const nj=mapJournal(msg.journal||{});
    if(!(V&&V.j().id===nj.id&&V.update(nj))){if(V){V.el.remove();V=null;}openJ(nj,null,{cur:0,noAnim:true});}
    V.goTo(side==='back'?V.lfs.length:0);V.el.classList.add('cv-mode');document.documentElement.classList.add('cv-on');shelfStrip(nj);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{fitCover(side);reportCover(side);}));setTimeout(()=>{fitCover(side);reportCover(side);},400);}
  function show(msg){if(msg.page==='cover'||msg.page==='back')return showCover(msg,msg.page==='back'?'back':'cover');
    document.documentElement.classList.remove('cv-on');if(V)V.el.classList.remove('cv-mode');
    const nj=mapJournal(msg.journal||{}),pageNo=Math.max(1,+msg.page||1),c=curFor(pageNo-1);
    if(V&&V.j().id===nj.id&&V.update(nj)){V.goTo(c);}
    else{if(V){V.el.remove();V=null;}openJ(nj,null,{cur:c,noAnim:true});}
    requestAnimationFrame(()=>requestAnimationFrame(()=>{fit(pageNo);report(pageNo);}));setTimeout(()=>{fit(pageNo);report(pageNo);},400);}
  addEventListener('message',e=>{const d=e.data;if(d&&d.type==='atom-journal'&&d.journal)show(d);});
  window.atomJournal=show;
  addEventListener('resize',()=>{if(!V||!window.__atomLast)return;const l=window.__atomLast;setTimeout(()=>{if(l==='cover'||l==='back'){fitCover(l);reportCover(l);}else{fit(l);report(l);}},120);});
  addEventListener('message',e=>{if(e.data&&e.data.page)window.__atomLast=(e.data.page==='cover'||e.data.page==='back')?e.data.page:+e.data.page;});
  try{window.AtomBridge&&AtomBridge.ready();}catch(e){}
}
}
