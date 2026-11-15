/* hero: the artwork reel, the clock, and the ticker with late mode, visitor number and ghost cursors */
import { blockData, C, DRAFT_PREVIEW, fit, IN_CLAUDE, monkey, orangeField, overlays, PH, pinkField, placeholderCanvas, reduce, sbHeaders, SCOREBOARD, skyField, TK } from './shared.js';
import { openViewer } from './viewer.js';

export function initHero(){
  const D=blockData('hero');if(!D)return;
  const TZ=D.timeZone||'Africa/Johannesburg';

  /* clock */
  const clock=document.getElementById('clock');
  if(clock){function tick(){try{clock.textContent=(D.clockLabel?D.clockLabel+' ':'')+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:TZ}).format(new Date());}catch(e){}}tick();setInterval(tick,15000);}

  /* ---------- header: full-width artwork slideshow — advances on its own, swipe to browse, tap to zoom ---------- */
  const reel=document.getElementById('reel'),hrBar=document.getElementById('hrBar');
  if(reel&&hrBar){
    /* the strip's own images; left empty it reuses the projects' artwork, like the original */
    const projects=(blockData('projects')||{}).projects||[];
    const CAROUSEL=(D.reel||[]).filter(r=>r&&r.src),ARTWORK=projects.filter(p=>p&&p.image&&!p.hidden).map(p=>({src:p.image,alt:p.title}));
    const REEL=(CAROUSEL.length?CAROUSEL:ARTWORK).map(r=>({src:r.src,alt:r.alt}));
    const reelItems=REEL.length?REEL:[{fnArt:monkey},{ph:PH[0]},{fnArt:pinkField},{ph:PH[1]},{fnArt:skyField},{ph:PH[2]},{fnArt:orangeField},{ph:PH[4]}];
    reel.innerHTML='';
    reelItems.forEach((it,i)=>{const b=document.createElement('button');b.className='hr-slide';b.setAttribute('aria-label','Open artwork '+(i+1)+' of '+reelItems.length);
      if(it.src){const img=new Image();img.alt='';img.src=it.src;img.decoding='async';img.loading=i?'lazy':'eager';b.appendChild(img);}
      else{const cv=document.createElement('canvas');b.appendChild(cv);new ResizeObserver(()=>{const[c,w,h]=fit(cv);if(it.fnArt){it.fnArt(c,w,h);}else{c.fillStyle=C.paper;c.fillRect(0,0,w,h);const pc=placeholderCanvas(it.ph,400),s=Math.min(w/pc.width,h/pc.height)*.8;c.drawImage(pc,(w-pc.width*s)/2,(h-pc.height*s)/2,pc.width*s,pc.height*s);}}).observe(cv);}
      b.addEventListener('click',()=>openViewer({item:it}));reel.appendChild(b);});
    let hrIdx=0,hrT0=performance.now(),hrHold=0,hrOn=true;const HR_DUR=Math.max(1000,(+D.reelSeconds||5.2)*1000);
    ['pointerdown','touchstart','wheel','focusin'].forEach(ev=>reel.addEventListener(ev,()=>{hrHold=performance.now()+4000;},{passive:true}));
    let hrScrollT;reel.addEventListener('scroll',()=>{clearTimeout(hrScrollT);hrScrollT=setTimeout(()=>{hrIdx=Math.round(reel.scrollLeft/Math.max(1,reel.clientWidth));hrT0=performance.now();},120);},{passive:true});
    if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>hrOn=e.isIntersecting)).observe(reel);
    (function hrLoop(t){if(reduce||reelItems.length<2){hrBar.style.width='0';}
      else if(hrOn&&t>hrHold&&!document.hidden){const p=Math.min(1,(t-hrT0)/HR_DUR);hrBar.style.width=(p*100)+'%';if(p>=1){hrIdx=(hrIdx+1)%reelItems.length;reel.scrollTo({left:hrIdx*reel.clientWidth,behavior:'smooth'});hrT0=t;}}
      else{hrT0=t-(parseFloat(hrBar.style.width)||0)/100*HR_DUR;}
      requestAnimationFrame(hrLoop);})(performance.now());
  }

  /* ---- ticker, visitors, ghosts, late mode ---- */
  const tk=document.getElementById('ticker');
  const CLOVER_SVG=(document.querySelector('.ao .tk-c')||{}).innerHTML||'';
  let tkSig='';
  function ago(t){const m=Math.floor((Date.now()-t)/60000);if(m<1)return'just now';if(m<60)return m+' min ago';const h=Math.floor(m/60);if(h<24)return h+(h===1?' hour':' hours')+' ago';const d=Math.floor(h/24);return d+(d===1?' day':' days')+' ago';}
  function tickerBuild(){
    if(!tk)return;
    const own=(D.ticker||[]).filter(t=>t&&t.text&&(t.mode==='both'||t.mode===(TK.late?'late':'day'))).map(t=>t.text);
    const items=(own.length?own:(TK.late?["you're up late","the station's still on"]:['welcome','pick a disc'])).concat(D.tickerTopScore===false?[]:[TK.top]);
    if(TK.visitor&&D.tickerVisitors!==false)items.push("you're visitor #"+String(TK.visitor).padStart(4,'0'));
    const pres=[];if(TK.last)pres.push('last here '+ago(TK.last));if(TK.here)pres.push(TK.here>1?TK.here+' here now':'just you here');
    if(pres.length&&D.tickerVisitors!==false)items.push(pres.join(' · '));
    const sig=items.join('|');if(sig===tkSig)return;tkSig=sig;
    const one=items.map(w=>{const sp=document.createElement('span');sp.className='tk-w';sp.textContent=w;return sp.outerHTML+'<span class="tk-c">'+CLOVER_SVG+'</span>';}).join('');
    const rep=Math.max(1,Math.ceil(9/items.length)),html=one.repeat(rep);
    document.querySelectorAll('#ticker .tk-half').forEach(h=>h.innerHTML=html);
    tk.setAttribute('aria-label',items.join('. ')+'.');}
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
}
