/* rodeo: the lasso game and its leaderboard.
   Ported from the original page, unchanged apart from where it starts (initRodeo) and the few
   lines marked below. The Supabase project and key are the original's (see shared.js). */
import { blockData, DRAFT_PREVIEW, reduce, rng, sbHeaders, SCOREBOARD, TK } from './shared.js';

export function initRodeo(){
const D=blockData('rodeo');if(!D)return;
const LB_ON=D.showLeaderboard!==false;
/* ---------- tumbleweed: a scribbled ball, drawn once ---------- */
(()=>{const r=rng(14);let d='';let a=0;for(let i=0;i<70;i++){a+=0.7+r()*1.3;const rr=8+r()*9;const x=20+Math.cos(a)*rr,y=20+Math.sin(a)*rr;d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);}const tp=document.getElementById('tumblePath');if(tp)tp.setAttribute('d',d);})();

/* coyote skeleton, after Alex's brush-ink reference */
/* coyote skeleton, brush ink — standing, head low, facing left. Local box 124 x 60, feet on y=60 */
function coyoteSprite(SC,seed){
  const W=124,H=60,c=document.createElement('canvas');c.width=W*SC;c.height=H*SC;const x=c.getContext('2d');x.scale(SC,SC);
  const r=rngC(seed);x.strokeStyle='#000';x.fillStyle='#000';x.lineCap='round';x.lineJoin='round';
  const br=(pts,w0,w1)=>{for(let i=1;i<pts.length;i++){const u=i/(pts.length-1);x.lineWidth=w0+(w1-w0)*u;x.beginPath();x.moveTo(pts[i-1][0],pts[i-1][1]);x.lineTo(pts[i][0],pts[i][1]);x.stroke();}};
  const q=(a,b,cx,cy,n=10)=>Array.from({length:n+1},(_,i)=>{const t=i/n;return[(1-t)*(1-t)*a[0]+2*(1-t)*t*cx+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*cy+t*t*b[1]];});
  /* skull */
  x.beginPath();x.moveTo(30,17);x.quadraticCurveTo(22,15,15,22);x.lineTo(3,33);x.quadraticCurveTo(1,36,5,36.5);x.lineTo(22,32);x.quadraticCurveTo(31,29,33,23);x.closePath();x.fill();
  br(q([5,39.5],[25,34],13,38.5),2.6,3.4);                       // lower jaw
  br([[6,35.5],[6.6,39]],1.8,1.2);br([[17,33.4],[17.6,36.8]],1.6,1.1); // canines
  /* neck vertebrae */
  for(let k=0;k<4;k++){const a=33+k*3.4,b=21-k*1.5;br([[a,b],[a+2.2,b-.8]],3.4,3);}
  /* spine with dorsal spikes */
  const sp=q([45,15],[95,17],70,5,26);br(sp,4.4,3.2);
  for(let i=1;i<sp.length-1;i++){const[a,b]=sp[i],[c2,d]=sp[i+1],ang=Math.atan2(d-b,c2-a)-Math.PI/2-.25,L=4+r()*4.5;br([[a,b],[a+Math.cos(ang)*L,b+Math.sin(ang)*L]],2.1,.9);}
  /* shoulder blade + a curl, like the reference's spirals */
  x.beginPath();x.moveTo(45,15);x.lineTo(53,17);x.lineTo(50,31);x.closePath();x.fill();
  /* ribs hanging back from the spine to the belly line */
  for(let k=0;k<8;k++){const i=5+k*2,[a,b]=sp[i],L=15+Math.sin((k+1)/9*Math.PI)*9-k*.6;br(q([a,b+1],[a+6,b+L],a-4,b+L*.62,7),3.3,1.5);}
  /* front legs: humerus, forearm, paw */
  br([[50,28],[45,41]],3.8,3);br([[45,41],[47,56]],3,2.4);br([[43,58.5],[51,58.5]],2.6,2.2);
  br([[54,30],[56,42]],3.2,2.6);br([[56,42],[55,56]],2.6,2.2);br([[52,58.5],[59,58.5]],2.4,2);
  /* pelvis */
  x.beginPath();x.moveTo(89,14);x.lineTo(101,17);x.lineTo(98,24);x.lineTo(90,22);x.closePath();x.fill();
  /* hind legs: femur forward, tibia back, hock down */
  br([[95,21],[89,36]],4,3);br([[89,36],[99,45]],3,2.6);br([[99,45],[98,56]],2.6,2.2);br([[95,58.5],[103,58.5]],2.4,2);
  br([[100,22],[96,36]],3.2,2.6);br([[96,36],[106,45]],2.6,2.2);br([[106,45],[106,56]],2.4,2);br([[103,58.5],[110,58.5]],2.2,1.8);
  /* tail vertebrae drooping */
  const tl=q([102,17],[120,36],116,18,7);for(let i=0;i<tl.length-1;i++){const[a,b]=tl[i],[c2,d]=tl[i+1];br([[a+(c2-a)*.15,b+(d-b)*.15],[a+(c2-a)*.7,b+(d-b)*.7]],3-i*.25,2.6-i*.25);}
  /* ink press: soft edge + grain, then a hard threshold */
  const o=document.createElement('canvas');o.width=c.width;o.height=c.height;const ox=o.getContext('2d');ox.filter='blur('+(SC*.45)+'px)';ox.drawImage(c,0,0);ox.filter='none';
  const im=ox.getImageData(0,0,o.width,o.height),d=im.data,OW=o.width,OH=o.height,nr=rngC(seed+7),cell=Math.max(1,Math.round(SC*.6)),gw=Math.ceil(OW/cell)+1,g=new Float32Array(gw*(Math.ceil(OH/cell)+1)).map(()=>nr()-.5);
  for(let y=0;y<OH;y++)for(let xx=0;xx<OW;xx++){const p=(y*OW+xx)*4,a=d[p+3]/255+g[((y/cell)|0)*gw+((xx/cell)|0)]*.5+(nr()-.5)*.12;d[p]=20;d[p+1]=21;d[p+2]=22;d[p+3]=a>.5?255:0;}
  ox.putImageData(im,0,0);
  ox.globalCompositeOperation='destination-out';ox.beginPath();ox.arc(22*SC,24*SC,3.6*SC,0,Math.PI*2);ox.fill();
  ox.beginPath();ox.ellipse(11*SC,31.5*SC,3.2*SC,.8*SC,-.6,0,Math.PI*2);ox.fill();
  ox.beginPath();ox.arc(49*SC,21*SC,1.6*SC,0,Math.PI*2);ox.fill();ox.globalCompositeOperation='source-over';
  return {canvas:o,w:W,h:H};}
function rngC(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e9)/1e9;};}
/* rodeo sprites: every obstacle pressed in the same ink as the horse (built once, after the page settles) */
const SPRITES=(()=>{const TAU=Math.PI*2;
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1e9)/1e9;};}
/* ink press: draw with brush strokes, soften, then threshold against grain, same as the horse and coyote */
function press(W,H,draw,seed,holes){const SC=3,c=document.createElement('canvas');c.width=W*SC;c.height=H*SC;const x=c.getContext('2d');x.scale(SC,SC);x.fillStyle=x.strokeStyle='#000';x.lineCap='round';x.lineJoin='round';
  draw(x,rng(seed));
  const o=document.createElement('canvas');o.width=c.width;o.height=c.height;const ox=o.getContext('2d');ox.filter='blur(1.3px)';ox.drawImage(c,0,0);ox.filter='none';
  const im=ox.getImageData(0,0,o.width,o.height),d=im.data,OW=o.width,OH=o.height,nr=rng(seed+7),cell=2,gw=Math.ceil(OW/cell)+1,g=new Float32Array(gw*(Math.ceil(OH/cell)+1)).map(()=>nr()-.5);
  for(let y=0;y<OH;y++)for(let xx=0;xx<OW;xx++){const p=(y*OW+xx)*4,a=d[p+3]/255+g[((y/cell)|0)*gw+((xx/cell)|0)]*.5+(nr()-.5)*.12;d[p]=20;d[p+1]=21;d[p+2]=22;d[p+3]=a>.5?255:0;}
  ox.putImageData(im,0,0);
  if(holes){ox.globalCompositeOperation='destination-out';ox.save();ox.scale(SC,SC);holes(ox);ox.restore();ox.globalCompositeOperation='source-over';}
  return {c:o,w:W,h:H};}
