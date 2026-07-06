document.getElementById('year').textContent = new Date().getFullYear();
const glow=document.querySelector('.cursor-glow');
document.addEventListener('mousemove',e=>{glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'});
document.querySelector('.menu-toggle')?.addEventListener('click',()=>document.querySelector('.nav-links').classList.toggle('open'));
document.querySelectorAll('.tilt-card').forEach(card=>{card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;card.style.transform=`rotateY(${x*10}deg) rotateX(${-y*10}deg)`});card.addEventListener('mouseleave',()=>card.style.transform='rotateY(0) rotateX(0)')});
const io=new IntersectionObserver(entries=>entries.forEach(en=>{if(en.isIntersecting)en.target.classList.add('visible')}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
