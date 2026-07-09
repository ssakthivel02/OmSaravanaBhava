// Batch 21 Arupadai Veedu local filter
(function(){const root=document.querySelector('[data-arupadai-index]');if(!root)return;const q=root.querySelector('input[type="search"]');const cards=[...root.querySelectorAll('[data-card]')];q&&q.addEventListener('input',()=>{const t=q.value.toLowerCase();cards.forEach(c=>c.style.display=c.textContent.toLowerCase().includes(t)?'':'none')});})();