const br=(x,pts,w0,w1)=>{for(let i=1;i<pts.length;i++){const u=i/(pts.length-1);x.lineWidth=w0+(w1-w0)*u;x.beginPath();x.moveTo(pts[i-1][0],pts[i-1][1]);x.lineTo(pts[i][0],pts[i][1]);x.stroke();}};
const q=(a,b,cx,cy,n=10)=>Array.from({length:n+1},(_,i)=>{const t=i/n;return[(1-t)*(1-t)*a[0]+2*(1-t)*t*cx+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*cy+t*t*b[1]];});
/* ---- vulture: soaring silhouette, 4 wing positions ---- */
function vultureFrame(f){const flap=[-.7,-.2,.45,0][f];return press(90,40,(x,r)=>{
  const cx=45,cy=22;
  [-1,1].forEach(sd=>{const wr=[cx+sd*19,cy-5+flap*10],tp=[cx+sd*31,cy-3+flap*17],tb=[cx+sd*27,cy+5+flap*14];
    x.beginPath();x.moveTo(cx+sd*2,cy-2);x.quadraticCurveTo(cx+sd*10,cy-6+flap*5,wr[0],wr[1]);x.lineTo(tp[0],tp[1]);x.lineTo(tb[0],tb[1]);x.quadraticCurveTo(cx+sd*12,cy+8+flap*6,cx+sd*2,cy+5);x.closePath();x.fill();
    /* fingered primaries fanned out past the wingtip */
    const ang=Math.atan2(tp[1]-cy,(tp[0]-cx));for(let k=0;k<5;k++){const u=k/4,bx=tp[0]+(tb[0]-tp[0])*u,by=tp[1]+(tb[1]-tp[1])*u,a=ang+(sd>0?1:-1)*(-.35+u*.75);const L=10-Math.abs(u-.35)*4;br(x,[[bx,by],[bx+Math.cos(a)*L*(sd>0?1:1),by+Math.sin(a)*L]],2.4,1.1);}
  });
  x.beginPath();x.ellipse(cx,cy+2,5.5,5,0,0,TAU);x.fill();                         // body
  x.beginPath();x.moveTo(cx-3.5,cy+5);x.lineTo(cx+3.5,cy+5);x.lineTo(cx+1,cy+12);x.lineTo(cx-1,cy+12);x.closePath();x.fill(); // tail
  for(let k=0;k<6;k++){const a=-2.6+k*.32;br(x,[[cx-1,cy-2],[cx-1+Math.cos(a)*4.5,cy-2+Math.sin(a)*4.5]],2.2,1.2);} // shaggy ruff
  br(x,q([cx-1,cy-3],[cx-6,cy-10],cx-1,cy-9,6),2.6,2);                             // bare neck
  x.beginPath();x.ellipse(cx-7,cy-11,2.9,2.4,-.2,0,TAU);x.fill();                  // head
  br(x,[[cx-9,cy-12],[cx-12.4,cy-11],[cx-11.6,cy-8.8]],1.9,1.2);                   // hooked beak
},31+f,(x)=>{x.beginPath();x.arc(45-7.6,22-11.6,.75,0,TAU);x.fill();});}

/* ---- rattlesnake: coiled, head raised, rattle shakes ---- */
function snakeFrame(f){return press(60,34,(x,r)=>{
  /* coil: thick spiral lying on the ground */
  const pts=[];for(let i=0;i<=60;i++){const t=i/60,a=TAU*1.6*t+.4,rr=4+t*13;pts.push([34+Math.cos(a)*rr*1.25,27+Math.sin(a)*rr*.42]);}
  br(x,pts,5.6,4.6);
  /* raised S-neck and head facing left */
  const nk=[...q([24,25],[17,14],14,24,8),...q([17,14],[9,8],19,7,6).slice(1)];br(x,nk,4.6,3.6);
  x.beginPath();x.moveTo(10,5);x.quadraticCurveTo(2,6,1,9);x.quadraticCurveTo(4,11.5,11,11);x.closePath();x.fill();
  if(f%2===0)br(x,[[1.5,9],[-2,8.4],[-3.2,7.2]],1,.8),br(x,[[-2,8.4],[-3.2,9.6]],.8,.8); // tongue flick
  /* rattle up at the back */
  const sh=f%2?1.2:-1.2;br(x,q([49,25],[53+sh*.4,18],53,24,5),3.6,2.6);for(let k=0;k<5;k++){x.beginPath();x.ellipse(53.4+sh*(k/4),17.4-k*2.3,2.6-k*.3,1.25,sh*.08,0,TAU);x.fill();}
  /* diamond back markings come out of the ink as paper */
},51+f,(x)=>{x.beginPath();x.arc(7.2,7.6,.8,0,TAU);x.fill();for(let i=0;i<9;i++){const t=.18+i*.09,a=TAU*1.6*t+.4,rr=4+t*13;const px=34+Math.cos(a)*rr*1.25,py=27+Math.sin(a)*rr*.42;x.save();x.translate(px,py);x.rotate(a+Math.PI/2);x.beginPath();x.moveTo(-1.6,0);x.lineTo(0,-1);x.lineTo(1.6,0);x.lineTo(0,1);x.closePath();x.fill();x.restore();}});}

/* ---- longhorn skull ---- */
const skull=()=>press(96,30,(x,r)=>{
  const cx=48;
  /* horns sweep out and up */
  [-1,1].forEach(s=>{br(x,q([cx+s*6,14],[cx+s*44,3],cx+s*30,20,14),5.4,1.8);});
  /* skull face, long and tapering to the nose */
  x.beginPath();x.moveTo(cx-9,10);x.quadraticCurveTo(cx,6,cx+9,10);x.lineTo(cx+6,22);x.quadraticCurveTo(cx+4,29,cx,29.5);x.quadraticCurveTo(cx-4,29,cx-6,22);x.closePath();x.fill();
  br(x,[[cx-12,12],[cx+12,12]],3,3);
},71,(x)=>{const cx=48;x.beginPath();x.ellipse(cx-4,15,2.4,3,.3,0,TAU);x.fill();x.beginPath();x.ellipse(cx+4,15,2.4,3,-.3,0,TAU);x.fill();
  x.beginPath();x.ellipse(cx-1.6,26,.9,1.6,0,0,TAU);x.fill();x.beginPath();x.ellipse(cx+1.6,26,.9,1.6,0,0,TAU);x.fill();
  for(let k=0;k<3;k++){x.fillRect(cx-.4,18+k*2,.8,1.2);}});

/* ---- dust devil: a twisting funnel ---- */
function devilFrame(f){return press(44,60,(x,r)=>{
  for(let k=0;k<14;k++){const t=k/13,y=58-t*54,w=4+t*16,ph=f*.7+k*1.1;const pts=[];for(let i=0;i<=10;i++){const u=i/10,a=ph+u*Math.PI;pts.push([22+Math.cos(a)*w+Math.sin(t*5+f*.6)*3,y+Math.sin(a)*w*.22]);}
    br(x,pts,1.4+t*1.6,.9+t*1.2);}
  for(let k=0;k<9;k++){const t=r(),y=56-t*50,w=6+t*18,a=r()*TAU;x.beginPath();x.arc(22+Math.cos(a)*w,y,1+r()*1.2,0,TAU);x.fill();}
},91+f);}

/* ---- wagon wheel: rolls toward you ---- */
const wheel=()=>press(46,46,(x,r)=>{
  const c=23;x.lineWidth=4.6;x.beginPath();x.arc(c,c,19,0,TAU);x.stroke();x.lineWidth=2;x.beginPath();x.arc(c,c,15.6,0,TAU);x.stroke();
  for(let k=0;k<10;k++){const a=k/10*TAU;br(x,[[c+Math.cos(a)*4,c+Math.sin(a)*4],[c+Math.cos(a)*16,c+Math.sin(a)*16]],2.8,2);}
  x.beginPath();x.arc(c,c,5.4,0,TAU);x.fill();
},101,(x)=>{x.beginPath();x.arc(23,23,1.6,0,TAU);x.fill();});

