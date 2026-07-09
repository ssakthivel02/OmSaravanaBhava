async function osbLoadLiteratureIndex(){const r=await fetch('/literature/data/search-index/batch-10-literature-index.json');return await r.json()}
window.osbLoadLiteratureIndex=osbLoadLiteratureIndex;
