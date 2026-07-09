// Batch 16 Thiruppugazh reader
document.addEventListener('DOMContentLoaded',()=>{const q=document.querySelector('[data-filter]');if(!q)return;const cards=[...document.querySelectorAll('[data-song-card]')];q.addEventListener('input',()=>{const s=q.value.trim().toLowerCase();cards.forEach(c=>{c.classList.toggle('hidden',s&&!c.textContent.toLowerCase().includes(s));});});});