function walkerFrame(f){return press(48,66,(x,r)=>{const cx=24,base=50,sw=[1,-1,0,0][f],tw=8;
  x.beginPath();x.moveTo(cx-tw/2,base);x.lineTo(cx-tw/2,10);x.arc(cx,10,tw/2,Math.PI,0);x.lineTo(cx+tw/2,base);x.closePath();x.fill();
  const arm=(sd,h,len,ph)=>{const y=h+Math.sin(f*1.6+ph)*3;br(x,[[cx+sd*3,y],[cx+sd*12,y]],5.5,5.5);br(x,[[cx+sd*12,y],[cx+sd*12,y-len]],5.5,4.6);};
  arm(-1,30,10,0);arm(1,24,12,2);
  br(x,[[cx-2,base],[cx-2+sw*7,base+8],[cx-4+sw*9,base+15]],3.4,2.6);br(x,[[cx+2,base],[cx+2-sw*7,base+8],[cx-sw*9,base+15]],3.4,2.6);
},221+f,(x)=>{x.lineWidth=.9;x.strokeStyle='#000';x.beginPath();x.moveTo(24,12);x.lineTo(24,48);x.stroke();x.beginPath();x.arc(22.4,16,1,0,TAU);x.arc(25.6,16,1,0,TAU);x.fill();x.beginPath();x.arc(24,20.4,1.6,0,Math.PI);x.stroke();});}
const EYE=()=>[0,1,2].map(f=>press(70,56,(x)=>{const cx=35,cy=28,op=[1,.45,.06][f];
  for(let i=0;i<14;i++){const a=i/14*TAU,r1=21,r2=i%2?30:35,ca=Math.cos(a),sa=Math.sin(a);x.lineWidth=2.6;x.beginPath();for(let k=0;k<=10;k++){const u=k/10,r=r1+(r2-r1)*u,w=Math.sin(u*Math.PI*2.5+i)*2*Math.min(1,u*3),px=cx+ca*r-sa*w,py=cy+sa*r*.78+ca*w;k?x.lineTo(px,py):x.moveTo(px,py);}x.stroke();}
  x.beginPath();x.moveTo(cx-19,cy);x.quadraticCurveTo(cx,cy-16*op-2,cx+19,cy);x.quadraticCurveTo(cx,cy+16*op+2,cx-19,cy);x.fill();},331+f,
  (x)=>{const cx=35,cy=28,op=[1,.45,.06][f];if(op<.1){x.lineWidth=1;x.beginPath();x.moveTo(cx-15,cy);x.lineTo(cx+15,cy);x.stroke();return;}x.save();x.beginPath();x.moveTo(cx-16,cy);x.quadraticCurveTo(cx,cy-13*op,cx+16,cy);x.quadraticCurveTo(cx,cy+13*op,cx-16,cy);x.clip();
  x.beginPath();x.arc(cx,cy,9,0,TAU);x.arc(cx,cy,4,0,TAU,true);x.fill('evenodd');for(let k=0;k<10;k++){const a=k/10*TAU;x.fillRect(cx+Math.cos(a)*5.4-.4,cy+Math.sin(a)*5.4-.4,.8,.8);}x.restore();}));

const driftFrames=()=>[0,1].map(f=>press(40,80,(x)=>{const cx=18,sw=f?1:-1;
  x.beginPath();x.ellipse(cx,12,15,3.2,0,0,TAU);x.fill();x.beginPath();x.moveTo(cx-7,12);x.lineTo(cx-6,3);x.quadraticCurveTo(cx,0,cx+6,3);x.lineTo(cx+7,12);x.closePath();x.fill();
  x.beginPath();x.arc(cx,17,4,0,TAU);x.fill();
  x.beginPath();x.moveTo(cx-3,20);x.lineTo(cx-16,44);x.lineTo(cx+14,44);x.lineTo(cx+4,20);x.closePath();x.fill();
  for(let k=0;k<8;k++)br(x,[[cx-15+k*4,44],[cx-15.5+k*4,48]],1.2,1);
  br(x,[[cx+5,24],[cx+15,20],[cx+19,10]],2.6,2.2);
  br(x,[[cx-3,44],[cx-3+sw*4,60],[cx-4+sw*6,76]],3,2.4);br(x,[[cx+3,44],[cx+3-sw*4,60],[cx+2-sw*6,76]],3,2.4);
  br(x,[[cx-6+sw*6,77],[cx+sw*6,77]],2.6,2.6);br(x,[[cx-sw*6,77],[cx+6-sw*6,77]],2.6,2.6);},401+f));

return ()=>({DRIFT:driftFrames(),V:[0,1,2,3].map(vultureFrame),SN:[0,1].map(snakeFrame),SKULL:skull(),DV:[0,1,2,3,4,5].map(devilFrame),WHEEL:wheel(),WALK:[0,1,2,3].map(walkerFrame),EYE:EYE()});})();
/* ---------- rodeo: woodcut — Muybridge's gallop (1878, public domain) pressed into ink, cowboy hat + lasso drawn on ---------- */
const rc=document.getElementById('rodeo');if(!rc)return;const rctx=rc.getContext('2d');
const RINK='#141516',RPAPER='#FBFBF8',RTAU=Math.PI*2;
const RIDER={"frames":15,"w":318,"h":169,"heads":[[179,11],[178,9],[180,9],[178,9],[179,10],[181,8],[180,8],[182,9],[171,9],[180,8],[181,9],[169,10],[171,10],[183,9],[183,12]],"ground":168};
const RIDER_SRC=window.__RIDER_DATA||'/rider.png'; /* the sprite sheet from the repo root, copied into the build */
let RW=0,RH=0,rdpr=1,rodeoOn=false,press=null;
const G={state:'idle',y:0,vy:0,score:0,hi:0,speed:5.4,obs:[],next:0,ground:0,hold:false,last:0,acc:0,cause:'',stride:0,lvl:1,flash:0,dist:0,streak:0,mult:1,airPassed:false,intro:[],queue:[],pops:[],drifter:null,talk:[],lastTalk:0,nextRandom:0,bestSaid:false,now:0};
/* levels: each lasts longer than the last and brings in one new idea; speed steps up at each new level, not in between */
const LEVELS=[null,
  {at:0,   v:5.4,gap:1,   add:['cactus','scorp','tumble'],note:''},
  {at:400, v:6.0,gap:.95, add:['snake','bones'],note:'RATTLESNAKES AND BONES'},
  {at:1000,v:6.6,gap:.9,  add:['vglide','skull'],note:'STAY LOW FOR VULTURES'},
  {at:1800,v:7.2,gap:.86, add:['vswoop','wheel','pair'],note:'SWOOPS AND RUNAWAY WHEELS'},
  {at:2800,v:7.8,gap:.82, add:['devil','triple'],note:'DUST DEVILS'},
  {at:4000,v:8.4,gap:.78, add:['hawk'],note:'WATCH THE HAWK'},
  {at:5500,v:9.0,gap:.74, add:['walker','watcher'],note:'THE WEIRD WEST'}];
const WEIGHT={cactus:5,scorp:3,tumble:2,snake:3,bones:2,vglide:2,skull:2,vswoop:2,wheel:2,pair:2,devil:2,triple:1.5,hawk:1.5,walker:2,watcher:1.5};
/* set pieces: short runs that make you jump, then hold back */
const PATTERNS=[{min:4,seq:['skull','vglide']},{min:4,seq:['cactus','vswoop']},{min:5,seq:['snake','devil']},{min:6,seq:['wheel','vglide']},{min:7,seq:['walker','watcher']}];
const LV=()=>LEVELS[Math.min(LEVELS.length-1,G.lvl)];
const POOL=()=>{const out=[];for(let i=1;i<=Math.min(G.lvl,LEVELS.length-1);i++)out.push(...LEVELS[i].add);return out;};
let SP=null;const sprites=()=>SP||(SP=SPRITES());
(window.requestIdleCallback||(f=>setTimeout(f,400)))(()=>sprites());
try{G.hi=+localStorage.getItem('aoost-rodeo-hi')||0;}catch(e){}
/* ink press: the photo's darkness, doubled in size, plus grain, then a hard threshold */
function inkNoise(w,h,seed){const r=rng(seed),n=new Float32Array(w*h);for(let i=0;i<n.length;i++)n[i]=r()-.5;
  const o=new Float32Array(w*h),at=(x,y)=>n[((y+h)%h)*w+((x+w)%w)];for(let y=0;y<h;y++)for(let x=0;x<w;x++)o[y*w+x]=(at(x,y)*2+at(x+1,y)+at(x-1,y)+at(x,y+1)+at(x,y-1))/6*1.7+n[y*w+x]*.45;return o;}
const riderImg=new Image();riderImg.decoding='async';riderImg.onload=()=>{const W=RIDER.w*2,H=RIDER.h*2,src=document.createElement('canvas');src.width=W;src.height=H;const sc=src.getContext('2d',{willReadFrequently:true});
  const out=document.createElement('canvas');out.width=W;out.height=H;const oc=out.getContext('2d'),img=oc.createImageData(W,H),nz=inkNoise(W,H,91),cache=new Map();
  press={canvas:out,W,H,frame(f){if(cache.has(f))return cache.get(f);sc.clearRect(0,0,W,H);sc.drawImage(riderImg,f*RIDER.w,0,RIDER.w,RIDER.h,0,0,W,H);
    const d=sc.getImageData(0,0,W,H).data,o=img.data;for(let i=0,p=0;i<W*H;i++,p+=4){const a=d[p+3]/255*.86+nz[i]*.2;o[p]=20;o[p+1]=21;o[p+2]=22;o[p+3]=a>.5?255:0;}
    const fc=document.createElement('canvas');fc.width=W;fc.height=H;fc.getContext('2d').putImageData(img,0,0);cache.set(f,fc);return fc;}};
  drawRodeo(performance.now());};
