export const RELEASE = 216;
export const STORAGE_KEY = 'osb-reading-list-v1';
export const USER_READING_CACHE = 'osb-user-reading-v1';
export const MAX_ITEMS = 100;
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

const safeStorage = storage => {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const normaliseReadingRoute = (route, origin = CANONICAL_ORIGIN) => {
  const value = String(route ?? '').trim();
  if (!value) return '';
  try {
    const base = new URL(origin);
    const url = new URL(value, `${base.origin}/`);
    if (url.origin !== base.origin) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
};

export const routePath = route => {
  const normalised = normaliseReadingRoute(route);
  if (!normalised) return '';
  try {
    return new URL(normalised, CANONICAL_ORIGIN).pathname;
  } catch {
    return '';
  }
};

export const cacheableRoute = route => {
  const normalised = normaliseReadingRoute(route);
  if (!normalised) return '';
  const url = new URL(normalised, CANONICAL_ORIGIN);
  return `${url.pathname}${url.search}`;
};

export const sanitiseReadingItem = (record, savedAt = new Date().toISOString()) => {
  if (!record || typeof record !== 'object') return null;
  const route = normaliseReadingRoute(record.route);
  if (!route) return null;
  const titleTa = String(record.titleTa ?? '').trim();
  const titleEn = String(record.titleEn ?? '').trim();
  const fallbackTitle = String(record.title ?? record.id ?? route).trim();
  return {
    route,
    titleTa,
    titleEn: titleEn || fallbackTitle,
    kind: String(record.kind ?? 'Published page').trim() || 'Published page',
    status: String(record.status ?? 'published').trim() || 'published',
    summary: String(record.summary ?? '').trim(),
    savedAt: String(record.savedAt ?? savedAt)
  };
};

export const loadReadingList = storage => {
  const target = safeStorage(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(target.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    const items = [];
    parsed.forEach(record => {
      const item = sanitiseReadingItem(record, record?.savedAt);
      if (!item || seen.has(item.route)) return;
      seen.add(item.route);
      items.push(item);
    });
    return items.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
};

export const saveReadingList = (items, storage) => {
  const target = safeStorage(storage);
  if (!target) return false;
  try {
    const clean = [];
    const seen = new Set();
    (Array.isArray(items) ? items : []).forEach(record => {
      const item = sanitiseReadingItem(record, record?.savedAt);
      if (!item || seen.has(item.route)) return;
      seen.add(item.route);
      clean.push(item);
    });
    target.setItem(STORAGE_KEY, JSON.stringify(clean.slice(0, MAX_ITEMS)));
    return true;
  } catch {
    return false;
  }
};

export const upsertReadingItem = (items, record, savedAt = new Date().toISOString()) => {
  const item = sanitiseReadingItem(record, savedAt);
  if (!item) return Array.isArray(items) ? [...items] : [];
  const remaining = (Array.isArray(items) ? items : [])
    .map(existing => sanitiseReadingItem(existing, existing?.savedAt))
    .filter(Boolean)
    .filter(existing => existing.route !== item.route);
  return [item, ...remaining].slice(0, MAX_ITEMS);
};

export const saveReadingRecord = (record, storage) => {
  const items = upsertReadingItem(loadReadingList(storage), record);
  if (!saveReadingList(items, storage)) {
    throw new Error('Browser storage is unavailable.');
  }
  return items;
};

export const removeReadingRoute = (route, storage) => {
  const normalised = normaliseReadingRoute(route);
  const items = loadReadingList(storage).filter(item => item.route !== normalised);
  saveReadingList(items, storage);
  return items;
};

export const isRouteSaved = (route, storage) => {
  const normalised = normaliseReadingRoute(route);
  return Boolean(normalised) &&
    loadReadingList(storage).some(item => item.route === normalised);
};

export const cacheSavedRoutes = async (
  items,
  cacheStorage = globalThis.caches,
  fetcher = globalThis.fetch
) => {
  if (!cacheStorage?.open || typeof fetcher !== 'function') {
    return {cached: [], failed: [{route: '', reason: 'Cache API unavailable'}]};
  }
  const cache = await cacheStorage.open(USER_READING_CACHE);
  const routes = [...new Set(
    (Array.isArray(items) ? items : [])
      .map(item => cacheableRoute(item?.route))
      .filter(Boolean)
  )];
  const cached = [];
  const failed = [];
  for (const route of routes) {
    try {
      const response = await fetcher(route, {
        cache: 'reload',
        credentials: 'same-origin',
        headers: {'Accept': 'text/html,application/xhtml+xml'}
      });
      if (!response?.ok) throw new Error(`HTTP ${response?.status ?? 'unknown'}`);
      await cache.put(route, response.clone());
      cached.push(route);
    } catch (error) {
      failed.push({route, reason: String(error?.message || error)});
    }
  }
  return {cached, failed};
};

export const removeCachedRoute = async (route, cacheStorage = globalThis.caches) => {
  if (!cacheStorage?.open) return false;
  const target = cacheableRoute(route);
  if (!target) return false;
  const cache = await cacheStorage.open(USER_READING_CACHE);
  return cache.delete(target, {ignoreSearch: false});
};

export const clearOfflineReadingCache = async (cacheStorage = globalThis.caches) => {
  if (!cacheStorage?.delete) return false;
  return cacheStorage.delete(USER_READING_CACHE);
};

const createText = (parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
};

const displayTitle = item =>
  item.titleTa && item.titleEn
    ? `${item.titleTa} · ${item.titleEn}`
    : item.titleTa || item.titleEn || item.route;

const initialiseReadingList = () => {
  const host = document.getElementById('readingListItems');
  const count = document.getElementById('readingListCount');
  const status = document.getElementById('readingListStatus');
  const cacheAll = document.getElementById('readingListCacheAll');
  const clearAll = document.getElementById('readingListClearAll');
  const exportButton = document.getElementById('readingListExport');
  if (!host || !count || !status || !cacheAll || !clearAll || !exportButton) return;

  const render = () => {
    const items = loadReadingList();
    count.textContent = String(items.length);
    host.replaceChildren();
    cacheAll.disabled = items.length === 0;
    clearAll.disabled = items.length === 0;
    exportButton.disabled = items.length === 0;

    if (!items.length) {
      const empty = document.createElement('article');
      empty.className = 'card reading-list-empty';
      createText(empty, 'h2', 'Your reading list is empty');
      createText(
        empty,
        'p',
        'Open Published Search Facets and save a verified or clearly bounded record.'
      );
      const link = document.createElement('a');
      link.className = 'btn';
      link.href = 'search-facets.html';
      link.textContent = 'Browse published content';
      empty.appendChild(link);
      host.appendChild(empty);
      status.textContent = 'No locally saved pages.';
      return;
    }

    items.forEach(item => {
      const article = document.createElement('article');
      article.className = 'card reading-list-item';

      const labels = document.createElement('div');
      labels.className = 'reading-list-labels';
      createText(labels, 'span', item.kind, 'pill');
      createText(labels, 'span', item.status, 'pill');
      article.appendChild(labels);

      createText(article, 'h2', displayTitle(item));
      if (item.summary) createText(article, 'p', item.summary);
      createText(
        article,
        'p',
        `Saved locally ${new Date(item.savedAt).toLocaleDateString()}`,
        'reading-list-meta'
      );

      const actions = document.createElement('div');
      actions.className = 'reading-list-actions';

      const open = document.createElement('a');
      open.className = 'btn';
      open.href = item.route;
      open.textContent = 'Open page';
      actions.appendChild(open);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn secondary';
      remove.textContent = 'Remove';
      remove.addEventListener('click', async () => {
        removeReadingRoute(item.route);
        await removeCachedRoute(item.route).catch(() => false);
        render();
      });
      actions.appendChild(remove);

      article.appendChild(actions);
      host.appendChild(article);
    });

    status.textContent =
      `${items.length} page${items.length === 1 ? '' : 's'} saved in this browser.`;
  };

  cacheAll.addEventListener('click', async () => {
    const items = loadReadingList();
    if (!items.length) return;
    cacheAll.disabled = true;
    status.textContent = 'Caching saved pages independently…';
    const result = await cacheSavedRoutes(items);
    status.textContent = result.failed.length
      ? `${result.cached.length} cached; ${result.failed.length} could not be cached.`
      : `${result.cached.length} saved page${result.cached.length === 1 ? '' : 's'} available offline.`;
    cacheAll.disabled = false;
  });

  clearAll.addEventListener('click', async () => {
    if (!confirm('Remove every locally saved page and its offline copies?')) return;
    saveReadingList([]);
    await clearOfflineReadingCache().catch(() => false);
    render();
  });

  exportButton.addEventListener('click', () => {
    const items = loadReadingList();
    const blob = new Blob(
      [JSON.stringify({version: 1, exportedAt: new Date().toISOString(), items}, null, 2)],
      {type: 'application/json'}
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'omsaravanabhava-reading-list.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    status.textContent = 'Reading list exported as JSON.';
  });

  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) render();
  });

  render();
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialiseReadingList);
}
