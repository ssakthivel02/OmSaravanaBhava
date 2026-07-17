import {CONFIG} from './core/config.mjs';
import {loadJson} from './core/data-loader.mjs';
import {setTemples, setFiltered} from './core/state.mjs';
import {qs} from './utils/dom.mjs';
import {showToast} from './utils/toast.mjs';
import {initHeader} from './components/header.mjs';
import {templeCard} from './components/temple-card.mjs';
import {filterTemples} from './features/search.mjs';
import {getSavedTemples, toggleSavedTemple} from './features/pilgrimage.mjs';
import {updateMetrics} from './features/metrics.mjs';

initHeader();

const results = qs('#temple-results');
const empty = qs('#empty-state');
const search = qs('#temple-search');
const district = qs('#district-filter');
const group = qs('#group-filter');
const clear = qs('#clear-filters');

let temples = [];

function render(items){
  const saved = getSavedTemples();
  results.innerHTML = items.map(item => templeCard(item, saved.includes(item.id))).join('');
  empty.hidden = items.length !== 0;
  updateMetrics(temples, saved);

  results.querySelectorAll('[data-save-temple]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-save-temple');
      const result = toggleSavedTemple(id);
      button.textContent = result.saved ? 'Saved' : 'Save';
      updateMetrics(temples, result.list);
      showToast(result.saved ? 'Temple saved to your pilgrimage list.' : 'Temple removed from your pilgrimage list.');
    });
  });
}

function applyFilters(){
  const filtered = filterTemples(temples, {
    query: search.value,
    district: district.value,
    group: group.value
  });
  setFiltered(filtered);
  render(filtered);
}

loadJson(CONFIG.templeIndex)
  .then(data => {
    temples = data.records || [];
    setTemples(temples);
    [...new Set(temples.map(item => item.district))].sort().forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      district.append(option);
    });
    render(temples);
  })
  .catch(error => {
    console.error(error);
    results.innerHTML = '<p class="te-empty">Temple data could not be loaded. Confirm data/temples/index.json was uploaded.</p>';
  });

[search,district,group].forEach(control => control.addEventListener('input', applyFilters));
clear.addEventListener('click', () => {
  search.value = '';
  district.value = '';
  group.value = '';
  applyFilters();
});
