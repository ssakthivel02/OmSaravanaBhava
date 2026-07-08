(function(){
  const B=window.OmBatch10;
  const renderLibrary = async () => {
    const app=document.querySelector('[data-app="sloka-library"], [data-app="kavacham"], [data-app="namavali"], [data-app="thiruppugazh"]'); if(!app) return;
    let data=await B.loadJSON('data/slokas/index.json');
    const kind=app.dataset.app;
    if(kind==='kavacham') data=data.filter(x=>x.category==='Kavacham');
    if(kind==='namavali') data=data.filter(x=>['Namavali','Potri'].includes(x.category));
    if(kind==='thiruppugazh') data=data.filter(x=>x.id.includes('thiruppugazh')||x.author.includes('Arunagirinathar'));
    app.innerHTML = `<div class="library-toolbar"><input id="sloka-filter" placeholder="Search sloka, meaning, Tamil..."><select id="sloka-category"><option value="">All categories</option><option>Kavacham</option><option>Mantra</option><option>Tamil Hymn</option><option>Namavali</option></select></div><div id="sloka-grid" class="library-grid"></div>`;
    const grid=B.$('#sloka-grid',app);
    const draw=()=>{ const q=B.$('#sloka-filter',app).value.toLowerCase(); const cat=B.$('#sloka-category',app).value; const rows=data.filter(x=>(!cat||x.category===cat)&&(`${x.titleEn} ${x.titleTa} ${x.summary} ${x.meaningEn}`.toLowerCase().includes(q)||x.titleTa.includes(q))); grid.innerHTML=rows.map(x=>B.card(x,`<div class="reader-actions"><a class="btn-small" href="sloka-reader.html?id=${encodeURIComponent(x.id)}">Open reader</a><button class="fav-btn" data-fav="${x.id}">♡ Save</button></div>`)).join('')||'<div class="empty-state">No slokas found.</div>'; };
    app.addEventListener('click',e=>{const b=e.target.closest('[data-fav]'); if(!b)return; B.toast(B.store.fav(b.dataset.fav)?'Saved':'Removed');});
    app.addEventListener('input',draw); app.addEventListener('change',draw); draw();
  };
  const renderReader = async () => {
    const app=document.querySelector('[data-app="sloka-reader"]'); if(!app) return;
    const id=new URLSearchParams(location.search).get('id')||'om-saravana-bhava';
    const item=await B.loadJSON(`data/slokas/details/${id}.json`);
    if(!item || !item.id){ app.innerHTML='<div class="empty-state">Sloka not found.</div>'; return; }
    B.store.recent({type:'sloka',id:item.id,title:item.titleEn});
    app.innerHTML=`<article class="reader-panel"><p class="pill">${B.escapeHTML(item.category)}</p><h1 lang="ta">${B.escapeHTML(item.titleTa)}</h1><h2>${B.escapeHTML(item.titleEn)}</h2><p class="source-note">Status: ${B.escapeHTML(item.status)} · Author/source: ${B.escapeHTML(item.author)}</p><div class="reader-actions"><button class="btn-small" data-mode="ta">Tamil</button><button class="btn-small" data-mode="en">English</button><button class="btn-small" data-mode="both">Tamil + English</button><button class="fav-btn" data-fav="${item.id}">♡ Save</button></div><div id="reader-body" class="reader-text"></div><h3>Benefits</h3><ul>${(item.benefits||[]).map(b=>`<li>${B.escapeHTML(b)}</li>`).join('')}</ul><div class="source-note">Every text in this library is prepared as a learning reference. Full canonical text should be added only after source review.</div></article>`;
    const body=B.$('#reader-body',app);
    const draw=(mode='both')=>{ if(mode==='ta') body.innerHTML=`<div class="tamil" lang="ta">${B.escapeHTML(item.meaningTa)}</div>`; else if(mode==='en') body.innerHTML=`<div>${B.escapeHTML(item.meaningEn)}</div>`; else body.innerHTML=`<div class="parallel-grid"><div class="tamil" lang="ta">${B.escapeHTML(item.meaningTa)}</div><div>${B.escapeHTML(item.meaningEn)}</div></div>`; };
    app.addEventListener('click',e=>{const m=e.target.dataset.mode; if(m)draw(m); const f=e.target.closest('[data-fav]'); if(f)B.toast(B.store.fav(f.dataset.fav)?'Saved':'Removed');}); draw();
  };
  document.addEventListener('DOMContentLoaded',()=>{renderLibrary();renderReader();});
})();
