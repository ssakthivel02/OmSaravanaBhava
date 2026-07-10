(function(){
const q=document.querySelector('[data-search]');
if(!q)return;
q.addEventListener('input',()=>{
 const term=q.value.trim().toLowerCase();
 document.querySelectorAll('[data-song-card]').forEach(el=>{
   el.hidden=!el.textContent.toLowerCase().includes(term);
 });
});
})();