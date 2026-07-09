// OmSaravanaBhava Batch 17 — static local search helper
(function(){
  async function loadJSON(path){ const r=await fetch(path); if(!r.ok) throw new Error(path); return r.json(); }
  function norm(s){ return (s||'').toString().toLowerCase().normalize('NFC'); }
  window.OSBThiruppugazhSearch = async function(inputId, outputId, indexPath){
    const input=document.getElementById(inputId), output=document.getElementById(outputId);
    if(!input||!output) return;
    let data=[];
    try{ data=await loadJSON(indexPath); }catch(e){ output.innerHTML='<p class="osb-warning">Search index not loaded.</p>'; return; }
    input.addEventListener('input',()=>{
      const q=norm(input.value).trim();
      const rows=q?data.filter(x=>norm([x.title_ta,x.title_en,x.first_line_ta,x.tags].join(' ')).includes(q)).slice(0,20):data.slice(0,12);
      output.innerHTML=rows.map(x=>`<div class="osb-result"><strong>${x.title_ta}</strong><div class="osb-meta">${x.first_line_ta||''}</div><a href="${x.url}">Open</a></div>`).join('');
    });
    input.dispatchEvent(new Event('input'));
  }
})();