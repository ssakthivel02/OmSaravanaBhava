(() => {
'use strict';
const n=v=>String(v??'').normalize('NFKC').toLocaleLowerCase();
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const score=(x,terms)=>terms.reduce((s,t)=>s+(n(`${x.titleTa} ${x.titleEn}`).includes(t)?30:0)+(n((x.tags||[]).join(' ')).includes(t)?15:0)+(n(`${x.summary} ${x.kind}`).includes(t)?8:0),0);
document.addEventListener('DOMContentLoaded',async()=>{
 const form=document.getElementById('advancedSearchForm'),q=document.getElementById('q'),type=document.getElementById('searchType'),results=document.getElementById('results'),count=document.getElementById('resultCount'),recentBox=document.getElementById('searchSuggestions');
 if(!form||!q||!results)return;
 try{
  const r=await fetch('data/search-index.json',{cache:'default'}); if(!r.ok)throw Error(`HTTP ${r.status}`); const index=await r.json();
  const types=[...new Set(index.map(x=>x.kind))].sort(); type.innerHTML='<option value="All">All content</option>'+types.map(x=>`<option>${e(x)}</option>`).join('');
  const render=()=>{
   const query=q.value.trim(),terms=n(query).split(/\s+/).filter(Boolean),selected=type.value;
   const found=index.filter(x=>selected==='All'||x.kind===selected).map(x=>({...x,_score:terms.length?score(x,terms):1})).filter(x=>x._score>0).sort((a,b)=>b._score-a._score||a.titleEn.localeCompare(b.titleEn)).slice(0,60);
   results.innerHTML=found.length?found.map(x=>`<article class="card result"><span class="pill">${e(x.kind)}</span><h2 lang="ta">${e(x.titleTa)}</h2><h3>${e(x.titleEn)}</h3><p>${e(x.summary)}</p><a class="btn" href="${e(x.route)}">Open</a></article>`).join(''):'<div class="card">No published result matched.</div>';
   count.textContent=`${found.length} result${found.length===1?'':'s'} shown.`;
   if(query){const old=JSON.parse(localStorage.getItem('osb-search-history')||'[]');localStorage.setItem('osb-search-history',JSON.stringify([query,...old.filter(x=>x!==query)].slice(0,6)));}
   const recent=JSON.parse(localStorage.getItem('osb-search-history')||'[]');recentBox.innerHTML=recent.map(x=>`<button type="button" class="pill search-suggestion" data-query="${e(x)}">${e(x)}</button>`).join('');
  };
  form.addEventListener('submit',ev=>{ev.preventDefault();render();results.focus();});
  type.addEventListener('change',render);
  document.addEventListener('click',ev=>{const b=ev.target.closest('[data-query]');if(b){q.value=b.dataset.query;render();}});
  const params=new URLSearchParams(location.search); if(params.has('q'))q.value=params.get('q')||''; render();
 }catch(err){console.error(err);results.innerHTML='<div class="card" role="alert">The local search index could not be loaded.</div>';}
});
})();