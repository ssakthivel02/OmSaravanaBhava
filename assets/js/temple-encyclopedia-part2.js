// Batch 23 Temple Encyclopedia Part 2
(function(){
 const root=document.querySelector('[data-temple-index]');
 if(!root)return;
 const q=root.querySelector('input[type="search"]');
 const cards=[...root.querySelectorAll('[data-card]')];
 q&&q.addEventListener('input',()=>{const t=q.value.toLowerCase();cards.forEach(c=>c.style.display=c.textContent.toLowerCase().includes(t)?'':'none')});
})();
