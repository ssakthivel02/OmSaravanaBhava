import {
  CONSUMER_RELEASE,
  loadEffectiveRouteRegistry,
  registryStatusMessage
} from './effective-route-registry.mjs';

export const RELEASE = 246;

const byId = id => document.getElementById(id);
const create = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const fetchJson = async path => {
  const response = await fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};

const metric = (value, label) => {
  const article = create('article', 'premium-metric');
  article.setAttribute('data-spotlight', '');
  article.append(
    create('strong', '', String(value)),
    create('span', '', label)
  );
  return article;
};

const routeCard = route => {
  const article = create('article', 'premium-card platform-route-card');
  article.setAttribute('data-spotlight', '');
  const pills = create('div', 'premium-pills');
  [
    route.category,
    route.status,
    route.routeAdditionApplied ? 'New governed route' : ''
  ].filter(Boolean).forEach(value => {
    pills.appendChild(create('span', 'premium-pill', value));
  });
  const heading = create(
    'h3',
    '',
    route.titleTa
      ? `${route.titleTa} · ${route.titleEn || ''}`
      : route.titleEn || route.path
  );
  const summary = create(
    'p',
    '',
    route.summary || 'Governed public route.'
  );
  const path = create('code', '', route.path);
  const link = create('a', 'premium-button secondary', 'Open route');
  link.href = route.path;
  article.append(pills, heading, summary, path, link);
  return article;
};

const initialise = async () => {
  const status = byId('platformStatus');
  const metrics = byId('platformMetrics');
  const grid = byId('platformRouteGrid');
  const query = byId('platformQuery');
  const category = byId('platformCategory');
  const routeStatus = byId('platformRouteStatus');
  const clear = byId('platformClear');
  if (
    !status || !metrics || !grid || !query ||
    !category || !routeStatus || !clear
  ) return;

  const [
    registryResult,
    completenessResult,
    recoveryResult,
    capabilitiesResult
  ] = await Promise.allSettled([
    loadEffectiveRouteRegistry(),
    fetchJson('/data/content-completeness.json'),
    fetchJson('/data/route-recovery-summary.json'),
    fetchJson('/data/platform-capability-matrix.json')
  ]);
  if (registryResult.status !== 'fulfilled') {
    status.textContent = (
      'The governed route registry could not be loaded. '
      + 'Use the primary navigation and sitemap.'
    );
    grid.innerHTML = (
      '<article class="premium-card" role="alert">'
      + 'Route directory unavailable.</article>'
    );
    return;
  }

  const registry = registryResult.value;
  const completeness = completenessResult.status === 'fulfilled'
    ? completenessResult.value
    : {};
  const recovery = recoveryResult.status === 'fulfilled'
    ? recoveryResult.value
    : {};
  const capabilities = capabilitiesResult.status === 'fulfilled'
    ? capabilitiesResult.value
    : {};
  const records = Array.isArray(registry.routes) ? registry.routes : [];
  const categories = [
    ...new Set(records.map(record => record.category).filter(Boolean))
  ].sort();
  const statuses = [
    ...new Set(records.map(record => record.status).filter(Boolean))
  ].sort();
  categories.forEach(value => category.add(new Option(value, value)));
  statuses.forEach(value => routeStatus.add(new Option(value, value)));

  const connected = capabilities.statusCounts?.connected || 0;
  const attention = (
    (capabilities.statusCounts?.['exists-not-governed'] || 0) +
    (capabilities.statusCounts?.['governed-not-prominent'] || 0) +
    (capabilities.statusCounts?.['missing-capability-route'] || 0)
  );
  metrics.replaceChildren(
    metric(records.length, 'Governed routes'),
    metric(connected, 'Connected capabilities'),
    metric(
      completeness.canonicalFullSongRecords || 0,
      'Canonical full-song records'
    ),
    metric(
      attention || recovery.uniqueSafeRepairsOnCanonicalPages || 0,
      attention ? 'Capabilities needing attention' : 'Safe link repairs queued'
    )
  );

  const state = {query: '', category: 'All', status: 'All'};
  const render = () => {
    const needle = state.query.trim().toLocaleLowerCase();
    const filtered = records.filter(record => {
      if (
        state.category !== 'All' &&
        record.category !== state.category
      ) return false;
      if (
        state.status !== 'All' &&
        record.status !== state.status
      ) return false;
      if (!needle) return true;
      return [
        record.path, record.titleTa, record.titleEn, record.category,
        record.status, record.summary
      ].filter(Boolean).join(' ').toLocaleLowerCase().includes(needle);
    }).sort((left, right) =>
      String(left.category || '').localeCompare(
        String(right.category || '')
      ) ||
      String(left.titleEn || left.path).localeCompare(
        String(right.titleEn || right.path)
      )
    );
    grid.replaceChildren();
    if (!filtered.length) {
      grid.appendChild(create(
        'article',
        'premium-card',
        'No governed route matched the selected filters.'
      ));
    } else {
      filtered.forEach(record => grid.appendChild(routeCard(record)));
    }
    status.textContent = (
      `${filtered.length} of ${records.length} routes shown. `
      + registryStatusMessage(registry)
    );
  };

  query.addEventListener('input', event => {
    state.query = event.target.value;
    render();
  });
  category.addEventListener('change', event => {
    state.category = event.target.value;
    render();
  });
  routeStatus.addEventListener('change', event => {
    state.status = event.target.value;
    render();
  });
  clear.addEventListener('click', () => {
    state.query = '';
    state.category = 'All';
    state.status = 'All';
    query.value = '';
    category.value = 'All';
    routeStatus.value = 'All';
    render();
    query.focus();
  });
  render();
  document.documentElement.dataset.platformHubRelease = String(RELEASE);
  document.documentElement.dataset.routeConsumerRelease = String(
    CONSUMER_RELEASE
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialise, {once: true});
} else {
  initialise();
}