riderImg.src=RIDER_SRC;
function sizeRodeo(){rdpr=Math.min(2,devicePixelRatio||1);const r=rc.getBoundingClientRect();RW=r.width;RH=r.height;rc.width=Math.max(1,RW*rdpr);rc.height=Math.max(1,RH*rdpr);}
new ResizeObserver(()=>{sizeRodeo();drawRodeo(performance.now());}).observe(rc);
/* on phones the canvas grows downward: the extra ground is a thumb pad, so your thumb never covers the play area */
const PAD=()=>RW<=640?112:0,PLAYH=()=>RH-PAD();
/* the horse is drawn at 80% of the size the physics and obstacles are tuned for, so every jump clears with room to spare */
const BASE=()=>Math.min(PLAYH()*.5/RIDER.h,RW*.44/RIDER.w);
const KS=()=>Math.max(.55,Math.min(1,BASE()/.888)),GY=()=>PLAYH()-38, RSC=()=>BASE()*.8, RX=()=>Math.max(6,RW*.04);
function startRodeo(){lbHideForm();sprites();Object.assign(G,{state:'run',y:0,vy:0,score:0,speed:5.4,obs:[],next:RW*1.15,ground:0,stride:0,lvl:1,flash:0,dist:0,streak:0,mult:1,airPassed:false,intro:[],queue:[],pops:[],drifter:null,talk:[],lastTalk:-1e9,nextRandom:G.now+28000,bestSaid:false,startHi:G.hi});setTimeout(()=>{if(G.state==='run')say('start');},700);}
function press_(){if(G.state!=='run'){startRodeo();return;}if(G.y>=0){G.vy=-12.6*KS();G.hold=true;}}
function release(){G.hold=false;if(G.vy<-5*KS())G.vy=-5*KS();}
rc.addEventListener('pointerdown',e=>{e.preventDefault();rc.classList.remove('kbd');press_();});rc.addEventListener('keydown',()=>rc.classList.add('kbd'));
rc.addEventListener('pointerup',release);rc.addEventListener('pointercancel',release);
addEventListener('keydown',e=>{if(e.key!==' '&&e.key!=='ArrowUp')return;if(document.activeElement!==rc&&G.state!=='run')return;if(!rodeoOn)return;e.preventDefault();if(!e.repeat)press_();});
addEventListener('keyup',e=>{if(e.key===' '||e.key==='ArrowUp')release();});
const COY=coyoteSprite(3,5),COYS=.44;
function cactus(x,h){h=(h||30+Math.random()*26)*KS();return{k:'cactus',x,w:h*.62,h,arms:Math.random()<.7};}
/* top of the rider's hat when the horse is on the ground: overhead things fly just above it */
const RIDER_TOP=()=>GY()-(RIDER.ground-2)*RSC()-14*RSC();
function make(type,X){const k=KS(),s=RSC(),S=sprites(),dim=(spr,m)=>[spr.w*m*k,spr.h*m*k];let o,extra=0;
  switch(type){
    case 'cactus':o=cactus(X);break;
    case 'scorp':o={k:'scorp',x:X,w:40*k,h:16*k,s:k};break;
    case 'tumble':o={k:'tumble',x:X,w:24*k,h:24*k,s:k,seed:(Math.random()*1e4)|0,hop:(G.lvl>=4?40:26)*k};break;
    case 'bones':o={k:'bones',x:X,w:COY.w*COYS*k,h:COY.h*COYS*k};break;
    case 'pair':{const a=cactus(X),b=cactus(X+a.w+4,26+Math.random()*16);G.obs.push(a);o=b;extra=a.w+4;break;}
    case 'triple':{const a=cactus(X,30+Math.random()*10),b=cactus(X+a.w+2,40+Math.random()*12),c=cactus(X+a.w+b.w+4,28+Math.random()*10);G.obs.push(a,b);o=c;extra=a.w+b.w+4;break;}
    case 'snake':{const[w,h]=dim(S.SN[0],1.25);o={k:'snake',x:X,w,h,lunge:0};break;}
    case 'skull':{const[w,h]=dim(S.SKULL,.8);o={k:'skull',x:X,w,h};break;}
    case 'wheel':{const[w,h]=dim(S.WHEEL,1.1);o={k:'wheel',x:X,w,h,v:1.55};break;}
    case 'devil':{const[w,h]=dim(S.DV[0],1.4);o={k:'devil',x:X,w,h,ph:Math.random()*6};extra=40*k;break;}
    case 'walker':{const[w,h]=dim(S.WALK[0],1.4);o={k:'walker',x:X,w,h,v:1.45};break;}
    case 'vglide':{const[w,h]=dim(S.V[0],1.3);o={k:'vglide',x:X,w,h,v:1.3};extra=w+RIDER.w*s;break;}
    case 'vswoop':{const[w,h]=dim(S.V[0],1.05);o={k:'vswoop',x:X,w,h,v:.95};extra=w+RIDER.w*s*.5;break;}
    case 'hawk':{const[w,h]=dim(S.V[0],.9);o={k:'hawk',x:X,y0:14,w,h,v:1.15,drop:RW*(.94+Math.random()*.05),dropped:false};extra=RW*.25;break;}
    case 'watcher':{const[w,h]=dim(S.EYE[0],1.3);o={k:'watcher',x:X,w,h,v:.55,t:0};extra=RW*.5;break;}
  }
  G.obs.push(o);return extra+(o.w||0);}
function spawn(){const L=LV(),k=KS();let type,extra=0,alone=false;
  if(G.queue.length)type=G.queue.shift();
  else if(G.intro.length){type=G.intro.shift();alone=true;}
  else{const pats=PATTERNS.filter(p=>G.lvl>=p.min);if(pats.length&&Math.random()<.15){const p=pats[(Math.random()*pats.length)|0];type=p.seq[0];G.queue.push(...p.seq.slice(1));}
    else{const pool=POOL(),ws=pool.map(t=>(t==='cactus'&&G.lvl>=4?3:WEIGHT[t]||1));let r=Math.random()*ws.reduce((a,b)=>a+b,0),i=0;while((r-=ws[i])>0)i++;type=pool[Math.min(i,pool.length-1)];}}
  extra=make(type,RW+20);
  /* never closer than a landing plus a fresh jump; a new hazard gets the stage to itself */
  const min=G.speed*k*50+RIDER.w*RSC()*.9;G.next=Math.max(min,(300+Math.random()*300)*L.gap*k+G.speed*k*22)*(alone?1.5:1)+extra;}
function devilX(o){return o.x+Math.sin(o.ph+G.ground*.012)*30*KS();}
function swoopBottom(o){const s=RSC(),rel=(o.x+o.w/2-(RX()+RIDER.w*s*.55))/RW,dip=rel>.42?Math.exp(-Math.pow((rel-.42)/.14,2)):rel<-.45?Math.exp(-Math.pow((rel+.45)/.12,2)):1,hi=RIDER_TOP()-6*s,lo=GY()-4*KS();return hi+(lo-hi)*dip;}
function eyeOpen(o){const ph=(o.t%150)/150;return ph<.62;}
/* each hitbox is a rectangle; a hit only counts where it overlaps the horse's actual ink (see inkHit) */
function hitbox(o){const gy=GY(),k=KS();switch(o.k){
  case 'bones':return[o.x+o.w*.06,gy-o.h*.82,o.x+o.w*.94,gy];
  case 'tumble':{const by=-Math.abs(Math.sin(o.x*.032))*(o.hop||26);return[o.x+4,gy+by-o.h+4,o.x+o.w-4,gy+by-3];}
  case 'cactus':{const tw=o.w*.38;return o.arms?[o.x+2,gy-o.h*.8,o.x+o.w-2,gy]:[o.x+(o.w-tw)/2,gy-o.h,o.x+(o.w+tw)/2,gy];}
  case 'snake':{const y=o.falling?o.fy:gy-o.h;return[o.x+o.w*.08,y+o.h*.2,o.x+o.w*.92,y+o.h];}
  case 'skull':return[o.x+o.w*.12,gy-o.h*.55,o.x+o.w*.88,gy];
  case 'wheel':return[o.x+o.w*.12,gy-o.h*.88,o.x+o.w*.88,gy];
  case 'devil':{const x=devilX(o);return[x+o.w*.2,gy-o.h*.95,x+o.w*.8,gy];}
  case 'walker':return[o.x+o.w*.12,gy-o.h*.92,o.x+o.w*.88,gy-2];
  case 'vglide':{const top=RIDER_TOP()-6*RSC()-o.h;return[o.x+o.w*.08,top+o.h*.25,o.x+o.w*.92,top+o.h*.8];}
  case 'vswoop':{const b=swoopBottom(o);return[o.x+o.w*.2,b-o.h*.68,o.x+o.w*.8,b-o.h*.25];}
  case 'watcher':{if(!eyeOpen(o))return null;const cx=o.x+o.w/2;return[cx-16*k,gy-22*k,cx+16*k,gy];}
  case 'hawk':return null;
  default:return[o.x+4,gy-o.h+2,o.x+o.w-4,gy];}}
