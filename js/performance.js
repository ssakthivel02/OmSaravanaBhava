(function(){
  window.OmApp=window.OmApp||{};
  window.OmApp.performance={
    init:function(){
      document.querySelectorAll('img:not([loading])').forEach(img=>img.loading='lazy');
      document.querySelectorAll('a[href^="http"]').forEach(a=>{if(!a.hostname.includes(location.hostname)){a.rel='noopener noreferrer';a.target='_blank';}});
      if('PerformanceObserver' in window){try{new PerformanceObserver(list=>{const entries=list.getEntries();window.OmApp.lastPerf=entries.map(e=>({name:e.name,value:e.value||e.startTime}));}).observe({entryTypes:['largest-contentful-paint','layout-shift']});}catch(e){}}
    }
  };
  document.addEventListener('DOMContentLoaded',()=>window.OmApp.performance.init());
})();
