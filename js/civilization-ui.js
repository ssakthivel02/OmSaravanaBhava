
(function(){
 const qs=s=>document.querySelector(s); const qsa=s=>[...document.querySelectorAll(s)];
 window.OSB={load:async p=>{try{const r=await fetch(p,{cache:'no-store'});return r.ok?await r.json():null}catch(e){return null}},toast:t=>{let el=document.createElement('div');el.textContent=t;el.style.cssText='position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);background:#2b160d;color:#fff;padding:.8rem 1rem;border-radius:999px;z-index:99';document.body.appendChild(el);setTimeout(()=>el.remove(),1800)}};
 document.addEventListener('DOMContentLoaded',()=>{if(!qs('.toolbox')){let box=document.createElement('div');box.className='toolbox';box.innerHTML='<button data-font>A+ Text</button><button data-night>☾ Night</button><button data-save>♡ Save</button><button data-share>↗ Share</button>';document.body.appendChild(box)}
 document.body.addEventListener('click',async e=>{if(e.target.matches('[data-night]'))document.body.classList.toggle('night');if(e.target.matches('[data-font]'))document.body.style.fontSize=(document.body.style.fontSize==='18px'?'':'18px');if(e.target.matches('[data-save]'))OSB.toast('Saved locally');if(e.target.matches('[data-share]')){try{await navigator.clipboard.writeText(location.href);OSB.toast('Link copied')}catch(_){OSB.toast('Share link: '+location.href)}}});});
})();
