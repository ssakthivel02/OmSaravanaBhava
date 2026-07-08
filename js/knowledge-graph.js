(function(){
  'use strict';
  const KG = { graph:null, prompts:null };
  const $ = (s,r=document)=>r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const norm = v => String(v ?? '').toLowerCase().trim().replace(/[-_]+/g,' ');
  async function json(path){ try{ const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error(r.status); return await r.json(); } catch(e){ console.warn('[KG] load failed',path,e); return null; } }
  function node(id){ return (KG.graph?.nodes||[]).find(n=>n.id===id); }
  function edgesFor(id){ return (KG.graph?.edges||[]).filter(e=>e.source===id||e.target===id); }
  function related(id){ return edgesFor(id).map(e=>({edge:e,item:node(e.source===id?e.target:e.source)})).filter(x=>x.item); }
  function textOf(item){ return [item.id,item.title,item.titleTa,item.summary,(item.tags||[]).join(' ')].join(' '); }
  function score(item,q){
    const queryRaw=String(q||'').trim(); const query=norm(queryRaw); if(!query) return 0;
    const title=norm(item.title); const id=norm(item.id); const all=norm(textOf(item));
    let s=0;
    if(id===query) s+=90; if(title===query) s+=80; if((item.titleTa||'').includes(queryRaw)) s+=75;
    if(id.includes(query)) s+=55; if(title.includes(query)) s+=45;
    if((item.tags||[]).some(t=>norm(t)===query)) s+=42;
    if((item.tags||[]).some(t=>norm(t).includes(query)||query.includes(norm(t)))) s+=30;
    if(all.includes(query)) s+=18;
    query.split(/\s+/).forEach(p=>{ if(p.length>2 && all.includes(p)) s+=8; });
    return s;
  }
  function card(item, extra=''){
    const openUrl=item.url||`recommendations.html?id=${encodeURIComponent(item.id)}`;
    return `<article><div class="meta">${esc(item.type||'knowledge')}</div><h3>${esc(item.titleTa||item.title)}</h3><p class="kg-muted">${esc(item.title||'')}</p><p>${esc(item.summary||'')}</p>${extra}<div class="kg-tags">${(item.tags||[]).slice(0,8).map(t=>`<span class="kg-tag">${esc(t)}</span>`).join('')}</div><div class="kg-toolbar"><a class="kg-btn secondary" href="${esc(openUrl)}">Open</a><a class="kg-btn" href="recommendations.html?id=${encodeURIComponent(item.id)}">Related</a></div></article>`;
  }
  function renderSearch(q){
    const box=$('#kg-results'); if(!box) return;
    const ranked=(KG.graph.nodes||[]).map(n=>({...n,_score:score(n,q)})).filter(n=>n._score>0).sort((a,b)=>b._score-a._score);
    box.innerHTML = ranked.length ? ranked.map(n=>card(n,`<p class="kg-reason">Match score: ${n._score}. Result is from the local verified knowledge graph.</p>`)).join('') : `<div class="kg-warning">No exact verified result found. Try Murugan, Palani, Thiruchendur, Vel, Thai Poosam, Skanda Sashti, Thiruppugazh, Kavacham, Valli, Deivanai or Arupadai Veedu.</div>`;
    const count=$('#kg-count'); if(count) count.textContent = ranked.length + ' verified result(s)';
  }
  function initAISearch(){
    const input=$('#kg-query'); const params=new URLSearchParams(location.search); if(input && params.get('q')) input.value=params.get('q');
    const run=()=>{ const q=input?.value||'murugan'; renderSearch(q); const url=new URL(location.href); url.searchParams.set('q',q); history.replaceState(null,'',url); };
    $('#kg-search-btn')?.addEventListener('click',run); input?.addEventListener('input',run); input?.addEventListener('keydown',e=>{ if(e.key==='Enter') run(); }); run();
  }
  function initGraph(){
    const nodes=$('#kg-nodes'), edges=$('#kg-edges');
    if(nodes) nodes.innerHTML=KG.graph.nodes.map(n=>card(n)).join('');
    if(edges) edges.innerHTML=KG.graph.edges.map(e=>{const a=node(e.source), b=node(e.target); return `<div class="kg-edge"><span class="kg-node">${esc(a?.title||e.source)}</span><span class="kg-relation">${esc(e.relation)}</span><span class="kg-node">${esc(b?.title||e.target)}</span></div>`}).join('');
    const k=$('#kg-kpi'); if(k) k.innerHTML=`<div><strong>${KG.graph.nodes.length}</strong><span>Knowledge nodes</span></div><div><strong>${KG.graph.edges.length}</strong><span>Verified links</span></div><div><strong>6</strong><span>Arupadai Veedu temples</span></div><div><strong>100%</strong><span>Local static framework</span></div>`;
  }
  function initRecommendations(){
    const id=new URLSearchParams(location.search).get('id')||'murugan'; const base=node(id)||node('murugan');
    const hero=$('#rec-hero'); if(hero) hero.innerHTML=`<p class="eyebrow">Recommendation engine</p><h1>${esc(base.titleTa||base.title)}</h1><p>${esc(base.summary)}</p><div class="kg-toolbar"><a class="kg-btn secondary" href="${esc(base.url||'ai-search.html?q='+base.id)}">Open source page</a><a class="kg-btn" href="ai-search.html?q=${encodeURIComponent(base.title)}">Search similar</a></div>`;
    const rel=related(base.id); const list=$('#rec-list'); if(list) list.innerHTML=rel.length?rel.map(x=>card(x.item,`<p class="kg-reason">Reason: ${esc(x.edge.relation)}</p>`)).join(''):'<div class="kg-warning">No related items yet.</div>';
  }
  function answerFor(q){
    const ranked=KG.graph.nodes.map(n=>({...n,_score:score(n,q)})).filter(n=>n._score>0).sort((a,b)=>b._score-a._score);
    if(!ranked.length) return KG.prompts.fallback;
    const top=ranked[0]; const rel=related(top.id).slice(0,5).map(x=>`${x.item.title} (${x.edge.relation})`).join('; ');
    return `${top.title}: ${top.summary}${rel? ' Related verified links: '+rel+'.':''}`;
  }
  function initGuide(){
    const qs=$('#guide-questions'), ans=$('#guide-answer'), input=$('#guide-input');
    if(qs) qs.innerHTML=(KG.graph.guidedQuestions||KG.prompts.suggestions||[]).map(q=>`<button class="kg-question" type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('');
    const ask=q=>{ const question=String(q||'').trim()||'Murugan'; if(input) input.value=question; if(ans) ans.innerHTML=`<div class="kg-answer"><strong>Murugan Guide</strong><p>${esc(answerFor(question))}</p><p class="kg-muted">Source: local verified website knowledge graph. This is a guide, not a replacement for temple authorities or scripture scholars.</p></div>`; };
    qs?.addEventListener('click',e=>{const b=e.target.closest('[data-q]'); if(b) ask(b.dataset.q);});
    $('#guide-btn')?.addEventListener('click',()=>ask(input?.value||'')); input?.addEventListener('keydown',e=>{ if(e.key==='Enter') ask(input.value); }); ask('Murugan');
  }
  function initPaths(){
    const el=$('#kg-path'); if(!el) return;
    const paths={
      beginner:['murugan','vel','arupadai-veedu','palani','om-saravana-bhava','thai-poosam'],
      protection:['murugan','vel','skanda-sashti','kanda-sashti-kavasam','shanmuga-kavacham'],
      scholar:['murugan','thiruppugazh','vayalur','kandar-anuboothi','palani','arupadai-veedu'],
      festivals:['thai-poosam','skanda-sashti','panguni-uthiram','vaikasi-visakam','karthigai-deepam']
    };
    const tabs=$('#kg-path-tabs'); if(tabs){ tabs.innerHTML=Object.keys(paths).map((p,i)=>`<button class="kg-tab ${i===0?'active':''}" type="button" data-path="${p}">${p[0].toUpperCase()+p.slice(1)}</button>`).join(''); }
    const render=name=>{ el.innerHTML=(paths[name]||paths.beginner).map(id=>{const n=node(id); return `<li><strong>${esc(n?.title||id)}</strong><br><span class="kg-muted">${esc(n?.summary||'')}</span><div class="kg-toolbar"><a class="kg-btn secondary" href="${esc(n?.url||'ai-search.html?q='+id)}">Open</a><a class="kg-btn" href="recommendations.html?id=${encodeURIComponent(id)}">Related</a></div></li>`}).join(''); };
    tabs?.addEventListener('click',e=>{const b=e.target.closest('[data-path]'); if(!b) return; tabs.querySelectorAll('.kg-tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); render(b.dataset.path);}); render('beginner');
  }
  async function init(){ document.body.classList.add('kg-layout-fix'); KG.graph=await json('data/knowledge/knowledge_graph.json'); KG.prompts=await json('data/knowledge/ai_guide_prompts.json')||{}; if(!KG.graph) return; initAISearch(); initGraph(); initRecommendations(); initGuide(); initPaths(); }
  document.addEventListener('DOMContentLoaded',init);
})();
