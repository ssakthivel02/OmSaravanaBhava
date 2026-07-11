(function(){
const input=document.querySelector('[data-filter]');
if(!input)return;
input.addEventListener('input',()=>{
 const value=input.value.trim().toLowerCase();
 document.querySelectorAll('[data-item]').forEach(
   item=>item.hidden=!item.textContent.toLowerCase().includes(value)
 );
});
})();