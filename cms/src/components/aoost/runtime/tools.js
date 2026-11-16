/* skills: the ruler bars grow the first time the section is seen */
export function initTools(){
  const sk=document.querySelector('.ao .skills');if(!sk)return;
  if('IntersectionObserver' in window){new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){sk.classList.add('seen');o.disconnect();}}),{threshold:.3}).observe(sk);}else sk.classList.add('seen');
}
