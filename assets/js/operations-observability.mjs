
import {loadOperationsData} from './operations-observability-data.mjs';
const byId = id => document.getElementById(id);
const text = (id, value) => { const node=byId(id); if(node) node.textContent=String(value); };
const badge = status => `<span class="ops-badge ops-${String(status).toLowerCase()}">${status}</span>`;
const renderDomains = catalog => {
  const body = byId('opsDomainRows');
  body.innerHTML = catalog.domains.map(domain => `<tr><th scope="row">${domain.title}</th><td>${domain.checkCount}</td><td>${domain.automatedCount}</td><td>${domain.advisoryCount}</td></tr>`).join('');
};
const render = data => {
  text('opsRelease', data.summary.release);
  text('opsChecks', data.summary.checkCount);
  text('opsAutomated', data.summary.automatedCount);
  text('opsAdvisory', data.summary.advisoryCount);
  text('opsRouteCount', data.liveRoutes.routes?.length ?? 0);
  text('opsCacheRelease', data.pwa.cacheRelease);
  text('opsAttestationAssets', data.attestation.criticalAssets.length);
  byId('opsStatus').innerHTML = badge(data.summary.status);
  byId('opsPrivacy').textContent = data.summary.privacy;
  renderDomains(data.catalog);
  const limits = [...data.summary.limitations, ...data.routes.limitations, ...data.pwa.limitations];
  byId('opsLimitations').innerHTML = limits.map(item => `<li>${item}</li>`).join('');
  text('opsMessage', 'Release 244 observability data loaded successfully.');
};
const fail = error => {
  text('opsMessage', `Unable to load observability data: ${error.message}`);
  byId('opsStatus').innerHTML = badge('DEGRADED');
};
loadOperationsData().then(render).catch(fail);
byId('opsRefresh')?.addEventListener('click', () => loadOperationsData().then(render).catch(fail));
