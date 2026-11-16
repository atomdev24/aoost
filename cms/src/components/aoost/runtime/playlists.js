/* playlists: a Figma canvas in dark mode, each cover a frame, the player a floating toolbar.
   Ported from the original page; the playlists come from the block's fields. */
import { blockData, fit, IN_CLAUDE, monkey, pinkField, skyField } from './shared.js';

/* a Spotify playlist link, URI or bare id -> the id */
const spotifyId=v=>{const m=/playlist[/:]([A-Za-z0-9]+)/.exec(v||'');return m?m[1]:String(v||'').replace(/[^A-Za-z0-9]/g,'');};

export function initPlaylists(){
const D=blockData('playlists');if(!D)return;
const PLAYLISTS=(D.playlists||[]).filter(p=>p&&p.spotify&&!p.hidden).map(p=>({title:p.title||'',id:spotifyId(p.spotify),cover:p.cover||null,color:p.color||null}));
/* ---------- playlist ---------- */
const COVER_PH=[monkey,pinkField,skyField];
const dEl=document.getElementById('discs');if(!dEl||!PLAYLISTS.length)return;dEl.innerHTML='';let curDisc=0;
/* a cover is your own file, else the Spotify cover (fetched on your live site), else a placeholder */
function coverInto(box,i,onReady){const d=PLAYLISTS[i];box.querySelectorAll('img,canvas').forEach(n=>n.remove());
  const src=d.cover||d.spCover;
  if(src){const img=new Image();img.alt='';img.decoding='async';if(!d.cover)img.crossOrigin='anonymous';
    img.onload=()=>{d.size=[img.naturalWidth,img.naturalHeight];onReady&&onReady(img);updateSel();};
    img.onerror=()=>{if(img.crossOrigin){img.removeAttribute('crossorigin');img.src=d.spThumb||src;}};
    img.src=src;box.prepend(img);return;}
  const cv=document.createElement('canvas');box.prepend(cv);const draw=()=>{const[c,w,h]=fit(cv);COVER_PH[i%3](c,w,h);onReady&&onReady(cv);};new ResizeObserver(draw).observe(cv);}
const shortTitle=d=>d.short||d.title;
/* Spotify calls them "Disc - 1 - Rock"; on the canvas that reads "Disc 1 · Rock" */
const frameName=(d,i)=>{const t=d.title||'';const m=t.match(/disc\s*-?\s*(\d+)\s*-\s*(.+)/i);return m?`Disc ${m[1]} · ${m[2]}`:(t.includes(' - ')?t.split(/\s+-\s+/).join(' · '):`Disc ${i+1} · ${t}`);};
PLAYLISTS.forEach((d,i)=>{const fr=document.createElement('div');fr.className='cv-frame';fr.dataset.on=i===0?1:0;
  const lab=document.createElement('span');lab.className='cv-fl';lab.textContent=frameName(d,i);
  const b=document.createElement('button');b.className='disc';if(d.color)b.style.background=d.color;b.setAttribute('aria-pressed',i===0);b.setAttribute('aria-label',shortTitle(d)+' playlist');coverInto(b,i);
  const sel=document.createElement('div');sel.className='cv-sel';sel.setAttribute('aria-hidden','true');sel.innerHTML='<i></i><i></i><i></i><i></i><em></em>';
  fr.append(lab,b,sel);dEl.appendChild(fr);d.el=b;d.lab=lab;
  b.addEventListener('click',()=>{if(i===curDisc)togglePlay();else selectDisc(i,true);});});
/* the selected frame gets Figma's selection box and size; a pink cursor glides over to it */
const cvIn=document.getElementById('cvIn'),cvCursor=document.getElementById('cvCursor');
function placeCursor(){const f=dEl.children[curDisc];if(!f)return;const r=cvIn.getBoundingClientRect(),q=f.querySelector('.disc').getBoundingClientRect();cvCursor.style.transform=`translate(${Math.round(q.left-r.left+q.width*.62)}px,${Math.round(q.top-r.top+q.height*.58)}px)`;}
function updateSel(){[...dEl.children].forEach((f,k)=>{f.dataset.on=k===curDisc?1:0;f.querySelector('.disc').setAttribute('aria-pressed',k===curDisc);const sz=PLAYLISTS[k].size||[640,640];f.querySelector('em').textContent=`${sz[0]} × ${sz[1]}`;});placeCursor();}
new ResizeObserver(placeCursor).observe(cvIn);

/* player: the floating toolbar */
const mw=document.getElementById('mw'),mwWave=document.getElementById('mwWave'),mwFill=document.getElementById('mwFill'),mwTime=document.getElementById('mwTime'),mwPlay=document.getElementById('mwPlay'),mwOpen=document.getElementById('mwOpen');
const P={playing:false,pos:0,dur:230000,ctrl:null,last:0,unlocked:false};
const TOUCH=matchMedia('(hover:none) and (pointer:coarse)').matches;
if(TOUCH&&!IN_CLAUDE){document.documentElement.classList.add('sp-touch');document.querySelector('.sp-host').removeAttribute('aria-hidden');}
const fmt=ms=>{const s=Math.max(0,Math.round(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=String(s%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${ss}`:`${String(m).padStart(2,'0')}:${ss}`;};
let lastSec=-1,lastPl=null;
function drawWave(){const f=P.dur?Math.min(1,P.pos/P.dur):0;mwFill.style.width=(f*100).toFixed(2)+'%';
  const sec=Math.floor(P.pos/1000);if(sec!==lastSec){lastSec=sec;mwWave.setAttribute('aria-valuenow',Math.round(f*100));mwWave.setAttribute('aria-valuetext',fmt(P.pos)+' of '+fmt(P.dur));mwTime.textContent=fmt(P.pos)+' / '+fmt(P.dur);}
  if(lastPl===P.playing)return;lastPl=P.playing;mwPlay.setAttribute('aria-label',P.playing?'Pause':'Play');
  mwPlay.innerHTML=P.playing?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';}
function selectDisc(i,user){curDisc=i;const d=PLAYLISTS[i];updateSel();
  document.getElementById('mwTitle').textContent=shortTitle(d);mwOpen.href='https://open.spotify.com/playlist/'+d.id;P.pos=0;lastSec=-1;
  if(P.ctrl){P.ctrl.loadUri('spotify:playlist:'+d.id);if(user&&(!TOUCH||P.unlocked)){P.playing=true;setTimeout(()=>P.ctrl&&P.ctrl.play(),400);}}else if(user){P.playing=true;P.last=performance.now();}
  drawWave();}
function togglePlay(){if(P.ctrl){P.ctrl.togglePlay();return;}P.playing=!P.playing;P.last=performance.now();drawWave();}
mwPlay.addEventListener('click',togglePlay);
document.getElementById('mwPrev').addEventListener('click',()=>selectDisc((curDisc+PLAYLISTS.length-1)%PLAYLISTS.length,true));
document.getElementById('mwNext').addEventListener('click',()=>selectDisc((curDisc+1)%PLAYLISTS.length,true));
function seekTo(e){const r=mwWave.getBoundingClientRect(),f=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));P.pos=f*P.dur;if(P.ctrl)P.ctrl.seek(Math.round(P.pos/1000));drawWave();}
let scrubbing=false;mwWave.addEventListener('pointerdown',e=>{scrubbing=true;mwWave.setPointerCapture(e.pointerId);seekTo(e);});mwWave.addEventListener('pointermove',e=>{if(scrubbing)seekTo(e);});
mwWave.addEventListener('pointerup',()=>scrubbing=false);mwWave.addEventListener('pointercancel',()=>scrubbing=false);
mwWave.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();P.pos=Math.max(0,Math.min(P.dur,P.pos+(e.key==='ArrowRight'?5000:-5000)));if(P.ctrl)P.ctrl.seek(Math.round(P.pos/1000));drawWave();}});
/* in this preview the player runs on its own clock; on your site Spotify drives it, and the bar glides between Spotify's updates */
(function loop(t){if(P.playing){P.pos+=Math.min(100,t-(P.last||t));if(P.pos>=P.dur)P.pos=P.ctrl?P.dur:0;drawWave();}P.last=t;requestAnimationFrame(loop);})(performance.now());
if(!IN_CLAUDE){window.onSpotifyIframeApiReady=API=>{API.createController(document.getElementById('spHost'),{uri:'spotify:playlist:'+PLAYLISTS[curDisc].id,width:'100%',height:TOUCH?152:80},c=>{P.ctrl=c;P.playing=false;
    c.addListener('playback_update',e=>{const d=e.data||{};P.playing=!d.isPaused;if(P.playing)P.unlocked=true;if(d.duration)P.dur=d.duration;if(typeof d.position==='number'&&(Math.abs(d.position-P.pos)>700||d.isPaused))P.pos=d.position;P.last=performance.now();drawWave();});});};
  const s=document.createElement('script');s.src='https://open.spotify.com/embed/iframe-api/v1';s.async=true;document.head.appendChild(s);}
selectDisc(0,false);
/* on your own site: pull each playlist's name and cover from Spotify (no login needed) */
if(!IN_CLAUDE){PLAYLISTS.forEach((d,i)=>{fetch('https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/'+d.id).then(r=>r.ok?r.json():null).then(j=>{if(!j)return;
  if(j.title){d.title=j.title;d.short=j.title.split(/\s+-\s+/).pop().trim()||j.title;d.el.setAttribute('aria-label',d.short+' playlist');d.lab.textContent=frameName(d,i);}
  if(j.thumbnail_url&&!d.cover){d.spThumb=j.thumbnail_url;d.spCover=j.thumbnail_url.replace('0000da84','0000bebb').replace('mosaic.scdn.co/300/','mosaic.scdn.co/640/');coverInto(d.el,i);}
  if(i===curDisc)document.getElementById('mwTitle').textContent=shortTitle(d);}).catch(()=>{});});}
}
