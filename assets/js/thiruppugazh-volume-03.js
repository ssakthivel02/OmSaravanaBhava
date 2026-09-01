// OmSaravanaBhava Batch 18: Thiruppugazh Volume 03 index helpers
(function(){
  const root = document.querySelector('[data-osb-thiruppugazh-index]');
  if(!root) return;
  fetch('../../data/literature/thiruppugazh/volume-03/search-index-01.json')
    .then(r=>r.json()).then(data=>{
      const q=root.querySelector('input[type="search"]'); const list=root.querySelector('[data-results]');
      function render(items){list.innerHTML=items.map(item=>`<a class="osb-lit-card" href="${item.url}"><span class="osb-badge">${item.number}</span><h3>${item.title_ta}</h3><p>${item.summary_ta}</p></a>`).join('');}
      render(data.items||[]);
      q&&q.addEventListener('input',()=>{const term=q.value.trim().toLowerCase();render((data.items||[]).filter(x=>JSON.stringify(x).toLowerCase().includes(term)));});
    }).catch(()=>{});
})();
