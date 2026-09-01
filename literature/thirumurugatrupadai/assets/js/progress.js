addEventListener('scroll',()=>{const h=document.documentElement;const p=(h.scrollTop/(h.scrollHeight-h.clientHeight))*100;document.documentElement.style.setProperty('--read-progress',p+'%')});
