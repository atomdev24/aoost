/* aoost homepage runtime — shared helpers.
   Ported from the original index.html. The code is kept as close to the original as possible;
   what changed is where content comes from: each block carries its fields as JSON
   (<script data-ao-data>) instead of the page reading window.CMS from Supabase. */

export const wrap = document.querySelector('.ao.wrap');

/** The fields of a block on this page, or null when the block isn't there. */
export function blockData(name) {
  const b = document.querySelector('.ao-b[data-ao="' + name + '"]');
  if (!b) return null;
  const s = b.querySelector(':scope > script[data-ao-data]');
  try { return s ? JSON.parse(s.textContent) : {}; } catch (e) { return {}; }
}
export const blockEl = name => document.querySelector('.ao-b[data-ao="' + name + '"]');

/** Things the scripts hang on <body> (viewer, journal viewer, ghost cursors) live in one scoped container. */
export function overlays() {
  let o = document.querySelector('.ao.ao-overlays');
  if (!o) { o = document.createElement('div'); o.className = 'ao ao-overlays'; document.body.appendChild(o); }
  return o;
}

const cs = getComputedStyle(wrap || document.documentElement), tok = n => cs.getPropertyValue('--' + n).trim();
export const C = { blue: tok('blue') || '#2236F2', ink: '#141516', paper: '#FBFBF8', note: tok('note') || '#F2E36B', lime: tok('lime') || '#86E06F', pink: tok('pink') || '#D9559E', orange: tok('orange') || '#F1A23B', sky: tok('sky') || '#7FA9E6', white: '#FFFFFF' };
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const IN_CLAUDE = typeof window.claude === 'object' && window.claude !== null; // false on your own host
/** The draft preview inside the editor: look and behave the same, but never write to Supabase. */
/* The editor's draft preview and a local dev server never write to the live Supabase project
   (visitor count, presence, scores); they only read from it. */
export const DRAFT_PREVIEW = document.documentElement.hasAttribute('data-preview') || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

export function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e9)/1e9;};}
export function noise2(seed){const r=rng(seed),p=Array.from({length:256},r),h=(x,y)=>p[(x*73856093^y*19349663)&255],sm=t=>t*t*(3-2*t);
  return(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,a=h(xi,yi),b=h(xi+1,yi),c=h(xi,yi+1),d=h(xi+1,yi+1),u=sm(xf),v=sm(yf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};}
export function fit(cv){const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);cv.width=Math.max(1,r.width*d);cv.height=Math.max(1,r.height*d);const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);return[c,r.width,r.height];}

/* shared leaderboard (Supabase). The publishable key is meant to be public; never put the secret key here.
   Same project and key as the original page. */
export const SCOREBOARD = { url:'https://htlshvacmhprvsupkbpt.supabase.co', key:'sb_publishable_tVvMoEvf6SHjAe-5mU-Bjw_DpdVgSBT' };
/* new-style Supabase keys go in the apikey header only; old JWT-style anon keys also go in Authorization */
export const sbHeaders=extra=>Object.assign({apikey:SCOREBOARD.key},SCOREBOARD.key.startsWith('eyJ')?{Authorization:'Bearer '+SCOREBOARD.key}:{},extra||{});

/* ---------- hand-drawn underlines ---------- */
function smooth(pts){let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;d+=` Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;}const l=pts[pts.length-1];return d+` L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;}
function linePts(r){const pts=[],n=14;for(let i=0;i<=n;i++)pts.push([i/n*100,50+(r()-.5)*24+Math.sin(i/n*Math.PI)*-8]);const back=[];for(let i=n;i>=n*.35;i--)back.push([i/n*100-2,70+(r()-.5)*18]);return[pts,back];}
export function initUnderlines(){
  /* each heading keeps the squiggle it had on the original page: the number in data-underline is its original position */
  document.querySelectorAll('.ao [data-underline]').forEach((h,n)=>{const i=h.dataset.underline===''?n:+h.dataset.underline;const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
    linePts(rng(31+i*17)).forEach(pts=>{const p=document.createElementNS(ns,'path');p.setAttribute('d',smooth(pts));p.setAttribute('class','ink-path');p.setAttribute('stroke-width',1.6);p.setAttribute('vector-effect','non-scaling-stroke');svg.appendChild(p);});h.appendChild(svg);
    const paths=[...svg.querySelectorAll('path')];paths.forEach(p=>{const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=reduce?0:L;});
    const go=()=>{svg.classList.add('draw');paths.forEach((p,k)=>{p.style.transitionDelay=(k*.35)+'s';p.style.strokeDashoffset=0;});};
    if(reduce||!('IntersectionObserver' in window)){go();return;}const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){go();io.disconnect();}}),{threshold:.6});io.observe(h);});
}

