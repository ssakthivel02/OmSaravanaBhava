const input=document.getElementById('q'),out=document.getElementById('results'),count=document.getElementById('count');let items=[];
const norm=s=>(s||'').toLocaleLowerCase().normalize('NFKD');
function score(item,q){const hay=norm([item.name,item.name_ta,item.district,...(item.aliases||[])].join(' '));if(!q)return 1;if(hay.startsWith(q))return 5;if(hay.includes(q))return 3;return q.split(/\s+/).every(x=>hay.includes(x))?2:0}
function render(){const q=norm(input.value.trim());const found=items.map(x=>[x,score(x,q)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);count.textContent=`${found.length} result(s)`;out.innerHTML=found.map(x=>`<article class="result"><a href="${x.href}">${x.name_ta} · ${x.name}</a><small>${x.district} · ${(x.aliases||[]).join(', ')}</small></article>`).join('')}
fetch('data/search/temple-search-index.json').then(r=>r.json()).then(d=>{items=d.records;render()});input.addEventListener('input',render);
