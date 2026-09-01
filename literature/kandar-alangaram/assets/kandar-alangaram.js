(function(){
  const input=document.querySelector('[data-osb-filter]');
  if(!input)return;
  const rows=[...document.querySelectorAll('[data-osb-row]')];
  input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();rows.forEach(r=>{r.hidden=q && !r.textContent.toLowerCase().includes(q);});});
})();
