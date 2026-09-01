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
 OSB.inventory=function(){
   const el=$('#inventory'); if(!el)return;
   const rows=[['Core pages','Live','OK'],['Search','Needs AI test pass','Review'],['Sloka reader','Kavacham summary loads','OK'],['Content','Canonical review open','Review'],['PWA','Needs Lighthouse','Review']];
   el.innerHTML='<table class="table"><thead><tr><th>Area</th><th>Status</th><th>Result</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td></tr>`).join('')+'</tbody></table>';
 };
 document.addEventListener('DOMContentLoaded',()=>{OSB.utility();OSB.inventory();});
})();
