export const RELEASE = 223;
export const CONFIG_PATH = '/data/reading-workspace.json';
export const ROUTES_PATH = '/data/site-routes.json';
export const STORAGE_KEY = 'osb-reading-progress-v1';
export const DEFAULT_MAX_ITEMS = 50;
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

const safeStorage = storage => {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const normaliseReadingRoute = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, `${CANONICAL_ORIGIN}/`);
    if (url.origin !== CANONICAL_ORIGIN) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
};

export const routePath = value => {
  const route = normaliseReadingRoute(value);
  if (!route) return '';
  try {
    return new URL(route, CANONICAL_ORIGIN).pathname;
  } catch {
    return '';
  }
};

export const normaliseStatus = value =>
  String(value ?? '').trim().toLocaleLowerCase();

export const sanitiseProgressRecord = (
  record,
  visitedAt = new Date().toISOString()
) => {
  if (!record || typeof record !== 'object') return null;
  const route = normaliseReadingRoute(record.route);
  if (!route) return null;
  const percent = Math.max(
    0,
    Math.min(100, Number(record.percent) || 0)
  );
  return {
    route,
    titleTa: String(record.titleTa ?? '').trim(),
    titleEn:
      String(record.titleEn ?? record.title ?? route).trim() ||
      route,
    category:
      String(record.category ?? 'Reading').trim() ||
      'Reading',
    status:
      normaliseStatus(record.status) || 'published',
    summary: String(record.summary ?? '').trim(),
    percent: Math.round(percent * 10) / 10,
    lastVisitedAt: String(record.lastVisitedAt ?? visitedAt),
    completedAt:
      record.completedAt
        ? String(record.completedAt)
        : ''
  };
};

export const loadProgress = (
  storage,
  maximumItems = DEFAULT_MAX_ITEMS
) => {
  const target = safeStorage(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(
      target.getItem(STORAGE_KEY) || '[]'
    );
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    const items = [];
    parsed.forEach(record => {
      const item = sanitiseProgressRecord(
        record,
        record?.lastVisitedAt
      );
      if (!item || seen.has(item.route)) return;
      seen.add(item.route);
      items.push(item);
    });
    return items
      .sort((left, right) =>
        String(right.lastVisitedAt)
          .localeCompare(String(left.lastVisitedAt))
      )
      .slice(0, Math.max(1, Number(maximumItems) || DEFAULT_MAX_ITEMS));
  } catch {
    return [];
  }
};

export const saveProgress = (
  items,
  storage,
  maximumItems = DEFAULT_MAX_ITEMS
) => {
  const target = safeStorage(storage);
  if (!target) return false;
  try {
    const clean = [];
    const seen = new Set();
    (Array.isArray(items) ? items : [])
      .forEach(record => {
        const item = sanitiseProgressRecord(
          record,
          record?.lastVisitedAt
        );
        if (!item || seen.has(item.route)) return;
        seen.add(item.route);
        clean.push(item);
      });
    target.setItem(
      STORAGE_KEY,
      JSON.stringify(
        clean.slice(
          0,
          Math.max(1, Number(maximumItems) || DEFAULT_MAX_ITEMS)
        )
      )
    );
    return true;
  } catch {
    return false;
  }
};

export const upsertProgress = (
  items,
  record,
  {
    maximumItems = DEFAULT_MAX_ITEMS,
    completedThreshold = 95,
    visitedAt = new Date().toISOString()
  } = {}
) => {
  const incoming = sanitiseProgressRecord(record, visitedAt);
  if (!incoming) {
    return Array.isArray(items) ? [...items] : [];
  }

  const previous = (Array.isArray(items) ? items : [])
    .map(item =>
      sanitiseProgressRecord(item, item?.lastVisitedAt)
    )
    .filter(Boolean);
  const existing = previous.find(
    item => item.route === incoming.route
  );

  incoming.lastVisitedAt = visitedAt;
  if (
    incoming.percent >= Number(completedThreshold) &&
    !incoming.completedAt
  ) {
    incoming.completedAt =
      existing?.completedAt || visitedAt;
  }
  if (
    incoming.percent < Number(completedThreshold)
  ) {
    incoming.completedAt = '';
  }

  return [
    incoming,
    ...previous.filter(
      item => item.route !== incoming.route
    )
  ].slice(
    0,
    Math.max(1, Number(maximumItems) || DEFAULT_MAX_ITEMS)
  );
};

