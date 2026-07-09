(function(){
  function qs(s){return document.querySelector(s)}
  function renderIndex(items){var root=qs('[data-wisdom-index]'); if(!root)return; root.innerHTML=items.map(function(x){return '<a href="'+x.url+'"><strong>'+x.title+'</strong><br><span>'+x.theme+' • '+x.readingTime+'</span></a>'}).join('')}
  function filter(items,q){q=(q||'').toLowerCase();return items.filter(function(x){return (x.title+' '+x.theme+' '+x.keywords.join(' ')).toLowerCase().indexOf(q)>-1})}
  fetch('../data/daily-wisdom-index.json').then(function(r){return r.json()}).then(function(data){renderIndex(data.items); var input=qs('[data-wisdom-search]'); if(input){input.addEventListener('input',function(){renderIndex(filter(data.items,input.value))})}}).catch(function(){})
})();