/* ---------- placeholder art (stands in until your files are listed) ---------- */
function topo(ctx,w,h,seed){const n=noise2(seed);ctx.strokeStyle=C.ink;ctx.lineWidth=w/360;for(let lv=0;lv<22;lv++){const th=lv/22;ctx.beginPath();for(let y=0;y<h;y+=h/120)for(let x=0;x<w;x+=w/120){const v=n(x/w*3.2,y/h*3.2)*.6+n(x/w*7,y/h*7)*.4;if(Math.abs(v-th)<.006){ctx.moveTo(x,y);ctx.arc(x,y,w/420,0,7);}}ctx.stroke();}const r=rng(seed);ctx.fillStyle=C.blue;ctx.beginPath();ctx.arc(w*(.3+r()*.4),h*(.3+r()*.4),w*.035,0,7);ctx.fill();}
function halftone(ctx,w,h,seed){const r=rng(seed),cx=w*(.4+r()*.2),cy=h*(.42+r()*.15),R=w*.36,step=w/26;for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){const d=Math.hypot(x-cx,y-cy)/R,s=Math.max(0,1-d)*step*.48;if(s<.4)continue;ctx.fillStyle=d<.35?C.blue:C.ink;ctx.beginPath();ctx.arc(x,y,s,0,7);ctx.fill();}}
function scribbleBall(ctx,w,h,seed){const r=rng(seed);ctx.strokeStyle=C.ink;ctx.lineWidth=w/300;ctx.lineCap='round';let x=w/2,y=h/2,a=r()*7;ctx.beginPath();ctx.moveTo(x,y);for(let i=0;i<1600;i++){a+=(r()-.5)*.9;const dx=w/2-x,dy=h*.48-y;x+=Math.cos(a)*w/90+dx*.012;y+=Math.sin(a)*w/90+dy*.012;ctx.lineTo(x,y);}ctx.stroke();ctx.strokeStyle=C.blue;ctx.lineWidth=w/120;ctx.beginPath();ctx.moveTo(w*.12,h*.86);ctx.quadraticCurveTo(w*.5,h*.8,w*.88,h*.88);ctx.stroke();}
function hatch(ctx,w,h,seed){const r=rng(seed),cols=4,rows=5,cw=w/cols,ch=h/rows;ctx.lineWidth=w/420;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const x0=i*cw+cw*.12,y0=j*ch+ch*.12,ww=cw*.76,hh=ch*.76,dens=4+Math.floor(r()*14),ang=r()<.5;ctx.strokeStyle=r()<.12?C.blue:C.ink;ctx.beginPath();for(let k=0;k<dens;k++){const t=(k+.5)/dens,jt=(r()-.5)*2;if(ang){ctx.moveTo(x0+t*ww+jt,y0);ctx.lineTo(x0+t*ww-jt,y0+hh);}else{ctx.moveTo(x0,y0+t*hh+jt);ctx.lineTo(x0+ww,y0+t*hh-jt);}}ctx.stroke();}}
function rings(ctx,w,h,seed){const n=noise2(seed),cx=w*.5,cy=h*.5;for(let k=1;k<26;k++){ctx.strokeStyle=k===14?C.blue:C.ink;ctx.lineWidth=k===14?w/160:w/380;ctx.beginPath();for(let t=0;t<=Math.PI*2+.05;t+=.05){const rr=k*w/58*(1+(n(Math.cos(t)*1.5+k*.1,Math.sin(t)*1.5)-.5)*.5),x=cx+Math.cos(t)*rr,y=cy+Math.sin(t)*rr*1.12;t===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}}
export function monkey(c,w,h){c.fillStyle=C.lime;c.fillRect(0,0,w,h);c.fillStyle=C.sky;c.beginPath();c.ellipse(w*.42,h*.6,w*.32,h*.3,-.2,0,7);c.fill();c.fillStyle='#C8203A';c.beginPath();c.ellipse(w*.5,h*.34,w*.14,h*.09,.1,0,7);c.fill();c.fillStyle='#E8302F';c.beginPath();c.moveTo(w*.62,h*.4);c.quadraticCurveTo(w*.85,h*.34,w*1.02,h*.37);c.quadraticCurveTo(w*.84,h*.43,w*.62,h*.44);c.fill();}
export function pinkField(c,w,h){c.fillStyle=C.pink;c.fillRect(0,0,w,h);c.strokeStyle=C.ink;c.lineWidth=Math.max(1.5,w/140);const n=noise2(9);for(let k=1;k<7;k++){c.beginPath();for(let t=0;t<=Math.PI*2+.06;t+=.06){const rr=k*Math.min(w,h)/16*(1+(n(Math.cos(t)*1.4+k*.15,Math.sin(t)*1.4)-.5)*.7),x=w/2+Math.cos(t)*rr,y=h*.5+Math.sin(t)*rr;t===0?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}}
export function skyField(c,w,h){c.fillStyle=C.sky;c.fillRect(0,0,w,h);const r=rng(5);c.fillStyle=C.ink;c.beginPath();let x=w*.55,y=h*.08;c.moveTo(x,y);for(let i=0;i<5;i++){x+=(i%2?w*.18:-w*.22)+(r()-.5)*w*.06;y+=h*.16;c.lineTo(x,y);}c.lineTo(x+w*.08,y+h*.04);for(let i=0;i<5;i++){x+=(i%2?-w*.2:w*.2)+(r()-.5)*w*.05;y-=h*.16;c.lineTo(x+w*.06,y);}c.closePath();c.fill();}
export function orangeField(c,w,h){c.fillStyle=C.orange;c.fillRect(0,0,w,h);c.fillStyle='#3E5470';c.beginPath();c.ellipse(w*.5,h*.6,w*.3,h*.26,0,0,7);c.fill();c.fillStyle='#C8203A';c.beginPath();c.ellipse(w*.5,h*.38,w*.16,h*.09,0,0,7);c.fill();}
export function doodle(c,w,h,kind,seed){const r=rng(seed);c.strokeStyle=C.ink;c.fillStyle=C.ink;c.lineCap='round';c.lineJoin='round';c.lineWidth=Math.max(1.6,w/34);const j=()=>(r()-.5)*w*.03;
  const line=pts=>{c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++){c.quadraticCurveTo(pts[i][0],pts[i][1],(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2);}const l=pts[pts.length-1];c.lineTo(l[0],l[1]);c.stroke();};const cx=w/2,cy=h*.56;
  if(kind==='eye'){const p=[],q=[];for(let t=0;t<=1;t+=.08){p.push([w*.12+t*w*.76,cy-Math.sin(t*Math.PI)*h*.2+j()]);q.push([w*.12+t*w*.76,cy+Math.sin(t*Math.PI)*h*.18+j()]);}line(p);line(q);c.beginPath();c.arc(cx+j(),cy,w*.1,0,7);c.fill();}
  if(kind==='bolt')line([[w*.58,h*.2],[w*.34,h*.56],[w*.54,h*.54],[w*.4,h*.88],[w*.7,h*.46],[w*.5,h*.48],[w*.62,h*.2]]);}
export function paintNote(c,w,h,col){c.fillStyle=col;c.fillRect(0,0,w,h);c.fillStyle='rgba(0,0,0,.05)';c.fillRect(0,0,w,h*.16);const g=c.createLinearGradient(w*.7,h,w,h*.7);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.06)');c.fillStyle=g;c.fillRect(0,0,w,h);}
export const PH=[{fn:topo,seed:11,a:1.25},{fn:halftone,seed:5,a:1.25},{fn:scribbleBall,seed:23,a:1.25},{fn:hatch,seed:41,a:1.25},{fn:rings,seed:8,a:1.25}];
export function placeholderCanvas(p,w){const cv=document.createElement('canvas'),h=Math.round(w*p.a);cv.width=w;cv.height=h;const c=cv.getContext('2d');c.fillStyle=C.paper;c.fillRect(0,0,w,h);p.fn(c,w,h,p.seed);return cv;}

/* ---------- things the sections tell each other ---------- */
/* the ticker shows the live top score (set by the leaderboard), visitor number and who is here */
export const TK={top:'beat the game, be the first on the board',visitor:0,last:null,here:0,late:false,build:()=>{}};
/* the rodeo's state, so the leaderboard refresh and others can ask if a ride is on */
export const GAME={running:()=>false};