export const removeProgressRoute = (
  route,
  storage,
  maximumItems = DEFAULT_MAX_ITEMS
) => {
  const target = normaliseReadingRoute(route);
  const items = loadProgress(storage, maximumItems)
    .filter(item => item.route !== target);
  saveProgress(items, storage, maximumItems);
  return items;
};

export const clearProgress = storage => {
  const target = safeStorage(storage);
  if (!target) return false;
  try {
    target.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};

export const calculateProgress = (
  scrollY,
  documentHeight,
  viewportHeight
) => {
  const scrollable = Math.max(
    0,
    Number(documentHeight) - Number(viewportHeight)
  );
  if (scrollable <= 0) return 100;
  const percent =
    (Math.max(0, Number(scrollY) || 0) / scrollable) * 100;
  return Math.max(0, Math.min(100, percent));
};

export const progressToScrollY = (
  percent,
  documentHeight,
  viewportHeight
) => {
  const scrollable = Math.max(
    0,
    Number(documentHeight) - Number(viewportHeight)
  );
  return Math.round(
    scrollable *
    (Math.max(0, Math.min(100, Number(percent) || 0)) / 100)
  );
};

export const routeIsEligible = (
  routeRecord,
  config
) => {
  if (!routeRecord || typeof routeRecord !== 'object') {
    return false;
  }
  const path = routePath(routeRecord.path);
  if (!path) return false;

  const excluded = new Set(
    (Array.isArray(config?.excludedPaths)
      ? config.excludedPaths
      : []
    ).map(routePath)
  );
  if (excluded.has(path)) return false;

  const allowedStatuses = new Set(
    (Array.isArray(config?.allowedStatuses)
      ? config.allowedStatuses
      : []
    ).map(normaliseStatus)
  );
  const status = normaliseStatus(routeRecord.status);
  if (
    allowedStatuses.size > 0 &&
    !allowedStatuses.has(status)
  ) {
    return false;
  }

  const exactPaths = new Set(
    (Array.isArray(config?.eligibleExactPaths)
      ? config.eligibleExactPaths
      : []
    ).map(routePath)
  );
  if (exactPaths.has(path)) return true;

  return (Array.isArray(config?.eligiblePathPrefixes)
    ? config.eligiblePathPrefixes
    : []
  ).some(prefix =>
    path.startsWith(routePath(prefix))
  );
};

export const normaliseEligibleRoutes = (
  routesPayload,
  config
) => {
  const seen = new Set();
  const routes = [];
  (Array.isArray(routesPayload?.routes)
    ? routesPayload.routes
    : []
  ).forEach(record => {
    if (!routeIsEligible(record, config)) return;
    const path = routePath(record.path);
    if (!path || seen.has(path)) return;
    seen.add(path);
    routes.push({
      path,
      route: path,
      titleTa: String(record.titleTa ?? '').trim(),
      titleEn:
        String(record.titleEn ?? path).trim() || path,
      category:
        String(record.category ?? 'Reading').trim() ||
        'Reading',
      status:
        normaliseStatus(record.status) || 'published',
      summary: String(record.summary ?? '').trim()
    });
  });
  return routes.sort((left, right) =>
    left.category.localeCompare(right.category) ||
    left.titleEn.localeCompare(right.titleEn)
  );
};

export const mergeRoutesWithProgress = (
  routes,
  progress
) => {
  const progressMap = new Map(
    (Array.isArray(progress) ? progress : [])
      .map(item => [
        routePath(item.route),
        sanitiseProgressRecord(
          item,
          item?.lastVisitedAt
        )
      ])
      .filter(([, item]) => item)
  );
  return (Array.isArray(routes) ? routes : [])
    .map(route => ({
      ...route,
      progress: progressMap.get(route.path) || null
    }));
};

export const filterWorkspaceRoutes = (
  records,
  {
    query = '',
    status = 'all',
    progressState = 'all',
    completedThreshold = 95
  } = {}
) => {
  const needle = String(query)
    .trim()
    .toLocaleLowerCase();

  return (Array.isArray(records) ? records : [])
    .filter(record => {
      if (
        status !== 'all' &&
        record.status !== status
      ) {
        return false;
      }

      const percent = record.progress?.percent || 0;
      if (
        progressState === 'not-started' &&
        percent > 0
      ) {
        return false;
      }
      if (
        progressState === 'in-progress' &&
        (
          percent <= 0 ||
          percent >= Number(completedThreshold)
        )
      ) {
        return false;
      }
      if (
        progressState === 'completed' &&
        percent < Number(completedThreshold)
      ) {
        return false;
      }

      if (!needle) return true;
      const haystack = [
        record.titleTa,
        record.titleEn,
        record.category,
        record.status,
        record.summary
      ].join(' ').toLocaleLowerCase();
      return haystack.includes(needle);
    })
    .sort((left, right) => {
      const leftDate =
        left.progress?.lastVisitedAt || '';
      const rightDate =
        right.progress?.lastVisitedAt || '';
      if (leftDate || rightDate) {
        return rightDate.localeCompare(leftDate);
      }
      return (
        left.category.localeCompare(right.category) ||
        left.titleEn.localeCompare(right.titleEn)
      );
    });
};

export const buildWorkspaceMetrics = (
  records,
  readingListItems = [],
  completedThreshold = 95
) => {
  const items = Array.isArray(records) ? records : [];
  const started = items.filter(
    item => (item.progress?.percent || 0) > 0
  ).length;
  const completed = items.filter(
    item =>
      (item.progress?.percent || 0) >=
      Number(completedThreshold)
  ).length;
  const eligiblePaths = new Set(
    items.map(item => item.path)
  );
  const saved = (Array.isArray(readingListItems)
    ? readingListItems
    : []
  ).filter(item =>
    eligiblePaths.has(routePath(item.route))
  ).length;

  return {
    eligible: items.length,
    started,
    completed,
    saved
  };
};

const fetchJson = async (
  path,
  fetcher = globalThis.fetch
) => {
  if (typeof fetcher !== 'function') {
    throw new Error('Fetch API unavailable');
  }
  const response = await fetcher(path, {
    cache: 'default',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return response.json();
};

export const loadReadingModel = async (
  fetcher = globalThis.fetch,
  storage = undefined
) => {
  const [config, routesPayload] =
    await Promise.all([
      fetchJson(CONFIG_PATH, fetcher),
      fetchJson(ROUTES_PATH, fetcher)
    ]);
  const routes = normaliseEligibleRoutes(
    routesPayload,
    config
  );
  const progress = loadProgress(
    storage,
    config.maximumProgressItems
  );
  return {
    config,
    routes,
    records: mergeRoutesWithProgress(
      routes,
      progress
    )
  };
};

const createText = (
  parent,
  tag,
  text,
  className
) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(text);
  parent.appendChild(element);
  return element;
};

const displayTitle = record =>
  record.titleTa && record.titleEn
    ? `${record.titleTa} · ${record.titleEn}`
    : record.titleTa || record.titleEn || record.path;

const progressLabel = (
  percent,
  completedThreshold
) => {
  if (percent <= 0) return 'Not started';
  if (percent >= completedThreshold) {
    return 'Completed locally';
  }
  return `${Math.round(percent)}% read`;
};

const loadReadingListModule = () =>
  import('/assets/js/reading-list.mjs');

const createWorkspaceCard = (
  record,
  config,
  rerender
) => {
  const article = document.createElement('article');
  article.className = 'card reading-workspace-card';

  const labels = document.createElement('div');
  labels.className = 'reading-workspace-labels';
  createText(labels, 'span', record.category, 'pill');
  createText(labels, 'span', record.status, 'pill');
  article.appendChild(labels);

  createText(article, 'h2', displayTitle(record));
  if (record.summary) {
    createText(article, 'p', record.summary);
  }

  const percent = record.progress?.percent || 0;
  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = percent;
  progress.setAttribute(
    'aria-label',
    `${displayTitle(record)} reading progress`
  );
  article.appendChild(progress);

  createText(
    article,
    'p',
    progressLabel(
      percent,
      config.completedThreshold
    ),
    'reading-workspace-progress-label'
  );

  if (record.progress?.lastVisitedAt) {
    createText(
      article,
      'p',
      `Last opened ${new Date(
        record.progress.lastVisitedAt
      ).toLocaleString()}`,
      'reading-workspace-meta'
    );
  }

  const actions = document.createElement('div');
  actions.className = 'reading-workspace-actions';

  const open = document.createElement('a');
  open.className = 'btn';
  open.href =
    percent > 0 && percent < config.completedThreshold
      ? `${record.path}?resume=1`
      : record.path;
  open.textContent =
    percent > 0 && percent < config.completedThreshold
      ? 'Resume reading'
      : 'Open reading';
  actions.appendChild(open);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn secondary';
  save.textContent = 'Save to reading list';
  save.addEventListener('click', async () => {
    try {
      const module = await loadReadingListModule();
      module.saveReadingRecord({
        route: record.path,
        titleTa: record.titleTa,
        titleEn: record.titleEn,
        kind: record.category,
        status: record.status,
        summary: record.summary
      });
      save.textContent = 'Saved locally';
      save.disabled = true;
    } catch (error) {
      console.warn(
        '[OmSaravanaBhava] Reading list save failed',
        error
      );
      save.textContent = 'Storage unavailable';
    }
  });
  actions.appendChild(save);

  if (record.progress) {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn secondary';
    reset.textContent = 'Reset progress';
    reset.addEventListener('click', () => {
      removeProgressRoute(
        record.path,
        undefined,
        config.maximumProgressItems
      );
      rerender();
    });
    actions.appendChild(reset);
  }

  article.appendChild(actions);
  return article;
};

const initialiseWorkspacePage = async model => {
  const host =
    document.getElementById('readingWorkspaceItems');
  const status =
    document.getElementById('readingWorkspaceStatus');
  const search =
    document.getElementById('readingWorkspaceSearch');
  const state =
    document.getElementById('readingWorkspaceState');
  const publication =
    document.getElementById('readingWorkspacePublication');
  const resetFilters =
    document.getElementById('readingWorkspaceResetFilters');
  const clearAll =
    document.getElementById('readingWorkspaceClearProgress');

  if (
    !host ||
    !status ||
    !search ||
    !state ||
    !publication ||
    !resetFilters ||
    !clearAll
  ) {
    return;
  }

  let readingListItems = [];
  try {
    const module = await loadReadingListModule();
    readingListItems = module.loadReadingList();
  } catch {
    readingListItems = [];
  }

  const statuses = [
    ...new Set(model.routes.map(route => route.status))
  ].sort();
  statuses.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    publication.appendChild(option);
  });

  const render = () => {
    const records = mergeRoutesWithProgress(
      model.routes,
      loadProgress(
        undefined,
        model.config.maximumProgressItems
      )
    );
    const metrics = buildWorkspaceMetrics(
      records,
      readingListItems,
      model.config.completedThreshold
    );

    const metricMap = {
      readingWorkspaceEligible: metrics.eligible,
      readingWorkspaceStarted: metrics.started,
      readingWorkspaceCompleted: metrics.completed,
      readingWorkspaceSaved: metrics.saved
    };
    Object.entries(metricMap).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    });

    const filtered = filterWorkspaceRoutes(
      records,
      {
        query: search.value,
        status: publication.value,
        progressState: state.value,
        completedThreshold:
          model.config.completedThreshold
      }
    );

    host.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('article');
      empty.className = 'card reading-workspace-empty';
      createText(empty, 'h2', 'No reading routes match');
      createText(
        empty,
        'p',
        'Change the search, progress state or publication filter.'
      );
      host.appendChild(empty);
    } else {
      filtered.forEach(record =>
        host.appendChild(
          createWorkspaceCard(
            record,
            model.config,
            render
          )
        )
      );
    }

    status.textContent =
      `${filtered.length} eligible reading route${filtered.length === 1 ? '' : 's'} match. Progress remains in this browser.`;
    clearAll.disabled = metrics.started === 0;
  };

  [search, state, publication].forEach(control => {
    control.addEventListener(
      control === search ? 'input' : 'change',
      render
    );
  });

  resetFilters.addEventListener('click', () => {
    search.value = '';
    state.value = 'all';
    publication.value = 'all';
    render();
    search.focus();
  });

  clearAll.addEventListener('click', () => {
    if (
      !confirm(
        'Clear browser-local reading progress? Your reading list, accessibility preferences and audio history will be preserved.'
      )
    ) {
      return;
    }
    clearProgress();
    render();
  });

  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) render();
  });

  render();
};