function myBox(){const s=RSC(),x=RX(),w=RIDER.w*s;return[x+w*.2,GY()+G.y-(RIDER.ground-6)*s,x+w*.9,GY()+G.y];}
/* the horse's own ink decides a hit: an obstacle only counts when it overlaps solid ink in the frame being drawn */
const maskCache=new Map();
function maskOf(fr){if(maskCache.has(fr))return maskCache.get(fr);const fc=press.frame(fr),d=fc.getContext('2d').getImageData(0,0,press.W,press.H).data,m=new Uint8Array(press.W*press.H);
  for(let i=0;i<m.length;i++)m[i]=d[i*4+3]>0?1:0;
  /* erode by 2px so stray grain on the outline doesn't count */
  const W=press.W,H=press.H,e=new Uint8Array(m.length);for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){const i=y*W+x;e[i]=m[i]&m[i-2]&m[i+2]&m[i-2*W]&m[i+2*W];}
  maskCache.set(fr,e);return e;}
function curFrame(){return G.y<0?0:Math.floor(G.stride)%RIDER.frames;}
function inkHit(b){if(!press)return true;const s=RSC(),k=2/s,ox=RX(),oy=GY()+G.y-(RIDER.ground-1)*s,m=maskOf(curFrame()),W=press.W,H=press.H;
  const x0=Math.max(0,Math.floor((b[0]-ox)*k)),x1=Math.min(W-1,Math.ceil((b[2]-ox)*k)),y0=Math.max(0,Math.floor((b[1]-oy)*k)),y1=Math.min(H-1,Math.ceil((b[3]-oy)*k));
  for(let y=y0;y<=y1;y+=2)for(let x=x0;x<=x1;x+=2)if(m[y*W+x])return true;return false;}
/* the drifter: stands by the road at every new level, holding a sign. You never stop. */
const DRIFT_SIGNS=['TUCSON?','TUCSON. PLEASE.','ANYWHERE, HONESTLY','I CAN SEE YOU SEEING ME','WALKING IS FINE. THANKS.','NEVER MIND. GOT A RIDE ↑'];
/* who says what: R is the rider (deadpan), H is the horse (fed up). A pair is a back-and-forth. */
const TALK={
  start:[['H','WE’RE DOING THIS AGAIN?'],['R','LET’S NOT MAKE IT A WHOLE THING.'],['R','SAME AS LAST TIME. BUT BETTER.']],
  s10:[['R','SHOULD’VE BET MONEY ON THIS.'],[['R','SHOULD’VE BET MONEY ON THIS.'],['H','ON ME. YOU BET ON ME.']],['H','I’M DOING ALL THE LEGS HERE.']],
  s20:[['R','I COULD DO THIS ASLEEP.'],[['R','I COULD DO THIS ASLEEP.'],['H','PLEASE DON’T SLEEP UP THERE.']],[['R','THEY’LL PUT US ON A STAMP.'],['H','I’D BE THE GOOD SIDE.']],['H','MY HOOVES ARE ON FIRE.']],
  s30:[['R','FRANKLY, THIS IS TOO EASY.'],[['R','I’M RETIRING AFTER THIS.'],['H','WE’RE IN THE MIDDLE OF IT.']],['H','I CAN SEE MY ANCESTORS.'],['R','SOMEONE GET THIS ON TAPE.']],
  close:[['R','THAT CACTUS FELT THAT.'],['R','HAT STAYED ON. BARELY.'],['R','I MEANT TO DO THAT.'],['H','THAT WAS MY KNEE.'],['H','WARN ME NEXT TIME.'],['H','FELT THAT IN MY HOOVES.']],
  air:[['R','JUMPING AT AIR. BOLD.'],['R','PRACTICE JUMP.'],['H','WHY DID WE JUMP.'],['H','WHAT WAS THAT FOR.']],
  vglide:[['R','STAYED LOW. RESPECT.'],['H','I DIDN’T SIGN UP FOR BIRDS.']],
  vswoop:[['H','IT LOOKED AT ME.'],['R','NOT TODAY, BIRD.']],
  bones:[['R','HE DIDN’T MAKE IT.'],['H','I’M NOT ENDING UP LIKE HIM.']],
  hawk:[[['H','WHO THROWS A SNAKE?'],['R','A HAWK, APPARENTLY.']]],
  watcher:[['R','DON’T MAKE EYE CONTACT.'],['H','IT’S ALWAYS WATCHING.'],[['H','IS THAT THE SUN?'],['R','KEEP RIDING.']]],
  drifter:[['H','WHO IS THAT MAN WITH THE SIGN.'],['H','WE SHOULD STOP. WE WON’T. BUT WE SHOULD.'],['H','HE’S BEEN THERE SINCE MORNING.'],['H','I THINK HE’S FOLLOWING US.'],['H','I’D GIVE HIM A LIFT. YOU WOULDN’T.']],
  best:[['R','NEW BEST. FRAME IT.'],['H','TELL MY MOTHER.']],
  random:[['R','COULD’VE TAKEN THE TRAIN.'],['R','THIS ROPE IS JUST FOR LOOKS.'],['R','ONE DAY I’LL NAME THIS HORSE.'],['R','DUST IN EVERYTHING. AGAIN.'],['R','SUN’S OUT. HAT’S ON. FINE.'],['H','THE SUN IS TOO WIGGLY.'],['H','MY BACK.'],['H','ARE WE THERE YET.']],
  over:[['H','I’M TAKING THE WEEKEND.'],['H','THAT ONE’S ON YOU.'],['H','I’M LYING DOWN NOW.'],['H','SAME TIME TOMORROW? NO.'],['H','TELL THE CACTUS I SAID HI.']]};
/* one line every few seconds at most; game over and new bests always get through */
function say(id,force){const set=TALK[id];if(!set)return;if(!force&&(G.now-G.lastTalk<11000||G.talk.length))return;const pick=set[(Math.random()*set.length)|0],seq=typeof pick[0]==='string'?[pick]:pick;
  if(force)G.talk=[];seq.forEach(([who,line],i)=>G.talk.push({who,line,born:G.now+i*1200}));G.lastTalk=G.now+(seq.length-1)*1200;}
