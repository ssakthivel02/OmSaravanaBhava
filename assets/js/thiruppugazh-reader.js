document.querySelectorAll('[data-status]').forEach(el=>{
el.textContent=el.dataset.status||'source-verification-required';
});