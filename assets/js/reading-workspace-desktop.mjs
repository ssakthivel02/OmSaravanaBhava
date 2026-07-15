export const RELEASE = 230;
export const DESKTOP_BREAKPOINT = 1180;
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';
export const PUBLICATION_BOUNDARIES_PATH = '/data/publication-boundaries.json';


export const buildPublicationBoundaryMap = payload => new Map(
  (Array.isArray(payload?.records) ? payload.records : [])
    .map(record => [String(record?.route || '').trim(), record])
    .filter(([route]) => route.startsWith('/'))
);

export const applyPublicationBoundaries = (routes, payload) => {
  const boundaries = buildPublicationBoundaryMap(payload);
  return (Array.isArray(routes) ? routes : [])
    .filter(route => {
      const boundary = boundaries.get(String(route?.path || ''));
      return boundary?.readingEligible !== false;
    })
    .map(route => {
      const boundary = boundaries.get(String(route?.path || ''));
      return boundary
        ? {
            ...route,
            status: String(boundary.verifiedStatus || route.status),
            publicationBoundary: boundary
          }
        : route;
    });
};

export const clampSelectionIndex = (index, length) => {
  const size = Math.max(0, Number(length) || 0);
  if (size === 0) return -1;
  return Math.max(0, Math.min(size - 1, Number(index) || 0));
};

export const nextKeyboardIndex = (key, currentIndex, length) => {
  const size = Math.max(0, Number(length) || 0);
  if (size === 0) return -1;
  const current = clampSelectionIndex(currentIndex, size);
  if (key === 'ArrowDown') return Math.min(size - 1, current + 1);
  if (key === 'ArrowUp') return Math.max(0, current - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return size - 1;
  return current;
};

export const progressStateLabel = (percent, completedThreshold = 95) => {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  if (value <= 0) return 'Not started';
  if (value >= Number(completedThreshold)) return 'Completed locally';
  return `${Math.round(value)}% read`;
};

export const buildReadingHref = (record, completedThreshold = 95) => {
  const path = String(record?.path || '').trim();
  if (!path.startsWith('/')) return '';
  const percent = Number(record?.progress?.percent) || 0;
  return percent > 0 && percent < Number(completedThreshold)
    ? `${path}?resume=1`
    : path;
};

export const selectVisibleRecord = (records, selectedPath) => {
  const items = Array.isArray(records) ? records : [];
  if (!items.length) return null;
  const selected = items.find(item => item?.path === selectedPath);
  return selected || items[0];
};

export const isEditableTarget = target => {
  const tag = String(target?.tagName || '').toLocaleLowerCase();
  return Boolean(
    target?.isContentEditable ||
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select'
  );
};

const createText = (parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(text ?? '');
  parent.appendChild(element);
  return element;
};

const routeTitle = record =>
  record?.titleTa || record?.titleEn || record?.path || 'Reading route';

const absoluteRouteUrl = path => {
  try {
    const url = new URL(String(path || ''), `${CANONICAL_ORIGIN}/`);
    return url.origin === CANONICAL_ORIGIN ? url.href : '';
  } catch {
    return '';
  }
};

const formatDate = value => {
  if (!value) return 'Not opened in this browser';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString();
};

const appendPill = (parent, text) =>
  createText(parent, 'span', text, 'pill');

const buildFact = (list, term, detail) => {
  const row = document.createElement('div');
  row.className = 'reading-workspace-inspector-fact';
  createText(row, 'dt', term);
  createText(row, 'dd', detail);
  list.appendChild(row);
};

const renderRouteOption = ({
  record,
  selected,
  index,
  completedThreshold,
  onSelect
}) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'reading-workspace-route-option';
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', selected ? 'true' : 'false');
  button.tabIndex = selected ? 0 : -1;
  button.dataset.routePath = record.path;
  button.dataset.routeIndex = String(index);

  const meta = document.createElement('span');
  meta.className = 'reading-workspace-route-option-meta';
  appendPill(meta, record.category);
  appendPill(meta, record.status);
  button.appendChild(meta);

  createText(
    button,
    'span',
    record.titleTa && record.titleEn
      ? `${record.titleTa} · ${record.titleEn}`
      : routeTitle(record),
    'reading-workspace-route-option-title'
  );

  if (record.summary) {
    createText(
      button,
      'span',
      record.summary,
      'reading-workspace-route-option-summary'
    );
  }

  const percent = Number(record.progress?.percent) || 0;
  const progressWrap = document.createElement('span');
  progressWrap.className = 'reading-workspace-route-option-progress';
  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = percent;
  progress.setAttribute(
    'aria-label',
    `${routeTitle(record)} reading progress`
  );
  progressWrap.appendChild(progress);
  createText(
    progressWrap,
    'span',
    percent > 0 ? `${Math.round(percent)}%` : 'New'
  );
  button.appendChild(progressWrap);

  button.addEventListener('click', () => onSelect(record.path, true));
  return button;
};

