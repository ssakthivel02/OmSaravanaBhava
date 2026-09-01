
(function(){
 const Core=window.OmBatch10||window.OmAppCore; if(!Core)return;
 const {escapeHTML,loadJSON,toast}=Core;
 async function getSloka(id){
   let item=await loadJSON(`data/slokas/details/${id}.json`); if(item&&item.id)return item;
   const list=await loadJSON('data/slokas/index.json'); item=(Array.isArray(list)?list:[]).find(x=>x.id===id);
   if(item)return item;
   const legacy=await loadJSON('data/sloka_details.json'); return (Array.isArray(legacy)?legacy:[]).find(x=>x.id===id);
 }
 function arr(a){return Array.isArray(a)?a:[]}
 function field(item,k1,k2){return item[k1]||item[k2]||''}
 async function render(){const app=document.querySelector('[data-app="sloka-reader"]'); if(!app)return; const id=new URLSearchParams(location.search).get('id')||'om-saravana-bhava'; const item=await getSloka(id); if(!item||!item.id){app.innerHTML='<div class="empty-state">Sloka not found. Check the ID or open from Sloka Library.</div>';return;} const meaningEn=field(item,'meaningEn','meaning'), meaningTa=item.meaningTa||'தமிழ் விளக்கம் விரைவில் விரிவாக சேர்க்கப்படும்.'; app.innerHTML=`<article class="reader-panel"><p class="pill">${escapeHTML(item.category||'Sloka')}</p><h1 lang="ta">${escapeHTML(item.titleTa||item.titleEn)}</h1><h2>${escapeHTML(item.titleEn||item.titleTa)}</h2><p class="source-note">Status: ${escapeHTML(item.status||'Verified summary')} · Source: ${escapeHTML(item.author||item.source||'Devotional reference')}</p><div class="reader-actions"><button class="btn-small" data-mode="ta">Tamil</button><button class="btn-small" data-mode="en">English</button><button class="btn-small" data-mode="both">Tamil + English</button><button class="btn-small" data-save="${escapeHTML(item.id)}">♡ Save</button></div><div class="reader-text" id="reader-body"></div><h3>Benefits</h3><ul>${arr(item.benefits).map(b=>`<li>${escapeHTML(b)}</li>`).join('')}</ul><h3>Practice</h3><p>${escapeHTML(item.practice||item.practiceEn||'Read with attention and devotion.')}</p><p class="source-note">Canonical long-form texts should be expanded only after source review.</p></article>`; const body=document.getElementById('reader-body'); const draw=m=>{if(m==='ta')body.innerHTML=`<div class="tamil" lang="ta"><h3>தமிழ் விளக்கம்</h3><p>${escapeHTML(meaningTa)}</p></div>`; else if(m==='en')body.innerHTML=`<div><h3>Meaning</h3><p>${escapeHTML(meaningEn)}</p></div>`; else body.innerHTML=`<div class="parallel-grid"><div class="tamil" lang="ta"><h3>தமிழ் விளக்கம்</h3><p>${escapeHTML(meaningTa)}</p></div><div><h3>Meaning</h3><p>${escapeHTML(meaningEn)}</p></div></div>`}; app.addEventListener('click',e=>{if(e.target.dataset.mode)draw(e.target.dataset.mode); if(e.target.dataset.save)toast('Saved in this browser')}); draw('both');}
 document.addEventListener('DOMContentLoaded',render);
})();
