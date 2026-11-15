/* page-wide effects: the cutting mats' rulers and angle guides, and the focus transition */
import { reduce } from './shared.js';

export function initMats(){
  /* ruler ticks + numbers along the top of each mat */
  document.querySelectorAll('.ao .mat').forEach(m=>{const r=document.createElement('div');r.className='mat-ruler';r.setAttribute('aria-hidden','true');m.prepend(r);
    m.insertAdjacentHTML('beforeend',`<svg class="mat-angle" viewBox="0 0 520 300" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M520 300L220 0M520 300L347 0M520 300L0 127M520 300L0 300"/><path d="M520 120A180 180 0 0 0 340 300" /><path d="M520 30A270 270 0 0 0 250 300" stroke-dasharray="4 6"/><text x="356" y="140" fill="currentColor" stroke="none" font-family="JetBrains Mono, monospace" font-size="11">45°</text><text x="404" y="64" fill="currentColor" stroke="none" font-family="JetBrains Mono, monospace" font-size="11">60°</text><text x="250" y="206" fill="currentColor" stroke="none" font-family="JetBrains Mono, monospace" font-size="11">30°</text></svg>`);
    const draw=()=>{r.innerHTML='';const W=m.clientWidth;for(let x=0,n=0;x<W;x+=20,n++){const t=document.createElement('i');t.style.left=x+'px';if(n%5===0){t.className='long';if(n){const s=document.createElement('span');s.style.left=x+'px';s.textContent=n/5;r.appendChild(s);}}r.appendChild(t);}};
    new ResizeObserver(draw).observe(m);});
}

/* focus transition: the section nearest the middle of the screen is sharp; the rest shrink, fade and blur a little */
export function initFocus(){if(reduce)return;const fs=[...document.querySelectorAll('.ao .focus-sec')];let tick=false;
  function f(){tick=false;const vh=innerHeight,max=Math.max(1,document.documentElement.scrollHeight-vh),y=scrollY,top=Math.max(0,1-y/(vh*.4)),bot=Math.max(0,1-(max-y)/(vh*.4)),mid=vh*(.45-.25*top+.3*bot);
    fs.forEach(s=>{if(s.hidden||!s.offsetParent)return;const r=s.getBoundingClientRect(),c=Math.max(r.top,Math.min(mid,r.bottom)),d=Math.min(1,Math.abs(c-mid)/(vh*.7)),e=d*d*(3-2*d);
      s.style.transform=e<.002?'':`scale(${(1-.07*e).toFixed(4)})`;s.style.opacity=e<.002?'':(1-.55*e).toFixed(3);s.style.filter=e<.002?'':`blur(${(e*2.5).toFixed(2)}px) grayscale(${(e*.5).toFixed(2)})`;});}
  addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(f);}},{passive:true});addEventListener('resize',f);f();}