const CAUSE={cactus:'pricked.',scorp:'stung.',tumble:'tumbled.',bones:'boned.',snake:'bitten.',skull:'gored.',wheel:'run over.',devil:'whirled.',walker:'hugged.',vglide:'snatched.',vswoop:'snatched.',watcher:'seen.'};
function stepRodeo(f){const k=KS(),wasUp=G.y<0;G.vy+=.56*k*f;G.y+=G.vy*f;if(G.y>0){G.y=0;G.vy=0;}
  /* landing: a jump that cleared nothing breaks the streak */
  if(wasUp&&G.y===0){if(!G.airPassed){if(G.streak>=3&&Math.random()<.35)say('air');G.streak=0;}G.airPassed=false;}
  G.dist+=G.speed*f*.025;
  const nl=LEVELS.findLastIndex?LEVELS.findLastIndex(l=>l&&G.dist>=l.at):LEVELS.reduce((a,l,i)=>l&&G.dist>=l.at?i:a,1);
  if(nl>G.lvl){G.lvl=nl;G.flash=150;G.intro.push(...LEVELS[nl].add.filter(t=>t!=='pair'&&t!=='triple'));
    /* a breather: no new hazards for a moment, and the drifter is by the road */
    G.next=Math.max(G.next,G.speed*KS()*95);G.drifter={x:RW+10,lv:nl,said:false};}if(G.flash>0)G.flash-=f;
  const L=LV(),tgt=Math.min(11,L.v+(G.lvl>=LEVELS.length-1?Math.max(0,G.dist-L.at)/2000*.3:0));G.speed+=(tgt-G.speed)*.02*f;
  G.mult=1+Math.min(4,Math.floor(G.streak/5))*.25;
  if(G.drifter){G.drifter.x-=G.speed*k*f*.55;if(!G.drifter.said&&G.drifter.x<RX()+RIDER.w*RSC()*.9){G.drifter.said=true;say('drifter');}if(G.drifter.x<-220)G.drifter=null;}
  if(!G.bestSaid&&G.startHi>50&&G.score>G.startHi){G.bestSaid=true;say('best',true);}
  if(G.now>G.nextRandom){G.nextRandom=G.now+50000+Math.random()*30000;say('random');}
  const mv=G.speed*k*f;G.ground+=mv;G.stride+=mv*.075/k;G.score+=G.speed*f*.025*G.mult;
  G.next-=mv;if(G.next<=0)spawn();
  const S=sprites(),me=myBox(),gy=GY();
  for(const o of G.obs){o.x-=mv*(o.v||1);
    if(o.k==='watcher')o.t+=f;
    if(o.k==='snake'&&!o.falling&&o.lunge<1&&o.x-me[2]<90*k){const d=Math.min(1-o.lunge,.08*f);o.lunge+=d;o.x-=d*14*k;}
    if(o.k==='snake'&&o.falling){o.fvy+=1.4*f;o.fy+=o.fvy*f;if(o.fy+o.h>=gy){o.fy=gy-o.h;o.falling=false;}}
    if(o.k==='hawk'&&!o.dropped&&o.x+o.w*.4<o.drop){o.dropped=true;const[w,h]=[S.SN[0].w*1.25*k,S.SN[0].h*1.25*k];G.obs.push({k:'snake',x:o.x+o.w*.3,w,h,lunge:1,falling:true,fy:o.y0+o.h*.7,fvy:0,fromHawk:true});}
    /* passing the horse: streaks and close calls */
    const b=hitbox(o);
    if(b&&b[0]<me[2]&&b[2]>me[0]&&G.y<0){const gap=b[1]-(gy+G.y);if(gap>=0)o.minGap=Math.min(o.minGap??1e9,gap);}
    if(!o.passed&&o.k!=='hawk'&&(b?b[2]:o.x+o.w)<me[0]){o.passed=true;G.streak++;if(G.y<0)G.airPassed=true;
      if(G.streak===10)say('s10');else if(G.streak===20)say('s20');else if(G.streak===30)say('s30');
      else if(o.k==='watcher')say('watcher');else if(o.fromHawk)say('hawk');
      if(o.minGap!=null&&o.minGap<9*k){const bonus=Math.round(25*G.mult);G.score+=bonus;G.pops.push({t:'CLOSE +'+bonus,x:me[0]+30,y:gy+G.y-RIDER.h*RSC()*.6,life:60});if(Math.random()<.35)say('close');}}}
  G.obs=G.obs.filter(o=>o.x>-o.w-120);
  G.pops.forEach(p=>{p.life-=f;p.y-=.4*f;});G.pops=G.pops.filter(p=>p.life>0);
  for(const o of G.obs){const b=hitbox(o);if(b&&me[0]<b[2]&&me[2]>b[0]&&me[1]<b[3]&&me[3]>b[1]&&inkHit(b)){G.state='over';G.cause=o.k;say('over',true);const s=Math.floor(G.score);if(s>G.hi){G.hi=s;try{localStorage.setItem('aoost-rodeo-hi',String(s));}catch(e){}}lbOffer(s);break;}}}
function line(c,pts){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.stroke();}
function hatAndLasso(c,h,t){const[x,y]=h;c.fillStyle=RINK;c.strokeStyle=RINK;c.lineCap='round';c.lineJoin='round';
  c.beginPath();c.moveTo(x-14,y+6.5);c.quadraticCurveTo(x,y+9.5,x+15,y+5);c.lineTo(x+13.5,y+7.6);c.quadraticCurveTo(x,y+12,x-13,y+8.6);c.closePath();c.fill();
  c.beginPath();c.moveTo(x-6.5,y+7.5);c.lineTo(x-5.5,y-3.5);c.quadraticCurveTo(x-2,y-6.5,x+.5,y-4);c.quadraticCurveTo(x+3,y-6.5,x+6,y-3.5);c.lineTo(x+7,y+7);c.closePath();c.fill();
  c.save();c.strokeStyle=RPAPER;c.lineWidth=1;c.beginPath();c.moveTo(x-6,y+4.6);c.lineTo(x+6.6,y+4.4);c.stroke();c.restore();
  const spin=t*.011,lx=x+4,ly=y-16,rx=26,ry=5.5+Math.sin(spin*2)*1.2;c.lineWidth=1.9;c.beginPath();c.ellipse(lx,ly,rx,ry,Math.sin(spin)*.08,0,RTAU);c.stroke();
  c.beginPath();c.moveTo(x+9,y+20);c.quadraticCurveTo(x+13,y+2,lx+Math.cos(spin)*rx,ly+Math.sin(spin)*ry);c.stroke();}
function cactusArt(c,x,gy,w,h,arms){const tw=w*.38,tx=x+(w-tw)/2;c.beginPath();c.moveTo(tx,gy+1);c.lineTo(tx,gy-h+tw/2);c.arc(tx+tw/2,gy-h+tw/2,tw/2,Math.PI,0);c.lineTo(tx+tw,gy+1);c.closePath();c.fill();
  if(arms){const aw=Math.max(4,tw*.6);c.lineWidth=aw;c.beginPath();c.moveTo(tx+1,gy-h*.42);c.lineTo(x+aw/2,gy-h*.42);c.lineTo(x+aw/2,gy-h*.68);c.stroke();c.beginPath();c.moveTo(tx+tw-1,gy-h*.56);c.lineTo(x+w-aw/2,gy-h*.56);c.lineTo(x+w-aw/2,gy-h*.8);c.stroke();}
  c.save();c.strokeStyle=RPAPER;c.lineWidth=1.2;line(c,[[tx+tw/2,gy-h*.85],[tx+tw/2,gy-4]]);c.restore();}
function scorpArt(c,x,gy,t){const b=gy-6;c.beginPath();c.ellipse(x+20,b,13,5,0,0,RTAU);c.fill();c.lineWidth=3.4;
  c.beginPath();c.moveTo(x+32,b-1);c.quadraticCurveTo(x+45,b-4,x+43,b-17);c.quadraticCurveTo(x+41,b-25,x+31,b-22);c.stroke();line(c,[[x+31,b-22],[x+35,b-17]]);
  line(c,[[x+8,b-1],[x+1,b-3],[x-3,b-7]]);line(c,[[x-3,b-7],[x-7,b-4]]);line(c,[[x-3,b-7],[x+1,b-10]]);
  c.lineWidth=2.4;const k=Math.sin(t*.03)*1.5;[12,18,24].forEach(lx=>line(c,[[x+lx,b+3],[x+lx-2+k,gy]]));}
