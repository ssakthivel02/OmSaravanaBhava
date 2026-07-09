// Lightweight reader controls
(function(){
  const btn=document.querySelector('[data-toggle-transliteration]');
  if(btn){btn.addEventListener('click',()=>{document.querySelectorAll('[data-transliteration]').forEach(el=>{el.hidden=!el.hidden;});});}
})();
