(function(){
const q=document.querySelector('[data-filter]');
if(!q)return;
q.addEventListener('input',()=>{
 const term=q.value.trim().toLowerCase();
 document.querySelectorAll('[data-item]').forEach(el=>{
   el.hidden=!el.textContent.toLowerCase().includes(term);
 });
});
})();