function tumbleArt(c,o){const by=-Math.abs(Math.sin(o.x*.032))*(o.hop||26),cx=o.x+o.w/2,cy=GY()+by-o.h/2;const r=rng(o.seed);c.save();c.translate(cx,cy);c.rotate(-o.x*.06);c.scale(o.s||1,o.s||1);c.lineWidth=2.4;c.beginPath();let a=0;
  for(let i=0;i<42;i++){a+=.8+r()*1.2;const rr=5+r()*8,px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();c.restore();}
/* the drifter is pressed in ink like everything else, then tinted to the mesa grey */
const greyCache=new Map();function greyed(spr){if(greyCache.has(spr))return greyCache.get(spr);const g=document.createElement('canvas');g.width=spr.c.width;g.height=spr.c.height;const x=g.getContext('2d');x.drawImage(spr.c,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#C9CAC5';x.fillRect(0,0,g.width,g.height);greyCache.set(spr,g);return g;}
function roadSign(c,ax,ay,text,S){c.save();c.font=`500 ${Math.round(9*S)}px "JetBrains Mono", ui-monospace, monospace`;const words=text.split(' '),lines=[];let cur='';
  words.forEach(w=>{const tr=cur?cur+' '+w:w;if(c.measureText(tr).width>110*S&&cur){lines.push(cur);cur=w;}else cur=tr;});lines.push(cur);
  const lw=Math.max(...lines.map(l=>c.measureText(l).width))+14*S,lh=11*S,bh=lines.length*lh+10*S,bx=ax-lw/2,by=ay-bh-14*S;
  c.strokeStyle='#C9CAC5';c.lineWidth=2.4*S;c.lineCap='round';c.beginPath();c.moveTo(ax,ay);c.lineTo(ax,by+bh);c.stroke();
  c.fillStyle='#F4F4EF';c.beginPath();c.moveTo(bx,by+1);c.lineTo(bx+lw,by-1.5*S);c.lineTo(bx+lw+1,by+bh);c.lineTo(bx-1,by+bh+1.5*S);c.closePath();c.fill();c.lineWidth=1.6*S;c.stroke();
  c.fillStyle='#8E908C';c.textAlign='center';lines.forEach((l,i)=>c.fillText(l,ax,by+8*S+lh*(i+.7)));c.restore();}
/* speech bubbles: the rider's is outlined paper, the horse's is solid ink; each tail points at whoever is talking */
function bubble(c,b,t){const age=(t-b.born)/2400,a=Math.min(1,age*8,(1-age)*5),fs=10.5*Math.max(.85,KS());c.save();c.globalAlpha=a;c.font=`500 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
  const words=b.line.split(' '),lines=[];let cur='';const maxW=Math.min(170,RW*.5);words.forEach(w=>{const tr=cur?cur+' '+w:w;if(c.measureText(tr).width>maxW&&cur){lines.push(cur);cur=w;}else cur=tr;});lines.push(cur);
  const R=b.who==='R',[ax,ay]=G.talkAt[b.who],lh=fs*1.25,w=Math.max(...lines.map(l=>c.measureText(l).width))+16,h=lines.length*lh+10;
  let bx=R?ax-w*.35:ax+12,by=R?ay-h-16:ay-h-26;if(G.state==='over')by=Math.max(by,PLAYH()*.27+34);bx=Math.max(6,Math.min(RW-w-6,bx));by=Math.max(30,by);
  const below=by>ay,tx=Math.max(bx+12,Math.min(bx+w-12,ax)),ey=below?by:by+h;
  c.lineWidth=1.6;c.strokeStyle=RINK;c.fillStyle=R?RPAPER:RINK;c.lineJoin='round';
  c.beginPath();c.moveTo(tx-5,ey);c.lineTo(ax,ay);c.lineTo(tx+6,ey);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(bx+8,by);c.lineTo(bx+w-8,by);c.quadraticCurveTo(bx+w,by,bx+w,by+8);c.lineTo(bx+w,by+h-8);c.quadraticCurveTo(bx+w,by+h,bx+w-8,by+h);c.lineTo(bx+8,by+h);c.quadraticCurveTo(bx,by+h,bx,by+h-8);c.lineTo(bx,by+8);c.quadraticCurveTo(bx,by,bx+8,by);c.closePath();c.fill();c.stroke();
  c.fillRect(tx-4,ey-(below?-1:2),9,2.2);
  c.fillStyle=R?RINK:RPAPER;c.textAlign='left';lines.forEach((l,i)=>c.fillText(l,bx+8,by+5+lh*(i+.8)));c.restore();}
function drawRodeo(t){if(!RW)return;const c=rctx,gy=GY();c.setTransform(rdpr,0,0,rdpr,0,0);c.fillStyle=RPAPER;c.fillRect(0,0,RW,RH);c.lineCap='round';c.lineJoin='round';c.strokeStyle=RINK;c.fillStyle=RINK;
  /* brush sun */
  const sz=Math.max(.62,KS()),sx=RW-62*sz,sy=52*sz;c.save();c.translate(sx,sy);c.scale(sz,sz);c.translate(-sx,-sy);c.lineWidth=4.6;c.beginPath();c.arc(sx,sy,14,0,RTAU);c.stroke();
  c.lineWidth=3.4;const wob=reduce?0:t*.004;for(let i=0;i<10;i++){const a=i/10*RTAU+.2,r1=21,r2=i%2?34:42,ca=Math.cos(a),sa=Math.sin(a),amp=2.6,ph=i*1.7+wob;c.beginPath();
    for(let k=0;k<=12;k++){const u=k/12,r=r1+(r2-r1)*u,w=Math.sin(u*Math.PI*2.5+ph)*amp*Math.min(1,u*3),px=sx+ca*r-sa*w,py=sy+sa*r+ca*w;k?c.lineTo(px,py):c.moveTo(px,py);}c.stroke();}c.restore();
  /* mesas */
  c.save();c.globalAlpha=.13;const off=(G.ground*.15)%340;c.beginPath();for(let k=-1;k*340-off<RW+340;k++){const b=k*340-off;c.moveTo(b,gy);c.lineTo(b+40,gy);c.lineTo(b+56,gy-28);c.lineTo(b+120,gy-28);c.lineTo(b+132,gy-11);c.lineTo(b+180,gy-11);c.lineTo(b+192,gy-36);c.lineTo(b+236,gy-36);c.lineTo(b+248,gy);c.lineTo(b+340,gy);}c.lineTo(RW+400,gy+1);c.lineTo(-400,gy+1);c.closePath();c.fill();c.restore();
  /* woodcut ground with chisel marks */
  c.beginPath();c.moveTo(0,gy);for(let x=0;x<=RW;x+=10)c.lineTo(x,gy+Math.sin((x+G.ground)*.07)*1.2);c.lineTo(RW,RH);c.lineTo(0,RH);c.closePath();c.fill();
  c.save();c.strokeStyle=RPAPER;c.lineWidth=1.5;for(let i=0;i<18;i++){const px=((i*83-G.ground)%(RW+40)+RW+40)%(RW+40)-20,py=gy+9+(i*11%22)+(PAD()?(i*29%34):0);c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+6,py-2,px+12+(i%3)*5,py);c.stroke();}c.restore();
  if(PAD()){const py=gy+38+PAD()/2;c.save();c.fillStyle=RPAPER;c.strokeStyle=RPAPER;c.globalAlpha=G.state==='run'?.28:.75;c.lineWidth=1.5;c.beginPath();c.arc(RW/2,py-14,12,0,RTAU);c.stroke();c.beginPath();c.arc(RW/2,py-14,4,0,RTAU);c.fill();c.textAlign='center';c.font='400 10px "JetBrains Mono", ui-monospace, monospace';c.fillText('TAP HERE TO JUMP · HOLD FOR HIGHER',RW/2,py+16);c.restore();}
  if(G.drifter&&SP){const d=G.drifter,SS=Math.max(.75,Math.min(1.3,RW/560))*Math.max(.7,KS()),fr=greyed(SP.DRIFT[Math.floor(t/260)%2]),w=SP.DRIFT[0].w*SS,h=SP.DRIFT[0].h*SS;
    c.drawImage(fr,d.x,gy-h+2,w,h);roadSign(c,d.x+w*.92,gy-h*.88+2,DRIFT_SIGNS[Math.max(0,Math.min(5,d.lv-2))],SS);}
  const S=SP;G.obs.forEach(o=>{const k=KS();
    if(o.k==='cactus')cactusArt(c,o.x,gy,o.w,o.h,o.arms);
    else if(o.k==='bones')c.drawImage(COY.canvas,o.x,gy-o.h+1,o.w,o.h);
    else if(o.k==='scorp'){c.save();c.translate(o.x,gy);c.scale(o.s||1,o.s||1);scorpArt(c,0,0,t);c.restore();}
    else if(o.k==='tumble')tumbleArt(c,o);
    else if(!S)return;
    else if(o.k==='snake'){const fr=S.SN[Math.floor(t/90)%2];c.drawImage(fr.c,o.x,o.falling?o.fy:gy-o.h+2,o.w,o.h);}
    else if(o.k==='skull')c.drawImage(S.SKULL.c,o.x,gy-o.h+2,o.w,o.h);
    else if(o.k==='wheel'){c.save();c.translate(o.x+o.w/2,gy-o.h/2+1);c.rotate(-G.ground/(o.w/2)*1.55);c.drawImage(S.WHEEL.c,-o.w/2,-o.h/2,o.w,o.h);c.restore();}
    else if(o.k==='devil')c.drawImage(S.DV[Math.floor(t/70)%6].c,devilX(o),gy-o.h+3,o.w,o.h);
    else if(o.k==='walker')c.drawImage(S.WALK[Math.floor(G.ground/14)%4].c,o.x,gy-o.h+4,o.w,o.h);
    else if(o.k==='vglide'){const top=RIDER_TOP()-6*RSC()-o.h+Math.sin(t*.003)*3;c.drawImage(S.V[Math.floor(t/110)%4].c,o.x,top,o.w,o.h);}
    else if(o.k==='vswoop'){const b=swoopBottom(o),hi=RIDER_TOP()-6*RSC(),d=Math.max(0,Math.min(1,(b-hi)/Math.max(1,gy-hi)));c.save();c.globalAlpha=.12+.3*d;c.fillStyle=RINK;c.beginPath();c.ellipse(o.x+o.w/2,gy+3,o.w*(.25+.2*d),3.2,0,0,RTAU);c.fill();c.restore();}
    if(o.k==='vswoop')c.drawImage(S.V[Math.floor(t/90)%4].c,o.x,swoopBottom(o)-o.h,o.w,o.h);
    else if(o.k==='hawk'){c.drawImage(S.V[Math.floor(t/100)%4].c,o.x,o.y0,o.w,o.h);if(!o.dropped){const sn=S.SN[0];c.save();c.translate(o.x+o.w*.5,o.y0+o.h*.75);c.rotate(1.2);c.drawImage(sn.c,-8,0,sn.w*.7*k,sn.h*.7*k);c.restore();}}
    else if(o.k==='watcher'){const ph=(o.t%150)/150,fr=ph<.62?0:ph<.68?1:ph<.8?2:ph<.86?1:0,cx=o.x+o.w/2,ey=34;
      if(ph<.62){c.save();c.lineWidth=1;c.globalAlpha=.85;for(let i=0;i<12;i++){const v=i/11;c.beginPath();c.moveTo(cx-7*k+v*14*k,ey+o.h*.62);c.lineTo(cx-16*k+v*32*k,gy);c.stroke();}c.restore();
        c.save();c.lineWidth=2;for(let i=0;i<5;i++){const fx=cx-14*k+i*7*k,fl=6+Math.sin(t*.03+i*2)*4;c.beginPath();c.moveTo(fx,gy);c.lineTo(fx+2,gy-fl*k*1.6);c.stroke();}c.restore();}
      c.drawImage(S.EYE[fr].c,o.x,ey,o.w,o.h);}
  });
  G.pops.forEach(p=>{c.save();c.globalAlpha=Math.min(1,p.life/20);c.fillStyle=RINK;c.font='500 11px "JetBrains Mono", ui-monospace, monospace';c.textAlign='left';c.fillText(p.t,p.x,p.y);c.restore();});
  /* horse + rider */
  if(press){const s=RSC(),fr=G.state==='idle'?5:curFrame();
    c.save();c.translate(RX(),gy+G.y-(RIDER.ground-1)*s);c.scale(s,s);if(G.state==='over'){c.translate(RIDER.w*.5,RIDER.ground);c.rotate(-.1);c.translate(-RIDER.w*.5,-RIDER.ground);}
    c.imageSmoothingEnabled=true;c.drawImage(press.frame(fr),0,0,press.W,press.H,0,0,RIDER.w,RIDER.h);hatAndLasso(c,RIDER.heads[fr],reduce?0:t);c.restore();
    const ox=RX(),oy=gy+G.y-(RIDER.ground-1)*s,[hx,hy]=RIDER.heads[fr];G.talkAt={R:[ox+hx*s,oy+(hy-10)*s],H:[ox+RIDER.w*s*.86,oy+RIDER.h*s*.2]};}
  G.talk=G.talk.filter(b=>t-b.born<2400);G.talk.forEach(b=>{if(t>=b.born&&G.talkAt)bubble(c,b,t);});
  /* score */
  c.fillStyle=RINK;c.font='400 11px "JetBrains Mono", ui-monospace, monospace';c.textAlign='left';const pad=n=>String(n).padStart(5,'0');
  c.save();c.globalAlpha=.55;c.fillText('HI '+pad(G.hi),14,22);c.restore();c.fillText(pad(Math.floor(G.score)),100,22);if(G.state!=='idle'){c.save();c.globalAlpha=.55;c.fillText('LV '+G.lvl,172,22);c.restore();if(G.mult>1)c.fillText('×'+G.mult.toFixed(2).replace(/0$/,''),222,22);}
  if(G.state==='run'&&G.flash>0&&G.lvl>1){c.save();c.globalAlpha=Math.min(1,G.flash/20);c.textAlign='center';c.font='500 22px Lexend, sans-serif';c.fillText('level '+G.lvl,RW/2,PLAYH()*.3);c.font='400 10px "JetBrains Mono", ui-monospace, monospace';c.globalAlpha*=.6;c.fillText(LV().note||'FASTER',RW/2,PLAYH()*.3+18);c.restore();}
  c.textAlign='center';
  if(G.state==='idle'){c.font='400 12px "JetBrains Mono", ui-monospace, monospace';c.fillText('TAP TO RIDE',RW/2,PLAYH()*.3);}
  if(G.state==='over'){c.font='500 24px Lexend, sans-serif';c.fillText(CAUSE[G.cause]||'whoa.',RW/2,PLAYH()*.27);c.font='400 11px "JetBrains Mono", ui-monospace, monospace';c.save();c.globalAlpha=.6;c.fillText('TAP TO RIDE AGAIN',RW/2,PLAYH()*.27+22);c.restore();}}
/* leaderboard: top 10, kept on this device unless SCOREBOARD points at a shared Supabase table */
const lbForm=document.getElementById('lbForm'),lbName=document.getElementById('lbName'),lbList=document.getElementById('lbList');
let LB=[],lbPending=0,lbMine=-1;
const lbLocal=()=>{try{return JSON.parse(localStorage.getItem('aoost-rodeo-board')||'[]');}catch(e){return [];}};
const lbClean=n=>String(n||'').toUpperCase().replace(/[^A-Z0-9 ._-]/g,'').trim().slice(0,12)||'ANON';
/* the ticker shows the live top score */
function tickerTop(){const t=LB[0];TK.top=t?`beat the game, top score ${t.score} by ${t.name}`:'beat the game, be the first on the board';TK.build();}
function lbRender(){tickerTop();lbList.innerHTML='';if(!LB.length){lbList.innerHTML='<li class="empty">No riders yet. Be the first.</li>';return;}
  LB.slice(0,10).forEach((r,i)=>{const li=document.createElement('li');if(i===lbMine)li.className='me';li.innerHTML=`<span class="n">${String(i+1).padStart(2,'0')}</span><span></span><span>${String(r.score).padStart(5,'0')}</span>`;li.children[1].textContent=r.name;lbList.appendChild(li);});}
/* new-style Supabase keys go in the apikey header only; old JWT-style anon keys also go in Authorization */
const sbHeaders=extra=>Object.assign({apikey:SCOREBOARD.key},SCOREBOARD.key.startsWith('eyJ')?{Authorization:'Bearer '+SCOREBOARD.key}:{},extra||{});
let lbShared=false;
async function lbLoad(){if(SCOREBOARD){
    try{const r=await fetch(SCOREBOARD.url+'/rest/v1/scores?select=name,score&order=score.desc,created_at.asc&limit=10',{headers:sbHeaders(),cache:'no-store'});if(r.ok){LB=await r.json();lbShared=true;document.getElementById('lbScope').textContent='everyone';lbRender();return;}}catch(e){}}
  /* if the shared board can't be reached, fall back to this device's scores */
  lbShared=false;document.getElementById('lbScope').textContent='this device';LB=lbLocal();lbRender();}
/* keep the board fresh while it's on screen, so other riders' scores appear without a reload */
setInterval(()=>{if(SCOREBOARD&&!document.hidden&&G.state!=='run'&&lbForm.hidden)lbLoad();},60000);
function lbOffer(s){if(s<1||!LB_ON)return;const tenth=LB.length<10?0:LB[Math.min(9,LB.length-1)].score;if(s<=tenth)return;lbPending=s;document.getElementById('lbScore').textContent=String(s).padStart(5,'0');
  try{lbName.value=localStorage.getItem('aoost-rodeo-name')||'';}catch(e){}lbForm.hidden=false;}
function lbHideForm(){lbForm.hidden=true;lbPending=0;}
lbForm.addEventListener('submit',async e=>{e.preventDefault();if(!lbPending)return;const name=lbClean(lbName.value),score=lbPending;try{localStorage.setItem('aoost-rodeo-name',name);}catch(e){}
  lbHideForm();const row={name,score};
  if(SCOREBOARD&&!DRAFT_PREVIEW){try{await fetch(SCOREBOARD.url+'/rest/v1/scores',{method:'POST',headers:sbHeaders({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(row)});}catch(e){}}
  const loc=lbLocal();loc.push(row);loc.sort((a,b)=>b.score-a.score);try{localStorage.setItem('aoost-rodeo-board',JSON.stringify(loc.slice(0,10)));}catch(e){}
  await lbLoad();lbMine=LB.findIndex(r=>r.name===name&&r.score===score);lbRender();});
lbLoad();
if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>rodeoOn=e.isIntersecting)).observe(rc);else rodeoOn=true;
(function loop(t){const dt=Math.min(100,t-(G.last||t));G.last=t;G.now=t;if(rodeoOn){if(G.state==='run'){G.acc+=dt;let n=0;while(G.acc>=1000/60&&n<6){stepRodeo(1);G.acc-=1000/60;n++;}if(G.state!=='run')G.acc=0;}else G.acc=0;drawRodeo(reduce&&G.state!=='run'?0:t);}requestAnimationFrame(loop);})(performance.now());
}
