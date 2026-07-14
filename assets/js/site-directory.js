(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const state = {records: [], query: '', category: 'All', status: 'All'};
  const normalize = value => String(value || '').toLocaleLowerCase();
  const option = value => { const node = document.createElement('option'); node.value=value; node.textContent=value; return node; };
  const routeCard = record => {
    const article=document.createElement('article'); article.className='card route-card';
    const meta=document.createElement('p'); meta.className='route-meta';
    const cat=document.createElement('span'); cat.className='pill'; cat.textContent=record.category;
    const status=document.createElement('span'); status.className='pill'; status.textContent=record.status;
    meta.append(cat,status);
    const heading=document.createElement('h2'); heading.textContent=record.titleTa ? `${record.titleTa} · ${record.titleEn}` : record.titleEn;
    const summary=document.createElement('p'); summary.textContent=record.summary;
    const code=document.createElement('code'); code.textContent=record.path;
    const link=document.createElement('a'); link.className='btn'; link.href=record.path; link.textContent='Open route';
    article.append(meta,heading,summary,code,link); return article;
  };
  const render = () => {
    const query=normalize(state.query);
    const filtered=state.records.filter(record => {
      const haystack=normalize([record.path,record.titleTa,record.titleEn,record.category,record.status,record.summary].join(' '));
      return (!query || haystack.includes(query)) && (state.category==='All'||record.category===state.category) && (state.status==='All'||record.status===state.status);
    });
    const grid=byId('routeGrid'); grid.replaceChildren(...filtered.map(routeCard)); grid.setAttribute('aria-busy','false');
    byId('routeCount').textContent=`${filtered.length} of ${state.records.length} routes shown.`;
  };
  document.addEventListener('DOMContentLoaded', async () => {
    const grid=byId('routeGrid');
    try {
      const response=await fetch('data/site-routes.json',{headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload=await response.json(); state.records=Array.isArray(payload.routes)?payload.routes:[];
      [...new Set(state.records.map(r=>r.category))].sort().forEach(v=>byId('routeCategory').append(option(v)));
      [...new Set(state.records.map(r=>r.status))].sort().forEach(v=>byId('routeStatus').append(option(v)));
      byId('routeSearch').addEventListener('input',e=>{state.query=e.target.value;render();});
      byId('routeCategory').addEventListener('change',e=>{state.category=e.target.value;render();});
      byId('routeStatus').addEventListener('change',e=>{state.status=e.target.value;render();});
      byId('routeReset').addEventListener('click',()=>{state.query='';state.category='All';state.status='All';byId('routeSearch').value='';byId('routeCategory').value='All';byId('routeStatus').value='All';render();byId('routeSearch').focus();});
      render();
    } catch(error) {
      console.error(error); grid.setAttribute('aria-busy','false');
      const alert=document.createElement('div'); alert.className='card'; alert.setAttribute('role','alert'); alert.textContent='The route directory could not be loaded. Use sitemap.xml or the primary navigation.'; grid.replaceChildren(alert);
    }
  });
})();
