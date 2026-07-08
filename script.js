(function(){
  function load(src){if(document.querySelector('script[src="'+src+'"]'))return;var s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s);} 
  load('/js/theme-controls.js');
  load('/js/performance.js');
  load('/js/pwa-install.js');
})();
