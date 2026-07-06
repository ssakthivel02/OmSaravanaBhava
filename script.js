
(function(){
 if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())); if(window.caches){caches.keys().then(keys=>keys.forEach(k=>caches.delete(k)));}}
 document.querySelectorAll('[data-date]').forEach(el=>{});
 const p=document.getElementById('today'); if(p){p.textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});} 
 const input=document.getElementById('aiInput'), out=document.getElementById('aiOut'); if(input&&out){document.getElementById('aiBtn').onclick=()=>{out.innerHTML='<b>Demo guide:</b> This static page is ready. Future AI backend can answer: '+input.value;}}
})();
