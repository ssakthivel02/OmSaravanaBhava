
(function(){
  'use strict';
  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
  const esc=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function getJSON(path){try{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){console.warn('Data load failed:',path,e);return []}}
  function tags(arr){return (arr||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}
  function templeCard(t){return `<article class="card"><span class="num">${String(t.order).padStart(2,'0')}</span><h3>${esc(t.nameTa)}</h3><h4>${esc(t.nameEn)} · ${esc(t.subtitle)}</h4><p><strong>📍 ${esc(t.location)}</strong></p><p>${esc(t.summary)}</p><div class="tags">${tags(t.highlights)}</div><a class="btn" href="${esc(t.map)}" target="_blank" rel="noopener">Open Map</a></article>`}
  function simpleCard(item,titleKey='nameEn'){return `<article class="card"><h3>${esc(item.nameTa||item.titleTa||item.title||item.nameEn)}</h3><h4>${esc(item[titleKey]||item.titleEn||item.category||'')}</h4><p>${esc(item.summary)}</p>${item.month?`<p><strong>🗓 ${esc(item.month)}</strong></p>`:''}</article>`}
  async function init(){
    const m=$('.menu-toggle'), nav=$('.main-nav'); if(m&&nav){m.addEventListener('click',()=>nav.classList.toggle('open'))}
    const date=$('#today-date'); if(date){date.textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
    const quote=$('#daily-quote'); if(quote){const qs=await getJSON('data/daily_quotes.json'); const q=qs[new Date().getDate()%Math.max(qs.length,1)]; if(q) quote.textContent=`${q.quoteTa} — ${q.quoteEn}`;}
    const home=$('#home-temples'); if(home){const data=await getJSON('data/temples.json'); home.innerHTML=data.slice(0,3).map(templeCard).join('');}
    const tl=$('#temples-list'); if(tl){const data=await getJSON('data/temples.json'); const render=(list)=>tl.innerHTML=list.map(templeCard).join(''); render(data); const input=$('#temple-search'); if(input){input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase(); render(!q?data:data.filter(t=>[t.nameEn,t.nameTa,t.location,t.subtitle,t.summary].join(' ').toLowerCase().includes(q)));});}}
    const fl=$('#festivals-list'); if(fl){const data=await getJSON('data/festivals.json'); fl.innerHTML=data.map(x=>simpleCard(x,'nameEn')).join('');}
    const sl=$('#slokas-list'); if(sl){const data=await getJSON('data/slokas.json'); sl.innerHTML=data.map(x=>simpleCard(x,'titleEn')).join('');}
    const gl=$('#gallery-list'); if(gl){const data=await getJSON('data/gallery.json'); gl.innerHTML=data.map(x=>simpleCard(x,'title')).join('');}
    const aiBtn=$('#aiBtn'), input=$('#aiInput'), out=$('#aiOut'); if(aiBtn&&input&&out){aiBtn.addEventListener('click',()=>{const q=input.value.trim(); out.textContent=q?`Demo guide: Start with verified temple pages, slokas and festival notes. Your question: ${q}`:'Please enter a question.';});}
    if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
