
(function(){const $=(s,r=document)=>r.querySelector(s);const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));async function load(p){const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw new Error(p);return r.json();}
async function render(){const box=$('#vratham-list');if(!box)return;const data=await load('/data/vratham/vratham_master.json');box.innerHTML=data.map(x=>`<article class="festival-card"><span class="chip">${esc(x.frequency)}</span><h3>${esc(x.titleEn)}</h3><p lang="ta"><strong>${esc(x.titleTa)}</strong></p><p>${esc(x.summary)}</p><ul>${x.guidance.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></article>`).join('')}
window.addEventListener('DOMContentLoaded',()=>render().catch(console.error));})();
