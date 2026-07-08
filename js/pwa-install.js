(function(){
  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;showBanner();});
  function showBanner(){if(localStorage.getItem('osb_install_dismissed'))return;let b=document.querySelector('.osb-install-banner');if(!b){b=document.createElement('div');b.className='osb-install-banner';b.innerHTML='<div><strong>Install Om Saravana Bhava</strong><br><span>Open faster and use key pages offline.</span></div><div><button data-install>Install</button> <button data-dismiss>Later</button></div>';document.body.appendChild(b);b.addEventListener('click',async e=>{if(e.target.matches('[data-dismiss]')){localStorage.setItem('osb_install_dismissed','1');b.classList.remove('show');}if(e.target.matches('[data-install]')&&deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;b.classList.remove('show');}});}b.classList.add('show');}
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
})();
