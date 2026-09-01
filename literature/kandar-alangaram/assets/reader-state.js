(function(){
  const key='osb-kandar-alangaram-last-page';
  document.querySelectorAll('[data-osb-save]').forEach(a=>a.addEventListener('click',()=>localStorage.setItem(key,a.getAttribute('href'))));
  const resume=document.querySelector('[data-osb-resume]');
  if(resume){const last=localStorage.getItem(key); if(last) resume.href=last;}
})();
