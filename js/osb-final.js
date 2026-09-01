(function(){
 const $=(s,r=document)=>r.querySelector(s);
 const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 function utility(){
   $$('.osb-utility').slice(1).forEach(x=>x.remove());
   if($('.osb-utility')) return;
   const d=document.createElement('div'); d.className='osb-utility';
   d.innerHTML='<button data-a="font">A+ Text</button><button data-a="night">☾ Night</button><button data-a="save">♡ Save</button><button data-a="share">↗ Share</button>';
   document.body.appendChild(d);
   d.addEventListener('click',async e=>{
    const b=e.target.closest('button'); if(!b)return;
    if(b.dataset.a==='font') document.body.style.fontSize=document.body.style.fontSize==='18px'?'':'18px';
    if(b.dataset.a==='night') document.body.classList.toggle('dark');
    if(b.dataset.a==='save'){localStorage.setItem('osb-save:'+location.href,document.title);b.textContent='✓ Saved'}
    if(b.dataset.a==='share'){try{await navigator.clipboard.writeText(location.href);b.textContent='✓ Copied'}catch{location.href='mailto:?subject=Om Saravana Bhava&body='+encodeURIComponent(location.href)}}
   });
 }
 function reveal(){
   const items=$$('.reveal');
   if(!('IntersectionObserver' in window)){items.forEach(x=>x.classList.add('show'));return}
   const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');io.unobserve(e.target)}}),{threshold:.12});
   items.forEach(x=>io.observe(x));
 }
 function searchForms(){
   $$('[data-search-form]').forEach(form=>{
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const q=(form.querySelector('input')||{}).value || 'murugan';
      location.href='ai-search.html?q='+encodeURIComponent(q.trim());
    });
   });
 }
 function filterCards(){
   const input=$('[data-filter-input]');
   if(!input) return;
   const cards=$$('[data-filter-card]');
   input.addEventListener('input',()=>{
    const q=input.value.toLowerCase().trim();
    cards.forEach(c=>{c.style.display=c.textContent.toLowerCase().includes(q)?'':'none'})
   });
 }
 document.addEventListener('DOMContentLoaded',()=>{utility();reveal();searchForms();filterCards();});
})();
