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
 function search(){
   const form=$('[data-osb-search]');
   if(!form) return;
   form.addEventListener('submit',e=>{
     e.preventDefault();
     const q=(form.querySelector('input')||{}).value||'murugan';
     location.href='ai-search.html?q='+encodeURIComponent(q.trim());
   });
 }
 function countdown(){
   const box=$('[data-countdown]');
   if(!box) return;
   const target=new Date(box.dataset.countdown || '2026-02-01T06:00:00');
   function tick(){
     const diff=Math.max(0,target-new Date());
     const d=Math.floor(diff/86400000), h=Math.floor(diff/3600000)%24, m=Math.floor(diff/60000)%60, s=Math.floor(diff/1000)%60;
     box.innerHTML=[['Days',d],['Hours',h],['Mins',m],['Secs',s]].map(x=>`<div><strong>${String(x[1]).padStart(2,'0')}</strong><br>${x[0]}</div>`).join('');
   }
   tick(); setInterval(tick,1000);
 }
 function reveal(){
   const items=$$('.reveal');
   if(!('IntersectionObserver' in window)){items.forEach(x=>x.classList.add('show'));return}
   const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');io.unobserve(e.target)}}),{threshold:.12});
   items.forEach(x=>io.observe(x));
 }
 function audio(){
   const btn=$('[data-play]');
   if(!btn)return;
   btn.addEventListener('click',()=>{btn.textContent=btn.textContent.includes('▶')?'Ⅱ':'▶';});
 }
 document.addEventListener('DOMContentLoaded',()=>{utility();search();countdown();reveal();audio();});
})();
