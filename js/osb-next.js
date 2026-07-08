(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  window.OSB = window.OSB || {};
  OSB.data = async function(path, fallback=[]){
    try{ const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error(path); return await r.json(); }
    catch(e){ console.warn('OSB data fallback',path,e); return fallback; }
  };
  OSB.renderInventory = async function(target='#inventory'){
    const rows=[
      ['Temples','data/temples.json','12+','OK','Expand Tamil details'],
      ['Slokas','data/sloka_details.json','8+','OK','Add canonical full text after review'],
      ['Knowledge','data/knowledge/entities.json','Pending','Review','Complete relationship graph'],
      ['PWA','manifest.json','Active','OK','Run Lighthouse'],
      ['Testing','final-test-plan.html','Open','Review','Claude/Gemini website pass']
    ];
    const el=$(target); if(!el) return;
    el.innerHTML='<table class="table"><thead><tr><th>Area</th><th>Path</th><th>Count</th><th>Status</th><th>Next action</th></tr></thead><tbody>'+
      rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><b style="color:${r[3]=='OK'?'#047857':'#b45309'}">${r[3]}</b></td><td>${r[4]}</td></tr>`).join('')+
      '</tbody></table>';
  };
  OSB.utility = function(){
    if(document.querySelector('.utility-dock')) return;
    const dock=document.createElement('div'); dock.className='utility-dock';
    dock.innerHTML='<button data-act="font">A+ Text</button><button data-act="night">☾ Night</button><button data-act="save">♡ Save</button><button data-act="share">↗ Share</button>';
    document.body.appendChild(dock);
    dock.addEventListener('click',async e=>{
      const b=e.target.closest('button'); if(!b)return;
      if(b.dataset.act==='font'){document.body.style.fontSize=(document.body.style.fontSize==='18px'?'':'18px')}
      if(b.dataset.act==='night'){document.body.classList.toggle('dark')}
      if(b.dataset.act==='save'){localStorage.setItem('osb_saved_'+location.pathname+location.search,document.title); b.textContent='✓ Saved'}
      if(b.dataset.act==='share'){try{await navigator.clipboard.writeText(location.href); b.textContent='✓ Copied'}catch{location.href='mailto:?subject=Om Saravana Bhava&body='+encodeURIComponent(location.href)}}
    });
  };
  document.addEventListener('DOMContentLoaded',()=>{OSB.utility(); OSB.renderInventory();});
})();
