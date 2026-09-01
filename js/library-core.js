(function(){
  window.OmBatch10 = window.OmBatch10 || {};
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const loadJSON = async (path) => {
    try { const res = await fetch(path, {cache:'no-store'}); if(!res.ok) throw new Error(res.status); return await res.json(); }
    catch(e){ console.warn('[Batch10] load failed', path, e); return Array.isArray(path) ? [] : []; }
  };
  const store = {
    get(){ try{return JSON.parse(localStorage.getItem('om_batch10')||'{"favs":[],"progress":{},"recent":[]}')}catch(e){return {favs:[],progress:{},recent:[]}}},
    save(d){ localStorage.setItem('om_batch10', JSON.stringify(d)); },
    fav(id){ const d=this.get(); if(d.favs.includes(id)) d.favs=d.favs.filter(x=>x!==id); else d.favs.push(id); this.save(d); return d.favs.includes(id); },
    recent(item){ const d=this.get(); d.recent=[item,...d.recent.filter(x=>x.id!==item.id)].slice(0,10); this.save(d); }
  };
  const toast = (msg) => { const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2400); };
  const card = (item, actions='') => `<article class="library-card"><div class="ta-title" lang="ta">${escapeHTML(item.titleTa||'')}</div><h3>${escapeHTML(item.titleEn||item.title)}</h3><p>${escapeHTML(item.summary||item.meaningEn||item.sourceNote||'')}</p><div class="pill-row"><span class="pill">${escapeHTML(item.category||item.status||'Library')}</span>${item.status?`<span class="pill">${escapeHTML(item.status)}</span>`:''}</div>${actions}</article>`;
  window.OmBatch10 = { $, $$, escapeHTML, loadJSON, store, toast, card };
})();
