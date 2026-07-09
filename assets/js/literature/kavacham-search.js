async function searchKavacham(term){const r=await fetch('/data/search/kandar-sashti-kavacham-index.json');const j=await r.json();return j.items.filter(x=>(x.title+x.tamil+x.keywords.join(' ')).toLowerCase().includes(term.toLowerCase()));}
window.searchKavacham=searchKavacham;
