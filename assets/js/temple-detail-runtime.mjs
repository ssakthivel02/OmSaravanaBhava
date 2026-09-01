import {CONFIG} from './core/config.mjs';
import {loadJson} from './core/data-loader.mjs';
import {qs} from './utils/dom.mjs';
import {showToast} from './utils/toast.mjs';
import {initHeader} from './components/header.mjs';
import {renderTempleSwitcher} from './components/temple-switcher.mjs';
import {renderFacts} from './components/facts.mjs';
import {renderGallery} from './components/gallery.mjs';
import {renderFestivals} from './components/festivals.mjs';
import {renderRelated} from './components/related.mjs';
import {getSavedTemples, toggleSavedTemple} from './features/pilgrimage.mjs';
import {relativeTemple} from './features/navigation.mjs';
import {applySeo} from './features/seo.mjs';

initHeader();

const params = new URLSearchParams(location.search);
const requestedId = params.get('id') || CONFIG.defaultTemple;

let indexItems = [];
let record = null;

function render(){
  applySeo(record);
  qs('#temple-hero').style.backgroundImage = `url("${record.image}")`;
  qs('#temple-group').textContent = record.group;
  qs('#temple-name').textContent = record.name;
  qs('#temple-name-ta').textContent = record.name_ta;
  qs('#temple-location').textContent = `${record.district}, ${record.state}`;
  qs('#temple-theme').textContent = record.theme;
  qs('#temple-intro').textContent = record.summary;
  qs('#publication-label').textContent = record.publication.label;
  qs('#publication-note').textContent = record.publication.note;

  renderFacts(qs('#temple-facts'), record.facts);
  renderGallery(qs('#temple-gallery'), record.gallery);
  renderFestivals(qs('#temple-festivals'), record.festivals);
  renderRelated(qs('#temple-related'), record.related);
  renderTempleSwitcher(qs('#temple-switcher'), indexItems, record.id);

  const saved = getSavedTemples();
  qs('#save-temple').textContent = saved.includes(record.id) ? 'Saved to pilgrimage' : 'Save to pilgrimage';
  qs('#pilgrimage-progress').style.width = `${(record.order / indexItems.length) * 100}%`;
  qs('#pilgrimage-progress-text').textContent = `${record.order} of ${indexItems.length} sacred abodes`;
}

Promise.all([
  loadJson(CONFIG.templeIndex),
  loadJson(`${CONFIG.templeDirectory}/${encodeURIComponent(requestedId)}.json`)
]).then(([index, temple]) => {
  indexItems = index.records || [];
  record = temple;
  render();

  qs('#save-temple').addEventListener('click', () => {
    const result = toggleSavedTemple(record.id);
    qs('#save-temple').textContent = result.saved ? 'Saved to pilgrimage' : 'Save to pilgrimage';
    showToast(result.saved ? `${record.name} saved.` : `${record.name} removed.`);
  });

  qs('#previous-temple').addEventListener('click', () => {
    const target = relativeTemple(indexItems, record.id, -1);
    location.href = `temple-detail.html?id=${encodeURIComponent(target.id)}`;
  });
  qs('#next-temple').addEventListener('click', () => {
    const target = relativeTemple(indexItems, record.id, 1);
    location.href = `temple-detail.html?id=${encodeURIComponent(target.id)}`;
  });
}).catch(error => {
  console.error(error);
  qs('#temple-name').textContent = 'Temple record unavailable';
  qs('#temple-intro').textContent = 'Confirm that the temple JSON file and index were uploaded correctly.';
});