const renderInspector = ({
  host,
  record,
  config,
  savedPaths,
  readingListModule,
  readerModule,
  onRefresh
}) => {
  host.replaceChildren();
  if (!record) {
    const empty = document.createElement('div');
    empty.className = 'reading-workspace-inspector-empty';
    appendPill(empty, 'Route details');
    createText(empty, 'h2', 'No route matches the current filters');
    createText(
      empty,
      'p',
      'Change the search, progress or publication filter to restore a route.'
    );
    host.appendChild(empty);
    return;
  }

  const labels = document.createElement('div');
  labels.className = 'reading-workspace-inspector-labels';
  appendPill(labels, record.category);
  appendPill(labels, record.status);
  if (savedPaths.has(record.path)) appendPill(labels, 'Saved locally');
  host.appendChild(labels);

  const heading = createText(
    host,
    'h2',
    record.titleTa || record.titleEn || record.path
  );
  heading.id = 'readingWorkspaceInspectorHeading';
  if (record.titleTa && record.titleEn) {
    createText(
      host,
      'p',
      record.titleEn,
      'reading-workspace-inspector-title-en'
    );
  }

  if (record.summary) {
    createText(
      host,
      'p',
      record.summary,
      'reading-workspace-inspector-summary'
    );
  }

  const percent = Number(record.progress?.percent) || 0;
  const progressPanel = document.createElement('div');
  progressPanel.className = 'reading-workspace-inspector-progress';
  createText(
    progressPanel,
    'strong',
    progressStateLabel(percent, config.completedThreshold)
  );
  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = percent;
  progress.setAttribute(
    'aria-label',
    `${routeTitle(record)} reading progress`
  );
  progressPanel.appendChild(progress);
  createText(
    progressPanel,
    'span',
    'Progress is approximate browser-local scroll position.'
  );
  host.appendChild(progressPanel);

  const facts = document.createElement('dl');
  facts.className = 'reading-workspace-inspector-facts';
  buildFact(facts, 'Route', record.path);
  buildFact(facts, 'Publication state', record.status);
  buildFact(facts, 'Content group', record.category);
  buildFact(
    facts,
    'Last opened',
    formatDate(record.progress?.lastVisitedAt)
  );
  host.appendChild(facts);

  const actions = document.createElement('div');
  actions.className = 'reading-workspace-inspector-actions';

  const open = document.createElement('a');
  open.className = 'btn';
  open.href = buildReadingHref(record, config.completedThreshold);
  open.textContent =
    percent > 0 && percent < Number(config.completedThreshold)
      ? 'Resume reading'
      : 'Open reading';
  actions.appendChild(open);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn secondary';
  save.textContent = savedPaths.has(record.path)
    ? 'Already in reading list'
    : 'Save to reading list';
  save.disabled = savedPaths.has(record.path);
  save.addEventListener('click', () => {
    try {
      readingListModule.saveReadingRecord({
        route: record.path,
        titleTa: record.titleTa,
        titleEn: record.titleEn,
        kind: record.category,
        status: record.status,
        summary: record.summary
      });
      savedPaths.add(record.path);
      onRefresh(record.path);
    } catch (error) {
      console.warn(
        '[OmSaravanaBhava] Reading-list save unavailable',
        error
      );
      save.textContent = 'Storage unavailable';
      save.disabled = true;
    }
  });
  actions.appendChild(save);

  if (record.progress) {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn secondary';
    reset.textContent = 'Reset this progress';
    reset.addEventListener('click', () => {
      readerModule.removeProgressRoute(
        record.path,
        undefined,
        config.maximumProgressItems
      );
      onRefresh(record.path);
    });
    actions.appendChild(reset);
  }

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn secondary';
  copy.textContent = 'Copy route link';
  copy.addEventListener('click', async () => {
    const url = absoluteRouteUrl(record.path);
    if (!url || !globalThis.navigator?.clipboard?.writeText) {
      copy.textContent = 'Copy unavailable';
      return;
    }
    try {
      await globalThis.navigator.clipboard.writeText(url);
      copy.textContent = 'Link copied';
    } catch {
      copy.textContent = 'Copy unavailable';
    }
  });
  actions.appendChild(copy);

  host.appendChild(actions);

  const boundary = document.createElement('p');
  boundary.className = 'reading-workspace-inspector-boundary';
  boundary.textContent =
    'This panel displays route metadata and local progress only. Open the destination for its complete source, review and completeness statements.';
  host.appendChild(boundary);
};

