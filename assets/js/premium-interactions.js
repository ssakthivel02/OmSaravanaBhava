(() => {
'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 const bar=document.createElement('div');bar.className='reading-progress';bar.setAttribute('aria-hidden','true');document.body.appendChild(bar);
 const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;bar.style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%';};
 addEventListener('scroll',update,{passive:true});update();
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  addEventListener('pointermove',e=>{document.documentElement.style.setProperty('--mouse-x',e.clientX+'px');document.documentElement.style.setProperty('--mouse-y',e.clientY+'px');},{passive:true});
 }
});
})();