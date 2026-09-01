import {loadJson} from './core/data-loader.mjs';
import {initHeader} from './components/header.mjs';
import {renderRegionalProfile} from './components/regional-profile.mjs';
import {renderRegionalSources} from './components/regional-sources.mjs';
import {renderRegionalPending} from './components/regional-pending.mjs';

initHeader();
const id=new URLSearchParams(location.search).get('id')||'marudhamalai';

loadJson(`data/temples/regional/${encodeURIComponent(id)}.json`).then(record=>{
  document.title=`${record.name_ta} | ${record.name}`;
  document.getElementById('regional-detail-setting').textContent=record.setting;
  document.getElementById('regional-detail-name').textContent=record.name;
  document.getElementById('regional-detail-name-ta').textContent=record.name_ta;
  document.getElementById('regional-detail-location').textContent=`${record.district}, ${record.state}`;
  document.getElementById('regional-official-link').href=record.official_source;
  document.getElementById('regional-summary').textContent=record.summary;
  document.getElementById('regional-status-label').textContent=record.publication.label;
  document.getElementById('regional-status-note').textContent=record.publication.note;
  document.getElementById('regional-image-note').textContent=record.image.note;
  renderRegionalProfile(document.getElementById('regional-profile'),record.profile);
  renderRegionalSources(document.getElementById('regional-sources'),record.sources);
  renderRegionalPending(document.getElementById('regional-pending'),record.pending);
}).catch(error=>{
  console.error(error);
  document.getElementById('regional-detail-name').textContent='Regional temple record unavailable';
});