const initialiseEligibleReadingPage = (
  model,
  routeRecord
) => {
  const main = document.querySelector('main');
  if (!main) return;

  const path = routePath(globalThis.location?.pathname);
  if (!path || path === '/reading-workspace.html') return;

  const existing =
    document.getElementById('osb-reader-toolbar');
  if (existing) return;

  const previous = loadProgress(
    undefined,
    model.config.maximumProgressItems
  ).find(item => routePath(item.route) === path);

  const toolbar = document.createElement('aside');
  toolbar.id = 'osb-reader-toolbar';
  toolbar.className = 'osb-reader-toolbar';
  toolbar.setAttribute(
    'aria-label',
    'Browser-local reading tools'
  );
  toolbar.setAttribute('data-print-exclude', 'true');

  const progressWrap = document.createElement('div');
  progressWrap.className = 'osb-reader-progress-wrap';
  createText(
    progressWrap,
    'strong',
    'Reading progress'
  );

  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = previous?.percent || 0;
  progress.id = 'osb-reader-progress';
  progressWrap.appendChild(progress);

  const progressText = createText(
    progressWrap,
    'span',
    progressLabel(
      previous?.percent || 0,
      model.config.completedThreshold
    )
  );
  toolbar.appendChild(progressWrap);

  const actions = document.createElement('div');
  actions.className = 'osb-reader-actions';

  const focus = document.createElement('button');
  focus.type = 'button';
  focus.className = 'btn secondary';
  focus.textContent = 'Focus reading';
  focus.setAttribute('aria-pressed', 'false');
  focus.addEventListener('click', () => {
    const active =
      document.body.classList.toggle(
        'osb-reader-focus'
      );
    focus.setAttribute(
      'aria-pressed',
      active ? 'true' : 'false'
    );
    focus.textContent =
      active ? 'Exit focus' : 'Focus reading';
  });
  actions.appendChild(focus);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn secondary';
  save.textContent = 'Save to reading list';
  save.addEventListener('click', async () => {
    try {
      const module = await loadReadingListModule();
      module.saveReadingRecord({
        route: path,
        titleTa: routeRecord.titleTa,
        titleEn: routeRecord.titleEn,
        kind: routeRecord.category,
        status: routeRecord.status,
        summary: routeRecord.summary
      });
      save.textContent = 'Saved locally';
      save.disabled = true;
    } catch {
      save.textContent = 'Storage unavailable';
    }
  });
  actions.appendChild(save);

  if (
    previous?.percent > 1 &&
    previous.percent < model.config.completedThreshold
  ) {
    const resume = document.createElement('button');
    resume.type = 'button';
    resume.className = 'btn';
    resume.textContent =
      `Resume at ${Math.round(previous.percent)}%`;
    resume.addEventListener('click', () => {
      const target = progressToScrollY(
        previous.percent,
        document.documentElement.scrollHeight,
        window.innerHeight
      );
      window.scrollTo({
        top: target,
        behavior:
          matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth'
      });
    });
    actions.appendChild(resume);
  }

  const workspace = document.createElement('a');
  workspace.className = 'btn secondary';
  workspace.href = '/reading-workspace.html';
  workspace.textContent = 'Reading workspace';
  actions.appendChild(workspace);

  toolbar.appendChild(actions);

  const breadcrumb =
    main.querySelector('nav[aria-label="Breadcrumb"]');
  if (breadcrumb?.after) {
    breadcrumb.after(toolbar);
  } else {
    main.prepend(toolbar);
  }

  let pending = false;
  let lastSavedAt = 0;

  const saveCurrentProgress = () => {
    pending = false;
    const now = Date.now();
    if (now - lastSavedAt < 600) return;
    lastSavedAt = now;

    const percent = calculateProgress(
      window.scrollY,
      document.documentElement.scrollHeight,
      window.innerHeight
    );
    progress.value = percent;
    progressText.textContent = progressLabel(
      percent,
      model.config.completedThreshold
    );

    if (
      percent < Number(model.config.minimumStoredProgress)
    ) {
      return;
    }

    const items = upsertProgress(
      loadProgress(
        undefined,
        model.config.maximumProgressItems
      ),
      {
        route: path,
        titleTa: routeRecord.titleTa,
        titleEn: routeRecord.titleEn,
        category: routeRecord.category,
        status: routeRecord.status,
        summary: routeRecord.summary,
        percent
      },
      {
        maximumItems:
          model.config.maximumProgressItems,
        completedThreshold:
          model.config.completedThreshold
      }
    );
    saveProgress(
      items,
      undefined,
      model.config.maximumProgressItems
    );
  };

  window.addEventListener(
    'scroll',
    () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(saveCurrentProgress);
    },
    {passive: true}
  );
  window.addEventListener(
    'pagehide',
    saveCurrentProgress
  );

  const params = new URLSearchParams(
    globalThis.location?.search || ''
  );
  if (
    params.get('resume') === '1' &&
    previous?.percent > 1
  ) {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: progressToScrollY(
          previous.percent,
          document.documentElement.scrollHeight,
          window.innerHeight
        ),
        behavior: 'auto'
      });
    });
  }
};

export const initialiseReaderExperience = async () => {
  if (typeof document === 'undefined') return false;
  if (globalThis.__osbReaderExperienceInitialised) {
    return true;
  }
  globalThis.__osbReaderExperienceInitialised = true;

  try {
    const model = await loadReadingModel();
    if (
      document.getElementById('readingWorkspaceItems')
    ) {
      await initialiseWorkspacePage(model);
    }

    const currentPath = routePath(
      globalThis.location?.pathname
    );
    const routeRecord = model.routes.find(
      record => record.path === currentPath
    );
    if (routeRecord) {
      initialiseEligibleReadingPage(
        model,
        routeRecord
      );
    }
    return true;
  } catch (error) {
    console.warn(
      '[OmSaravanaBhava] Reader experience unavailable',
      error
    );
    const status =
      document.getElementById('readingWorkspaceStatus');
    if (status) {
      status.textContent =
        'The local reading registries could not be loaded.';
    }
    return false;
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => initialiseReaderExperience(),
      {once: true}
    );
  } else {
    initialiseReaderExperience();
  }
}
