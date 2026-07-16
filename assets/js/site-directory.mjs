import {
  CONSUMER_RELEASE,
  loadEffectiveRouteRegistry,
  registryStatusMessage
} from './effective-route-registry.mjs';

export const RELEASE = 237;

export const filterDirectoryRecords = (
  records,
  {
    query = '',
    category = 'All',
    status = 'All'
  } = {}
) => {
  const needle = String(query).trim().toLocaleLowerCase();
  return (Array.isArray(records) ? records : [])
    .filter(record => {
      if (
        category !== 'All' &&
        record.category !== category
      ) return false;
      if (
        status !== 'All' &&
        record.status !== status
      ) return false;
      if (!needle) return true;
      return [
        record.path,
        record.titleTa,
        record.titleEn,
        record.category,
        record.status,
        record.summary,
        record.publicationStatusPrevious
      ].join(' ').toLocaleLowerCase().includes(needle);
    })
    .sort((left, right) =>
      String(left.category).localeCompare(String(right.category)) ||
      String(left.titleEn).localeCompare(String(right.titleEn))
    );
};

const byId = (documentRef, id) =>
  documentRef.getElementById(id);

const option = (documentRef, value) => {
  const node = documentRef.createElement('option');
  node.value = value;
  node.textContent = value;
  return node;
};

const routeCard = (documentRef, record) => {
  const article = documentRef.createElement('article');
  article.className = 'card route-card';

  const meta = documentRef.createElement('p');
  meta.className = 'route-meta';
  [
    record.category,
    record.status,
    record.effectiveOverrideApplied
      ? 'Explicit override'
      : ''
  ].filter(Boolean).forEach(value => {
    const badge = documentRef.createElement('span');
    badge.className = 'pill';
    badge.textContent = value;
    meta.appendChild(badge);
  });

  const heading = documentRef.createElement('h2');
  heading.textContent = record.titleTa
    ? `${record.titleTa} · ${record.titleEn}`
    : record.titleEn;
  const summary = documentRef.createElement('p');
  summary.textContent = record.summary;
  const code = documentRef.createElement('code');
  code.textContent = record.path;
  const link = documentRef.createElement('a');
  link.className = 'btn';
  link.href = record.path;
  link.textContent = 'Open route';

  article.append(meta, heading, summary, code, link);
  return article;
};

export const initialiseSiteDirectory = async ({
  documentRef = globalThis.document,
  fetcher = globalThis.fetch
} = {}) => {
  if (!documentRef) return false;
  const grid = byId(documentRef, 'routeGrid');
  const search = byId(documentRef, 'routeSearch');
  const category = byId(documentRef, 'routeCategory');
  const status = byId(documentRef, 'routeStatus');
  const reset = byId(documentRef, 'routeReset');
  const count = byId(documentRef, 'routeCount');
  if (!grid || !search || !category || !status || !reset || !count) {
    return false;
  }

  const state = {
    records: [],
    query: '',
    category: 'All',
    status: 'All'
  };

  const render = () => {
    const filtered = filterDirectoryRecords(
      state.records,
      state
    );
    grid.replaceChildren();
    if (filtered.length) {
      filtered.forEach(record => {
        grid.appendChild(routeCard(documentRef, record));
      });
    } else {
      const empty = documentRef.createElement('div');
      empty.className = 'card';
      empty.textContent =
        'No route matches the selected filters.';
      grid.appendChild(empty);
    }
    grid.setAttribute('aria-busy', 'false');
    count.textContent =
      `${filtered.length} of ${state.records.length} routes shown.`;
  };

  try {
    const registry = await loadEffectiveRouteRegistry({fetcher});
    state.records = Array.isArray(registry.routes)
      ? registry.routes
      : [];

    [...new Set(
      state.records.map(record => record.category).filter(Boolean)
    )].sort().forEach(value => {
      category.appendChild(option(documentRef, value));
    });
    [...new Set(
      state.records.map(record => record.status).filter(Boolean)
    )].sort().forEach(value => {
      status.appendChild(option(documentRef, value));
    });

    search.addEventListener('input', event => {
      state.query = event.target.value;
      render();
    });
    category.addEventListener('change', event => {
      state.category = event.target.value;
      render();
    });
    status.addEventListener('change', event => {
      state.status = event.target.value;
      render();
    });
    reset.addEventListener('click', () => {
      state.query = '';
      state.category = 'All';
      state.status = 'All';
      search.value = '';
      category.value = 'All';
      status.value = 'All';
      render();
      search.focus();
    });

    count.textContent = registryStatusMessage(registry);
    render();
    documentRef.documentElement.dataset.siteDirectoryRelease =
      String(RELEASE);
    documentRef.documentElement.dataset.consumerRelease =
      String(CONSUMER_RELEASE);
    return true;
  } catch (error) {
    console.error(
      '[OmSaravanaBhava] Route directory unavailable',
      error
    );
    grid.setAttribute('aria-busy', 'false');
    const alert = documentRef.createElement('div');
    alert.className = 'card';
    alert.setAttribute('role', 'alert');
    alert.textContent =
      'The route directory could not be loaded. Use sitemap.xml or primary navigation.';
    grid.replaceChildren(alert);
    count.textContent =
      `Route directory unavailable: ${String(error?.message || error)}`;
    return false;
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => initialiseSiteDirectory(),
      {once: true}
    );
  } else {
    initialiseSiteDirectory();
  }
}
