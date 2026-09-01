import {loadJson} from './core/data-loader.mjs';
import {initHeader} from './components/header.mjs';
import {regionalCard} from './components/regional-card.mjs';
import {filterRegional} from './features/regional-filter.mjs';
import {updateRegionalMetrics} from './features/regional-metrics.mjs';

initHeader();

const results=document.getElementById('regional-results');
const empty=document.getElementById('regional-empty');
const search=document.getElementById('regional-search');
const district=document.getElementById('regional-district');
const setting=document.getElementById('regional-setting');
const clear=document.getElementById('regional-clear');
let records=[];

function render(items){
  results.innerHTML=items.map(regionalCard).join('');
  empty.hidden=items.length!==0;
}
function apply(){
  render(filterRegional(records,{query:search.value,district:district.value,setting:setting.value}));
}
loadJson('data/temples/regional/index.json').then(data=>{
  records=data.records||[];
  [...new Set(records.map(x=>x.district))].sort().forEach(v=>district.add(new Option(v,v)));
  [...new Set(records.map(x=>x.setting))].sort().forEach(v=>setting.add(new Option(v,v)));
  updateRegionalMetrics(records);
  render(records);
}).catch(error=>{
  console.error(error);
  results.innerHTML='<p class="te-empty">Regional catalogue data could not be loaded.</p>';
});
[search,district,setting].forEach(x=>x.addEventListener('input',apply));
clear.addEventListener('click',()=>{search.value='';district.value='';setting.value='';apply();});
