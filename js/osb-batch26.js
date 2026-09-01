(function(){
 const $=(s,r=document)=>r.querySelector(s);
 const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 window.OSB=window.OSB||{};
 OSB.utility=function(){
   $$('.utility-dock').slice(1).forEach(d=>d.remove());
   if($('.utility-dock')) return;
   const d=document.createElement('div'); d.className='utility-dock';
   d.innerHTML='<button data-a="font">A+ Text</button><button data-a="night">☾ Night</button><button data-a="save">♡ Save</button><button data-a="share">↗ Share</button>';
   document.body.appendChild(d);
   d.addEventListener('click',async e=>{
    const b=e.target.closest('button'); if(!b)return;
    if(b.dataset.a==='font') document.body.style.fontSize=document.body.style.fontSize==='18px'?'':'18px';
    if(b.dataset.a==='night') document.body.classList.toggle('dark');
    if(b.dataset.a==='save'){localStorage.setItem('osb-save:'+location.href,document.title);b.textContent='✓ Saved'}
    if(b.dataset.a==='share'){try{await navigator.clipboard.writeText(location.href);b.textContent='✓ Copied'}catch{location.href='mailto:?subject=Om Saravana Bhava&body='+encodeURIComponent(location.href)}}
   });
 };
 OSB.renderCards=function(id,items){
   const el=document.getElementById(id); if(!el)return;
   el.innerHTML=items.map(x=>`<article class="card"><span class="badge">${x.type||'Item'}</span><h2>${x.title}</h2><p>${x.text}</p>${x.href?`<a class="btn" href="${x.href}">Open</a>`:''}</article>`).join('');
 };
 document.addEventListener('DOMContentLoaded',OSB.utility);
})();