export const initialiseDesktopWorkspace = async ({
  documentRef = globalThis.document,
  windowRef = globalThis.window
} = {}) => {
  if (!documentRef) return false;
  const host = documentRef.getElementById('readingWorkspaceDesktop');
  const listHost = documentRef.getElementById('readingWorkspaceRouteList');
  const inspector = documentRef.getElementById('readingWorkspaceInspector');
  const status = documentRef.getElementById('readingWorkspaceStatus');
  const search = documentRef.getElementById('readingWorkspaceSearch');
  const state = documentRef.getElementById('readingWorkspaceState');
  const publication =
    documentRef.getElementById('readingWorkspacePublication');
  const resetFilters =
    documentRef.getElementById('readingWorkspaceResetFilters');
  const clearAll =
    documentRef.getElementById('readingWorkspaceClearProgress');
  const visibleCount =
    documentRef.getElementById('readingWorkspaceVisibleCount');

  if (
    !host ||
    !listHost ||
    !inspector ||
    !status ||
    !search ||
    !state ||
    !publication ||
    !resetFilters ||
    !clearAll ||
    !visibleCount
  ) {
    return false;
  }

  let readerModule;
  let readingListModule;
  try {
    [readerModule, readingListModule] = await Promise.all([
      import('/assets/js/reader-experience.js'),
      import('/assets/js/reading-list.mjs')
    ]);
  } catch (error) {
    console.warn(
      '[OmSaravanaBhava] Desktop reading dependencies unavailable',
      error
    );
    status.textContent =
      'The local reading registries could not be loaded.';
    return false;
  }

  let model;
  try {
    model = await readerModule.loadReadingModel();
    try {
      const response = await globalThis.fetch(PUBLICATION_BOUNDARIES_PATH, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {'Accept': 'application/json'}
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const boundaries = await response.json();
      model.routes = applyPublicationBoundaries(
        model.routes,
        boundaries
      );
    } catch (boundaryError) {
      console.warn(
        '[OmSaravanaBhava] Publication boundary overlay unavailable',
        boundaryError
      );
    }
  } catch (error) {
    console.warn(
      '[OmSaravanaBhava] Desktop reading model unavailable',
      error
    );
    status.textContent =
      'The local reading registries could not be loaded.';
    return false;
  }

  const existingStatuses = new Set(
    [...publication.options].map(option => option.value)
  );
  [...new Set(model.routes.map(route => route.status))]
    .sort()
    .forEach(value => {
      if (existingStatuses.has(value)) return;
      const option = documentRef.createElement('option');
      option.value = value;
      option.textContent = value;
      publication.appendChild(option);
    });

  let selectedPath = '';
  let visibleRecords = [];
  let savedPaths = new Set();

  const loadSavedPaths = () => {
    try {
      savedPaths = new Set(
        readingListModule.loadReadingList()
          .map(item => readerModule.routePath(item.route))
          .filter(Boolean)
      );
    } catch {
      savedPaths = new Set();
    }
  };

  const updateMetrics = records => {
    let readingListItems = [];
    try {
      readingListItems = readingListModule.loadReadingList();
    } catch {
      readingListItems = [];
    }
    const metrics = readerModule.buildWorkspaceMetrics(
      records,
      readingListItems,
      model.config.completedThreshold
    );
    const map = {
      readingWorkspaceEligible: metrics.eligible,
      readingWorkspaceStarted: metrics.started,
      readingWorkspaceCompleted: metrics.completed,
      readingWorkspaceSaved: metrics.saved
    };
    Object.entries(map).forEach(([id, value]) => {
      const element = documentRef.getElementById(id);
      if (element) element.textContent = String(value);
    });
  };

  const focusSelectedOption = () => {
    const selected = listHost.querySelector(
      '.reading-workspace-route-option[aria-selected="true"]'
    );
    selected?.focus({preventScroll: true});
    selected?.scrollIntoView({
      block: 'nearest',
      behavior: globalThis.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      )?.matches
        ? 'auto'
        : 'smooth'
    });
  };

  const selectPath = (path, focusOption = false) => {
    selectedPath = path;
    const selected = selectVisibleRecord(visibleRecords, selectedPath);
    selectedPath = selected?.path || '';
    [...listHost.querySelectorAll('.reading-workspace-route-option')]
      .forEach(option => {
        const active = option.dataset.routePath === selectedPath;
        option.setAttribute('aria-selected', active ? 'true' : 'false');
        option.tabIndex = active ? 0 : -1;
      });
    renderInspector({
      host: inspector,
      record: selected,
      config: model.config,
      savedPaths,
      readingListModule,
      readerModule,
      onRefresh: preferredPath => {
        selectedPath = preferredPath || selectedPath;
        render();
      }
    });
    if (focusOption) focusSelectedOption();
  };

  const render = () => {
    const records = readerModule.mergeRoutesWithProgress(
      model.routes,
      readerModule.loadProgress(
        undefined,
        model.config.maximumProgressItems
      )
    );
    loadSavedPaths();
    updateMetrics(records);

    visibleRecords = readerModule.filterWorkspaceRoutes(records, {
      query: search.value,
      status: publication.value,
      progressState: state.value,
      completedThreshold: model.config.completedThreshold
    });

    const selected = selectVisibleRecord(visibleRecords, selectedPath);
    selectedPath = selected?.path || '';
    listHost.replaceChildren();

    if (!visibleRecords.length) {
      const empty = documentRef.createElement('div');
      empty.className = 'reading-workspace-inspector-empty';
      createText(empty, 'h3', 'No reading routes match');
      createText(
        empty,
        'p',
        'Change the search, progress state or publication filter.'
      );
      listHost.appendChild(empty);
    } else {
      visibleRecords.forEach((record, index) => {
        listHost.appendChild(renderRouteOption({
          record,
          selected: record.path === selectedPath,
          index,
          completedThreshold: model.config.completedThreshold,
          onSelect: selectPath
        }));
      });
    }

    visibleCount.textContent = String(visibleRecords.length);
    status.textContent =
      `${visibleRecords.length} eligible reading route${visibleRecords.length === 1 ? '' : 's'} match. Selection is temporary; progress remains in this browser.`;
    clearAll.disabled = records.every(
      item => (Number(item.progress?.percent) || 0) <= 0
    );
    renderInspector({
      host: inspector,
      record: selected,
      config: model.config,
      savedPaths,
      readingListModule,
      readerModule,
      onRefresh: preferredPath => {
        selectedPath = preferredPath || selectedPath;
        render();
      }
    });
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
      !globalThis.confirm(
        'Clear browser-local reading progress? Reading-list entries, notes, accessibility preferences and audio history will be preserved.'
      )
    ) {
      return;
    }
    readerModule.clearProgress();
    render();
  });

  listHost.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }
    const current = Number(
      event.target?.closest?.(
        '.reading-workspace-route-option'
      )?.dataset?.routeIndex
    );
    const index = nextKeyboardIndex(
      event.key,
      Number.isFinite(current) ? current : 0,
      visibleRecords.length
    );
    if (index < 0) return;
    event.preventDefault();
    selectPath(visibleRecords[index].path, true);
  });

  documentRef.addEventListener('keydown', event => {
    if (
      event.key === '/' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !isEditableTarget(event.target)
    ) {
      event.preventDefault();
      search.focus();
      search.select();
    }
    if (
      event.key === 'Escape' &&
      documentRef.activeElement === search &&
      search.value
    ) {
      search.value = '';
      render();
    }
  });

  windowRef?.addEventListener?.('storage', event => {
    if (
      [
        readerModule.STORAGE_KEY,
        readingListModule.STORAGE_KEY
      ].includes(event.key)
    ) {
      render();
    }
  });

  render();
  documentRef.documentElement.dataset.readingWorkspaceRelease =
    String(RELEASE);
  return true;
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => initialiseDesktopWorkspace(),
      {once: true}
    );
  } else {
    initialiseDesktopWorkspace();
  }
}
