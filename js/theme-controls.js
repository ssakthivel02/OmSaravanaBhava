(function(){
  window.OmApp=window.OmApp||{};
  const KEY='osb_preferences_v1';
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return{}}}
  function save(p){localStorage.setItem(KEY,JSON.stringify(p));}
  function toast(msg){let t=document.querySelector('.osb-toast');if(!t){t=document.createElement('div');t.className='osb-toast';document.body.appendChild(t);}t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);}
  function apply(){const p=read();document.body.classList.toggle('theme-night',!!p.night);document.body.classList.toggle('reading-focus',!!p.reading);document.body.classList.remove('font-large','font-xlarge');if(p.font==='large')document.body.classList.add('font-large');if(p.font==='xlarge')document.body.classList.add('font-xlarge');}
  function buildDock(){if(document.querySelector('.osb-utility-dock'))return;const dock=document.createElement('div');dock.className='osb-utility-dock';dock.setAttribute('aria-label','Page tools');dock.innerHTML='<button data-osb-tool="font" aria-label="Increase font size">A+</button><button data-osb-tool="night" aria-label="Toggle night mode">☾</button><button data-osb-tool="save" aria-label="Save this page">♥</button><button data-osb-tool="share" aria-label="Share this page">Share</button>';document.body.appendChild(dock);dock.addEventListener('click',async(e)=>{const b=e.target.closest('button');if(!b)return;const p=read();const tool=b.dataset.osbTool;if(tool==='font'){p.font=p.font==='large'?'xlarge':p.font==='xlarge'?'normal':'large';save(p);apply();toast('Reading size updated');}
    if(tool==='night'){p.night=!p.night;save(p);apply();toast(p.night?'Night mode on':'Night mode off');}
    if(tool==='save'){const saved=JSON.parse(localStorage.getItem('osb_saved_pages')||'[]');const page={title:document.title,url:location.href,time:Date.now()};const next=[page,...saved.filter(x=>x.url!==page.url)].slice(0,25);localStorage.setItem('osb_saved_pages',JSON.stringify(next));toast('Page saved');}
    if(tool==='share'){try{if(navigator.share){await navigator.share({title:document.title,url:location.href});}else{await navigator.clipboard.writeText(location.href);toast('Link copied');}}catch(err){toast('Share cancelled');}}
  });}
  function progress(){if(document.querySelector('.osb-progress'))return;const bar=document.createElement('div');bar.className='osb-progress';document.body.appendChild(bar);window.addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-innerHeight;bar.style.width=(max>0?scrollY/max*100:0)+'%';},{passive:true});}
  window.OmApp.themeControls={init:function(){apply();buildDock();progress();}};
  document.addEventListener('DOMContentLoaded',()=>window.OmApp.themeControls.init());
})();
