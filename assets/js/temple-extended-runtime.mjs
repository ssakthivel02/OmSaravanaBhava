import {loadJson} from './core/data-loader.mjs';
import {qs} from './utils/dom.mjs';
import {showToast} from './utils/toast.mjs';
import {initHeader} from './components/header.mjs';
import {renderTempleSwitcher} from './components/temple-switcher.mjs';
import {renderProfile} from './components/extended-profile.mjs';
import {renderHistory} from './components/extended-history.mjs';
import {renderPuranam} from './components/extended-puranam.mjs';
import {renderInfoGrid} from './components/extended-info-grid.mjs';
import {renderFestivalTimeline} from './components/extended-festivals.mjs';
import {renderGalleryCategories} from './components/extended-gallery.mjs';
import {renderEditorial} from './components/extended-editorial.mjs';
import {getSavedTemples, toggleSavedTemple} from './features/pilgrimage.mjs';

initHeader();

const params = new URLSearchParams(location.search);
const id = params.get('id') || 'tirupparankundram';

Promise.all([
  loadJson('data/temples/extended/index.json'),
  loadJson(`data/temples/extended/${encodeURIComponent(id)}.json`)
]).then(([index, record]) => {
  document.title = `${record.name_ta} | ${record.name} Extended Temple Guide`;
  qs('#extended-hero').style.backgroundImage = `url("${record.image}")`;
  qs('#extended-group').textContent = record.group;
  qs('#extended-name').textContent = record.name;
  qs('#extended-name-ta').textContent = record.name_ta;
  qs('#extended-location').textContent = `${record.district}, ${record.state}`;
  qs('#extended-theme').textContent = record.theme;

  renderTempleSwitcher(qs('#extended-switcher'), index.records, record.id);
  renderProfile(qs('#quick-profile'), record.quick_profile);
  renderHistory(qs('#history-content'), record.history);
  renderPuranam(qs('#puranam-content'), record.sthala_puranam);
  renderInfoGrid(qs('#architecture-content'), record.architecture);
  renderFestivalTimeline(qs('#festival-content'), record.festivals);
  renderInfoGrid(qs('#travel-content'), record.travel);
  renderGalleryCategories(qs('#gallery-categories'), record.gallery_categories);

  qs('#editorial-label').textContent = record.editorial.label;
  qs('#editorial-note').textContent = record.editorial.note;
  renderEditorial(qs('#editorial-fields'), record.editorial.fields);

  const saved = getSavedTemples();
  qs('#save-extended').textContent = saved.includes(record.id) ? 'Saved temple' : 'Save temple';
  qs('#save-extended').addEventListener('click', () => {
    const result = toggleSavedTemple(record.id);
    qs('#save-extended').textContent = result.saved ? 'Saved temple' : 'Save temple';
    showToast(result.saved ? `${record.name} saved.` : `${record.name} removed.`);
  });
}).catch(error => {
  console.error(error);
  qs('#extended-name').textContent = 'Extended temple record unavailable';
});
