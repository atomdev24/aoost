/* hero: the artwork reel, the clock, and the ticker with late mode, visitor number and ghost cursors */
import { blockData, C, DRAFT_PREVIEW, fit, IN_CLAUDE, monkey, orangeField, overlays, PH, pinkField, placeholderCanvas, reduce, sbHeaders, SCOREBOARD, skyField, TK } from './shared.js';
import { openViewer } from './viewer.js';
import { startDotBoard } from './dots.js';
import { startPhantoms } from './phantoms.js';
import { startIntro } from './intro.js';

export function initHero(){
  const D=blockData('hero');if(!D)return;
  const TZ=D.timeZone||'Africa/Johannesburg';

  /* clock */
  const clock=document.getElementById('clock');
  if(clock){function tick(){try{clock.textContent=(D.clockLabel?D.clockLabel+' ':'')+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:TZ}).format(new Date());}catch(e){}}tick();setInterval(tick,15000);}

  /* ---------- header: full-width artwork slideshow — advances on its own, swipe to browse, tap to zoom ---------- */
  /* the opening: the screen tunes in before the artwork shows (intro.js); the reel waits for it */
  const introDone=startIntro(document.querySelector('.ao header.hero-rect'));
  const reel=document.getElementById('reel'),hrBar=document.getElementById('hrBar');
  if(reel&&hrBar){
    /* the strip's own images; left empty it reuses the projects' artwork, like the original */
    const projects=(blockData('projects')||{}).projects||[];
    const CAROUSEL=(D.reel||[]).filter(r=>r&&r.src),ARTWORK=projects.filter(p=>p&&p.image&&!p.hidden).map(p=>({src:p.image,alt:p.title,title:p.title,date:p.year?String(p.year):'',plaque:{title:p.title,medium:p.medium,year:p.year,note:p.note,link:p.link}}));
    const REEL=(CAROUSEL.length?CAROUSEL:ARTWORK).map(r=>({src:r.src,alt:r.alt,plaque:r.plaque,tone:r.tone,title:r.title,date:r.date}));
    const reelItems=REEL.length?REEL:[{fnArt:monkey},{ph:PH[0]},{fnArt:pinkField},{ph:PH[1]},{fnArt:skyField},{ph:PH[2]},{fnArt:orangeField},{ph:PH[4]}];
    reel.innerHTML='';
    reelItems.forEach((it,i)=>{const b=document.createElement('button');b.className='hr-slide';b.setAttribute('aria-label','Open artwork '+(i+1)+' of '+reelItems.length);
      if(it.src){const img=new Image();img.alt='';img.src=it.src;img.decoding='async';img.loading=i?'lazy':'eager';b.appendChild(img);}
      else{const cv=document.createElement('canvas');b.appendChild(cv);new ResizeObserver(()=>{const[c,w,h]=fit(cv);if(it.fnArt){it.fnArt(c,w,h);}else{c.fillStyle=C.paper;c.fillRect(0,0,w,h);const pc=placeholderCanvas(it.ph,400),s=Math.min(w/pc.width,h/pc.height)*.8;c.drawImage(pc,(w-pc.width*s)/2,(h-pc.height*s)/2,pc.width*s,pc.height*s);}}).observe(cv);}
      if(D.reelViewer!==false)b.addEventListener('click',()=>openViewer(reelItems,i,b));else{b.setAttribute('aria-label','Artwork '+(i+1)+' of '+reelItems.length);b.tabIndex=-1;}
      reel.appendChild(b);});
    /* text over the artwork (block option): kept in step with the artwork on show */
    const over=reel.parentNode.querySelector('.hr-over'),toneCache={};
    const toneOf=i=>{const it=reelItems[i]||{};if(it.tone)return Promise.resolve(it.tone);if(toneCache[i])return toneCache[i];
      return toneCache[i]=new Promise(res=>{if(!it.src)return res('#F3EFE6');const im=new Image();im.crossOrigin='anonymous';
        im.onload=()=>{try{const N=48,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,N,N);const d=g.getImageData(0,0,N,N).data;
          /* the most common vivid hue, averaged; failing that, the bright pixels (chrome, paper) */
          const bins={};let br=[0,0,0,0];for(let p=0;p<d.length;p+=4){const r=d[p],gg=d[p+1],b=d[p+2],mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),s=mx?(mx-mn)/mx:0;
            if(mx>150){br[0]+=r;br[1]+=gg;br[2]+=b;br[3]++;}
            if(s>.45&&mx>90){let h=0;const dd=mx-mn;h=mx===r?((gg-b)/dd)%6:mx===gg?(b-r)/dd+2:(r-gg)/dd+4;const k=Math.round(((h*60+360)%360)/24);const o=bins[k]||(bins[k]=[0,0,0,0]);o[0]+=r*s;o[1]+=gg*s;o[2]+=b*s;o[3]+=s;}}
          let best=null;for(const k in bins)if(!best||bins[k][3]>best[3])best=bins[k];
          let rgb=best&&best[3]>N*N*.012?[best[0]/best[3],best[1]/best[3],best[2]/best[3]]:br[3]?[br[0]/br[3],br[1]/br[3],br[2]/br[3]]:[243,239,230];
          /* light enough to read on the dark shade */
          const lift=Math.max(0,180-Math.max(...rgb));rgb=rgb.map(v=>Math.min(255,Math.round(v+lift)));
          res('#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join(''));}catch(e){res('#F3EFE6');}};
        im.onerror=()=>res('#F3EFE6');im.src=it.src;});};
    let overAt=-1;
    let overTexts=[];try{overTexts=JSON.parse(over&&over.dataset.texts||'[]');}catch(e){}
    const pad2=n=>String(n).padStart(2,'0');
    function overSlide(i){if(!over||i===overAt)return;overAt=i;const it=reelItems[i]||{},mode=over.dataset.over;
      /* this artwork's words: its title and date, else the fallback the page was built with */
      const x=overTexts[i]||{t:it.title||(overTexts[0]&&overTexts[0].t)||'',d:it.date||''};
      over.querySelectorAll('[data-ov="title"]').forEach(el=>{el.textContent=x.t;el.style.setProperty('--ch',Math.max(3,x.t.length));});
      over.querySelectorAll('[data-ov="date"]').forEach(el=>{el.textContent=x.d;});
      over.querySelectorAll('[data-ov="count"]').forEach(el=>{el.textContent=pad2(i+1)+' / '+pad2(reelItems.length);});
      over.querySelectorAll('[data-ov="kick"]').forEach(el=>{el.textContent=mode==='difference'&&!x.d?'':pad2(i+1)+(x.d?' · '+x.d:'');});
      if(mode==='cutout'){const cut=over.querySelector('.ov-cut');if(cut)cut.style.setProperty('--art',it.src?'url("'+it.src+'")':'none');}
      else if(mode==='tone'){toneOf(i).then(c=>{if(overAt===i)over.style.setProperty('--tone',c);});}
      else if(mode==='handwritten'){const hs=over.querySelectorAll('.ov-hw');if(!hs.length)return;const on=hs[i%hs.length];hs.forEach(h=>{if(h!==on)h.classList.remove('on');});on.classList.remove('on');void on.getBoundingClientRect();on.classList.add('on');}}
    /* behind the hero: a blurred, dimmed copy of the piece showing, so when the hero eases back on
       scroll (the focus effect) the gap around it is the artwork's own glow, never the light page */
    const amb=document.querySelector('.ao .hr-ambient');
    function ambientAt(i){if(!amb)return;const im=reel.children[i]&&reel.children[i].querySelector('img');const src=im&&(im.currentSrc||im.src);amb.style.setProperty('--amb',src?'url("'+src.replace(/"/g,'%22')+'")':'none');}
    function onSlide(i){overSlide(i);ambientAt(i);}
    if(amb){const im0=reel.children[0]&&reel.children[0].querySelector('img');if(im0&&!im0.complete)im0.addEventListener('load',()=>ambientAt(hrIdx||0),{once:true});}
    onSlide(0);
    let hrIdx=0,hrT0=performance.now(),hrHold=0,hrOn=true;const HR_DUR=Math.max(1000,(+D.reelSeconds||5.2)*1000);
    if(introDone){hrHold=Infinity;introDone.then(()=>{hrHold=0;hrT0=performance.now();});}
    ['pointerdown','touchstart','wheel','focusin'].forEach(ev=>reel.addEventListener(ev,()=>{hrHold=performance.now()+4000;},{passive:true}));
    let hrScrollT;reel.addEventListener('scroll',()=>{clearTimeout(hrScrollT);hrScrollT=setTimeout(()=>{hrIdx=Math.round(reel.scrollLeft/Math.max(1,reel.clientWidth));hrT0=performance.now();onSlide(hrIdx);},120);},{passive:true});
    if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>hrOn=e.isIntersecting)).observe(reel);
    /* the progress line grows with a transform (no layout each frame); it waits while the reel is off screen */
    let hrP=0;
    (function hrLoop(t){if(reduce||reelItems.length<2){hrBar.style.transform='scaleX(0)';return;}
      if(hrOn&&t>hrHold&&!document.hidden){hrP=Math.min(1,(t-hrT0)/HR_DUR);hrBar.style.transform='scaleX('+hrP+')';if(hrP>=1){hrIdx=(hrIdx+1)%reelItems.length;reel.scrollTo({left:hrIdx*reel.clientWidth,behavior:'smooth'});hrT0=t;hrP=0;onSlide(hrIdx);}}
      else{hrT0=t-hrP*HR_DUR;}
      requestAnimationFrame(hrLoop);})(performance.now());
  }

  /* ---- ticker, visitors, ghosts, late mode ---- */
  /* the strip is absent when the block switches the ticker off (showTicker:false); everything below copes with that */
  const tk=document.getElementById('ticker');
  const CLOVER_SVG=(document.querySelector('.ao .tk-c')||{}).innerHTML||'';
  let tkSig='';
  /* the dot board (the strip's other style): the same lines, breathing in one at a time */
  const dm=tk&&tk.classList.contains('dots')?tk.querySelector('canvas.dm'):null;
  const board=dm?startDotBoard(dm,{seconds:+tk.dataset.seconds||4,grid:tk.dataset.grid!=='off',after:tk.dataset.after||'loop',idleSpeed:+tk.dataset.idleSpeed||0.5,textSize:+tk.dataset.textSize||70,effect:tk.dataset.effect||'breathe',look:tk.dataset.look||'flat',lensOpts:(()=>{try{return JSON.parse(tk.dataset.lens||'{}');}catch(e){return {};}})(),base:tk.dataset.base||''}):null;
  /* the matte screen carried over the ticker: its shade and glare span hero + strip, so both need the real heights */
  if(tk&&tk.classList.contains('sc-joined')){const hr=document.querySelector('.ao header.hero-rect'),blk=tk.closest('.ao-b');if(hr&&blk){const size=()=>{blk.style.setProperty('--hero-h',hr.offsetHeight+'px');blk.style.setProperty('--tk-h',tk.offsetHeight+'px');};size();if('ResizeObserver' in window){const ro=new ResizeObserver(size);ro.observe(hr);ro.observe(tk);}}}
  function ago(t){const m=Math.floor((Date.now()-t)/60000);if(m<1)return'just now';if(m<60)return m+' min ago';const h=Math.floor(m/60);if(h<24)return h+(h===1?' hour':' hours')+' ago';const d=Math.floor(h/24);return d+(d===1?' day':' days')+' ago';}
  function tickerBuild(){
    if(!tk)return;
    const own=(D.ticker||[]).filter(t=>t&&t.text&&(t.mode==='both'||t.mode===(TK.late?'late':'day'))).map(t=>t.text);
    const items=own.concat(D.tickerTopScore===false||!TK.top?[]:[TK.top]);
    if(TK.visitor&&D.tickerVisitors!==false)items.push("you're visitor #"+String(TK.visitor).padStart(4,'0'));
    const pres=[];if(TK.last)pres.push('last here '+ago(TK.last));if(TK.here)pres.push(TK.here>1?TK.here+' here now':'just you here');
    if(pres.length&&D.tickerVisitors!==false)items.push(pres.join(' · '));
    const sig=items.join('|');if(sig===tkSig)return;tkSig=sig;
    if(board){board.setLines(items);if(items.length)tk.setAttribute('aria-label',items.join('. ')+'.');return;}
    const one=items.map(w=>{const sp=document.createElement('span');sp.className='tk-w';sp.textContent=w;return sp.outerHTML+'<span class="tk-c">'+CLOVER_SVG+'</span>';}).join('');
    const rep=items.length?Math.ceil(9/items.length):0,html=one.repeat(rep);
    document.querySelectorAll('#ticker .tk-half').forEach(h=>h.innerHTML=html);
    if(items.length)tk.setAttribute('aria-label',items.join('. ')+'.');else tk.removeAttribute('aria-label');}
  TK.build=tickerBuild;
  /* late mode: midnight to 5am in the clock's time zone (or ?late=1 to preview it) */
  function lateCheck(){const h=+new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'numeric',hourCycle:'h23'}).format(new Date());
    const late=D.lateMode!==false&&(/[?&]late=1/.test(location.search)||(h>=0&&h<5));if(late!==TK.late){TK.late=late;document.documentElement.classList.toggle('late',late);}tickerBuild();}
  lateCheck();setInterval(lateCheck,60000);

  /* The visitor counter and live presence write to Supabase, so they only run on the real site:
     never in the editor's draft preview, and not when the block switches them off. */
  const LIVE=!IN_CLAUDE&&!DRAFT_PREVIEW&&D.tickerVisitors!==false&&SCOREBOARD.url;
  /* visitor number + when someone was last here (Supabase table "visits") */
  if(LIVE){(async()=>{try{
    const base=SCOREBOARD.url+'/rest/v1/visits';
    const r=await fetch(base+'?select=id,created_at&order=id.desc&limit=1',{headers:sbHeaders(),cache:'no-store'});if(!r.ok)return;
    const last=(await r.json())[0];let mine=0;try{mine=+localStorage.getItem('aoost-visitor')||0;}catch(e){}
    if(last&&!(mine&&mine===last.id))TK.last=Date.parse(last.created_at);
    let logged=false;try{logged=!!sessionStorage.getItem('aoost-visit');}catch(e){}
    if(!logged){const w=await fetch(base,{method:'POST',headers:sbHeaders({'Content-Type':'application/json',Prefer:'return=representation'}),body:'{}'});
      if(w.ok){const row=(await w.json())[0];try{sessionStorage.setItem('aoost-visit','1');}catch(e){}
        if(!mine&&row){mine=row.id;try{localStorage.setItem('aoost-visitor',String(mine));}catch(e){}}}}
    if(mine)TK.visitor=mine;tickerBuild();}catch(e){}})();}
  /* who's here now + ghost cursors (Supabase Realtime, nothing stored) */
  if(LIVE){const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.js';s.async=true;
    s.onload=()=>{try{
      const sb=window.supabase.createClient(SCOREBOARD.url,SCOREBOARD.key,{auth:{persistSession:false,autoRefreshToken:false}});
      const me=Math.random().toString(36).slice(2,10),layer=document.createElement('div');layer.className='ghosts';layer.setAttribute('aria-hidden','true');overlays().appendChild(layer);
      const G={};
      const ghost=id=>{if(G[id])return G[id];const el=document.createElement('div');el.className='ghost';let hsh=0;for(const c of id)hsh=(hsh*31+c.charCodeAt(0))%360;
        el.innerHTML=`<svg viewBox="0 0 18 18"><path d="M2 1.5l13 6.2-5.6 1.6-2.4 5.3z" fill="hsl(${hsh} 85% 62%)" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>`;layer.appendChild(el);return G[id]={el,t:0};};
      const drop=id=>{if(G[id]){G[id].el.remove();delete G[id];}};
      const ch=sb.channel('aoost-room',{config:{presence:{key:me},broadcast:{self:false}}});
      ch.on('presence',{event:'sync'},()=>{const st=ch.presenceState();TK.here=Object.keys(st).length;Object.keys(G).forEach(id=>{if(!st[id])drop(id);});tickerBuild();});
      ch.on('broadcast',{event:'c'},({payload:p})=>{if(!p||p.id===me)return;const g=ghost(p.id);const H=document.documentElement.scrollHeight;
        g.el.style.left=(p.x*innerWidth)+'px';g.el.style.top=(p.y*H)+'px';g.el.classList.add('on');g.t=performance.now();});
      ch.subscribe(st=>{if(st==='SUBSCRIBED')ch.track({at:Date.now()});});
      setInterval(()=>{const n=performance.now();for(const id in G)if(n-G[id].t>6000)G[id].el.classList.remove('on');},1000);
      let lastSend=0;const send=e=>{const n=performance.now();if(n-lastSend<110||document.hidden)return;lastSend=n;
        ch.send({type:'broadcast',event:'c',payload:{id:me,x:+(e.clientX/innerWidth).toFixed(4),y:+(e.pageY/document.documentElement.scrollHeight).toFixed(4)}});};
      addEventListener('pointermove',send,{passive:true});addEventListener('pointerdown',send,{passive:true});
    }catch(e){}};document.head.appendChild(s);}
  /* simulated visitors: the odd cursor drifting through, like people browsing (?ghosts=demo shows them quickly) */
  const demo=/[?&]ghosts=demo/.test(location.search);
  if(demo||(D.phantoms&&!navigator.webdriver&&!IN_CLAUDE&&!reduce)){const pl=document.createElement('div');pl.className='ghosts';pl.setAttribute('aria-hidden','true');overlays().appendChild(pl);
    startPhantoms(pl,demo?'demo':D.phantomRate||'sometimes');}
}
