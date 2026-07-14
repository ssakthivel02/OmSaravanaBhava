export const RELEASE = 226;
export const CONFIG_PATH = '/data/personal-library.json';
export const ROUTES_PATH = '/data/site-routes.json';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

export const DEFAULT_STORAGE_KEYS = Object.freeze({
  readingList: 'osb-reading-list-v1',
  readingProgress: 'osb-reading-progress-v1',
  readingNotes: 'osb-reading-notes-v1',
  accessibility: 'osb-accessibility-preferences-v1',
  audioHistory: 'osb-audio-listening-history-v1'
});

const safeStorage = storage => {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const cleanText = (value, maximum = 400) =>
  String(value ?? '').trim().slice(0, maximum);

export const normaliseLibraryRoute = value => {
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
  const route = normaliseLibraryRoute(value);
  if (!route) return '';
  try {
    return new URL(route, CANONICAL_ORIGIN).pathname;
  } catch {
    return '';
  }
};

export const normaliseIsoDate = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const readLocalJson = (storage, key, fallback) => {
  const target = safeStorage(storage);
  if (!target) return fallback;
  try {
    const raw = target.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const readLocalDatasets = (
  storage = undefined,
  keys = DEFAULT_STORAGE_KEYS
) => ({
  readingList: readLocalJson(storage, keys.readingList, []),
  readingProgress: readLocalJson(storage, keys.readingProgress, []),
  readingNotes: readLocalJson(storage, keys.readingNotes, []),
  accessibility: readLocalJson(storage, keys.accessibility, {}),
  audioHistory: readLocalJson(storage, keys.audioHistory, [])
});

export const normaliseRouteRegistry = (
  routesPayload,
  config
) => {
  const allowed = new Set(
    (Array.isArray(config?.allowedRouteStatuses)
      ? config.allowedRouteStatuses
      : []
    ).map(value => String(value).trim().toLocaleLowerCase())
  );
  const excluded = new Set(
    (Array.isArray(config?.excludedRouteStatuses)
      ? config.excludedRouteStatuses
      : []
    ).map(value => String(value).trim().toLocaleLowerCase())
  );
  const map = new Map();

  (Array.isArray(routesPayload?.routes) ? routesPayload.routes : [])
    .forEach(record => {
      const path = routePath(record?.path);
      const status = String(record?.status ?? '')
        .trim()
        .toLocaleLowerCase();
      if (!path || map.has(path) || excluded.has(status)) return;
      if (allowed.size > 0 && !allowed.has(status)) return;
      map.set(path, {
        path,
        titleTa: cleanText(record.titleTa, 180),
        titleEn: cleanText(record.titleEn || path, 180) || path,
        category: cleanText(record.category || 'Published route', 100),
        status: status || 'published',
        summary: cleanText(record.summary, 500)
      });
    });

  return map;
};

const routeRecordFor = (record, routeMap) =>
  routeMap.get(routePath(record?.route || record?.path));

const displayTitle = record =>
  record?.titleTa && record?.titleEn
    ? `${record.titleTa} · ${record.titleEn}`
    : record?.titleTa || record?.titleEn || record?.path || record?.route || '';

export const normaliseAccessibility = value => {
  const source = value && typeof value === 'object' ? value : {};
  return {
    largeText: source.largeText === true,
    highContrast: source.highContrast === true,
    reducedMotion: source.reducedMotion === true,
    underlinedLinks: source.underlinedLinks === true
  };
};

export const accessibilityLabels = preferences => {
  const clean = normaliseAccessibility(preferences);
  const labels = [];
  if (clean.largeText) labels.push('Large text');
  if (clean.highContrast) labels.push('High contrast');
  if (clean.reducedMotion) labels.push('Reduced motion');
  if (clean.underlinedLinks) labels.push('Underlined links');
  return labels;
};

const normaliseReadingList = (value, routeMap) => {
  const seen = new Set();
  const records = [];
  let ignored = 0;

  (Array.isArray(value) ? value : []).forEach(item => {
    const routeRecord = routeRecordFor(item, routeMap);
    const path = routePath(item?.route);
    if (!path || !routeRecord || seen.has(path)) {
      ignored += 1;
      return;
    }
    seen.add(path);
    records.push({
      ...routeRecord,
      route: normaliseLibraryRoute(item.route),
      savedAt: normaliseIsoDate(item.savedAt),
      kind: cleanText(item.kind || routeRecord.category, 100)
    });
  });

  return {records, ignored};
};

const normaliseProgress = (value, routeMap) => {
  const seen = new Set();
  const records = [];
  let ignored = 0;

  (Array.isArray(value) ? value : []).forEach(item => {
    const routeRecord = routeRecordFor(item, routeMap);
    const path = routePath(item?.route);
    if (!path || !routeRecord || seen.has(path)) {
      ignored += 1;
      return;
    }
    seen.add(path);
    const percent = Math.max(0, Math.min(100, Number(item.percent) || 0));
    records.push({
      ...routeRecord,
      route: normaliseLibraryRoute(item.route),
      percent: Math.round(percent * 10) / 10,
      lastVisitedAt: normaliseIsoDate(item.lastVisitedAt),
      completedAt: normaliseIsoDate(item.completedAt)
    });
  });

  return {records, ignored};
};

const normaliseNotes = (value, routeMap) => {
  const seen = new Set();
  const records = [];
  let ignored = 0;

  (Array.isArray(value) ? value : []).forEach(item => {
    const id = cleanText(item?.id, 180);
    const routeRecord = routeRecordFor(item, routeMap);
    if (!id || !routeRecord || seen.has(id)) {
      ignored += 1;
      return;
    }
    const headingId = cleanText(item.headingId, 120).replace(/^#/, '');
    const note = cleanText(item.note, 500);
    if (!headingId && !note) {
      ignored += 1;
      return;
    }
    seen.add(id);
    records.push({
      ...routeRecord,
      id,
      route: normaliseLibraryRoute(item.route),
      headingId,
      headingLabel: cleanText(item.headingLabel, 160),
      kind: ['reflection', 'question', 'practice', 'reference']
        .includes(String(item.kind ?? '').toLocaleLowerCase())
        ? String(item.kind).toLocaleLowerCase()
        : 'reflection',
      note,
      updatedAt:
        normaliseIsoDate(item.updatedAt) ||
        normaliseIsoDate(item.createdAt)
    });
  });

  return {records, ignored};
};

const normaliseAudio = (value, routeMap) => {
  const seen = new Set();
  const records = [];
  let ignored = 0;

  (Array.isArray(value) ? value : []).forEach(item => {
    const id = cleanText(item?.id, 180);
    const routeRecord = routeRecordFor(item, routeMap);
    if (!id || !routeRecord || seen.has(id)) {
      ignored += 1;
      return;
    }
    seen.add(id);
    const playCount = Number(item.playCount);
    records.push({
      ...routeRecord,
      id,
      route: normaliseLibraryRoute(item.route),
      titleTa: cleanText(item.titleTa || routeRecord.titleTa, 180),
      titleEn:
        cleanText(item.titleEn || routeRecord.titleEn || id, 180) || id,
      artist: cleanText(item.artist || 'Text attribution not stated', 180),
      kind: cleanText(item.kind || 'Read-aloud', 100),
      playbackMode: cleanText(item.playbackMode || 'device-tts', 100),
      lastPlayedAt: normaliseIsoDate(item.lastPlayedAt),
      playCount:
        Number.isInteger(playCount) && playCount > 0
          ? playCount
          : 1
    });
  });

  return {records, ignored};
};

const eventTimestamp = event =>
  normaliseIsoDate(event?.timestamp);

export const buildActivityEvents = (
  {
    readingList = [],
    progress = [],
    notes = [],
    audio = []
  },
  maximumEvents = 30
) => {
  const events = [];

  readingList.forEach(item => {
    if (!item.savedAt) return;
    events.push({
      id: `saved:${item.path}:${item.savedAt}`,
      type: 'saved',
      timestamp: item.savedAt,
      route: item.path,
      titleTa: item.titleTa,
      titleEn: item.titleEn,
      category: item.category,
      status: item.status,
      summary: 'Saved to the browser-local reading list.'
    });
  });

  progress.forEach(item => {
    if (!item.lastVisitedAt || item.percent <= 0) return;
    events.push({
      id: `reading:${item.path}:${item.lastVisitedAt}`,
      type: 'reading',
      timestamp: item.lastVisitedAt,
      route: item.path,
      titleTa: item.titleTa,
      titleEn: item.titleEn,
      category: item.category,
      status: item.status,
      summary:
        item.percent >= 95
          ? 'Reached the local completion threshold.'
          : `${Math.round(item.percent)}% reading position stored locally.`
    });
  });

  notes.forEach(item => {
    if (!item.updatedAt) return;
    events.push({
      id: `note:${item.id}:${item.updatedAt}`,
      type: 'note',
      timestamp: item.updatedAt,
      route:
        item.headingId
          ? `${item.path}#${encodeURIComponent(item.headingId)}`
          : item.path,
      titleTa: item.titleTa,
      titleEn: item.titleEn,
      category: item.category,
      status: item.status,
      summary:
        item.note
          ? `${item.kind}: ${item.note}`
          : `Section bookmark: ${item.headingLabel || item.headingId}`
    });
  });

  audio.forEach(item => {
    if (!item.lastPlayedAt) return;
    events.push({
      id: `audio:${item.id}:${item.lastPlayedAt}`,
      type: 'audio',
      timestamp: item.lastPlayedAt,
      route: item.path,
      titleTa: item.titleTa,
      titleEn: item.titleEn,
      category: item.category,
      status: item.status,
      summary:
        `${item.kind} · ${item.playCount} local start${item.playCount === 1 ? '' : 's'}`
    });
  });

  return events
    .filter(event => eventTimestamp(event))
    .sort((left, right) =>
      String(right.timestamp).localeCompare(String(left.timestamp)) ||
      left.type.localeCompare(right.type) ||
      left.id.localeCompare(right.id)
    )
    .slice(0, Math.max(1, Number(maximumEvents) || 30));
};

export const filterActivityEvents = (
  events,
  {
    type = 'all',
    query = ''
  } = {}
) => {
  const needle = String(query).trim().toLocaleLowerCase();
  return (Array.isArray(events) ? events : [])
    .filter(event => {
      if (type !== 'all' && event.type !== type) return false;
      if (!needle) return true;
      const haystack = [
        event.titleTa,
        event.titleEn,
        event.category,
        event.status,
        event.summary,
        event.type
      ].join(' ').toLocaleLowerCase();
      return haystack.includes(needle);
    });
};

export const buildPersonalLibraryModel = (
  config,
  routesPayload,
  datasets
) => {
  const routeMap = normaliseRouteRegistry(routesPayload, config);
  const readingListResult = normaliseReadingList(
    datasets?.readingList,
    routeMap
  );
  const progressResult = normaliseProgress(
    datasets?.readingProgress,
    routeMap
  );
  const notesResult = normaliseNotes(
    datasets?.readingNotes,
    routeMap
  );
  const audioResult = normaliseAudio(
    datasets?.audioHistory,
    routeMap
  );
  const preferences = normaliseAccessibility(
    datasets?.accessibility
  );

  const completedThreshold =
    Number(config?.completedThreshold) || 95;
  const minimumStarted =
    Number(config?.minimumStartedProgress) || 1;
  const limits = config?.limits || {};

  const continueReading = progressResult.records
    .filter(item =>
      item.percent >= minimumStarted &&
      item.percent < completedThreshold
    )
    .sort((left, right) =>
      String(right.lastVisitedAt).localeCompare(
        String(left.lastVisitedAt)
      )
    )
    .slice(0, Number(limits.continueReading) || 8);

  const completed = progressResult.records
    .filter(item => item.percent >= completedThreshold);

  const savedRoutes = readingListResult.records
    .sort((left, right) =>
      String(right.savedAt).localeCompare(String(left.savedAt))
    )
    .slice(0, Number(limits.savedRoutes) || 12);

  const recentNotes = notesResult.records
    .sort((left, right) =>
      String(right.updatedAt).localeCompare(String(left.updatedAt))
    )
    .slice(0, Number(limits.recentNotes) || 8);

  const recentAudio = audioResult.records
    .sort((left, right) =>
      String(right.lastPlayedAt).localeCompare(String(left.lastPlayedAt))
    )
    .slice(0, Number(limits.recentAudio) || 8);

  const activity = buildActivityEvents(
    {
      readingList: readingListResult.records,
      progress: progressResult.records,
      notes: notesResult.records,
      audio: audioResult.records
    },
    Number(limits.activityEvents) || 30
  );

  const ignoredRecords =
    readingListResult.ignored +
    progressResult.ignored +
    notesResult.ignored +
    audioResult.ignored;

  return {
    release: Number(config?.release) || 0,
    routeRelease: Number(routesPayload?.release) || 0,
    routeMap,
    readingList: readingListResult.records,
    progress: progressResult.records,
    notes: notesResult.records,
    audio: audioResult.records,
    preferences,
    activePreferences: accessibilityLabels(preferences),
    continueReading,
    completed,
    savedRoutes,
    recentNotes,
    recentAudio,
    activity,
    ignoredRecords,
    metrics: {
      savedRoutes: readingListResult.records.length,
      inProgress: progressResult.records.filter(
        item =>
          item.percent >= minimumStarted &&
          item.percent < completedThreshold
      ).length,
      completed: completed.length,
      notes: notesResult.records.length,
      sectionBookmarks: notesResult.records.filter(
        item => Boolean(item.headingId)
      ).length,
      audioTracks: audioResult.records.length,
      audioStarts: audioResult.records.reduce(
        (total, item) => total + item.playCount,
        0
      ),
      activePreferences: accessibilityLabels(preferences).length,
      activityEvents: activity.length,
      ignoredRecords
    }
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

export const loadPersonalLibraryModel = async (
  fetcher = globalThis.fetch,
  storage = undefined
) => {
  const [config, routesPayload] = await Promise.all([
    fetchJson(CONFIG_PATH, fetcher),
    fetchJson(ROUTES_PATH, fetcher)
  ]);
  const datasets = readLocalDatasets(
    storage,
    config.storageKeys || DEFAULT_STORAGE_KEYS
  );
  return buildPersonalLibraryModel(
    config,
    routesPayload,
    datasets
  );
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

const createRouteLink = (
  parent,
  route,
  label,
  className = 'btn'
) => {
  const link = document.createElement('a');
  link.className = className;
  link.href = route;
  link.textContent = label;
  parent.appendChild(link);
  return link;
};

const routeTitle = record =>
  record.titleTa && record.titleEn
    ? `${record.titleTa} · ${record.titleEn}`
    : record.titleTa || record.titleEn || record.path;

const formatDate = value => {
  if (!value) return 'Date unavailable';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const renderMetric = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
};

const createReadingCard = item => {
  const card = document.createElement('article');
  card.className = 'card personal-library-card';

  const labels = document.createElement('div');
  labels.className = 'personal-library-labels';
  createText(labels, 'span', item.category, 'pill');
  createText(labels, 'span', item.status, 'pill');
  card.appendChild(labels);

  createText(card, 'h3', routeTitle(item));
  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = item.percent;
  progress.setAttribute(
    'aria-label',
    `${routeTitle(item)} reading progress`
  );
  card.appendChild(progress);
  createText(
    card,
    'p',
    `${Math.round(item.percent)}% stored locally · ${formatDate(item.lastVisitedAt)}`,
    'personal-library-meta'
  );
  createRouteLink(
    card,
    `${item.path}?resume=1`,
    'Resume reading'
  );
  return card;
};

const createSavedCard = item => {
  const card = document.createElement('article');
  card.className = 'card personal-library-card';

  const labels = document.createElement('div');
  labels.className = 'personal-library-labels';
  createText(labels, 'span', item.category, 'pill');
  createText(labels, 'span', item.status, 'pill');
  card.appendChild(labels);

  createText(card, 'h3', routeTitle(item));
  if (item.summary) createText(card, 'p', item.summary);
  createText(
    card,
    'p',
    item.savedAt
      ? `Saved ${formatDate(item.savedAt)}`
      : 'Saved locally',
    'personal-library-meta'
  );
  createRouteLink(card, item.path, 'Open saved route');
  return card;
};

const createNoteCard = item => {
  const card = document.createElement('article');
  card.className = 'card personal-library-card';

  const labels = document.createElement('div');
  labels.className = 'personal-library-labels';
  createText(labels, 'span', item.kind, 'pill');
  createText(labels, 'span', item.status, 'pill');
  card.appendChild(labels);

  createText(card, 'h3', routeTitle(item));
  if (item.headingLabel) {
    createText(
      card,
      'p',
      `Section: ${item.headingLabel}`,
      'personal-library-section'
    );
  }
  createText(
    card,
    'p',
    item.note || 'Section bookmark only.'
  );
  createText(
    card,
    'p',
    `Updated ${formatDate(item.updatedAt)}`,
    'personal-library-meta'
  );
  createRouteLink(
    card,
    item.headingId
      ? `${item.path}#${encodeURIComponent(item.headingId)}`
      : item.path,
    item.headingId ? 'Open section' : 'Open page'
  );
  return card;
};

const createAudioCard = item => {
  const card = document.createElement('article');
  card.className = 'card personal-library-card';

  const labels = document.createElement('div');
  labels.className = 'personal-library-labels';
  createText(labels, 'span', item.kind, 'pill');
  createText(labels, 'span', item.playbackMode, 'pill');
  card.appendChild(labels);

  createText(card, 'h3', routeTitle(item));
  createText(
    card,
    'p',
    `${item.playCount} browser-local start${item.playCount === 1 ? '' : 's'}`
  );
  createText(
    card,
    'p',
    `Last started ${formatDate(item.lastPlayedAt)}`,
    'personal-library-meta'
  );
  createRouteLink(card, item.path, 'Open audio route');
  return card;
};

const createActivityCard = event => {
  const card = document.createElement('article');
  card.className = 'personal-library-activity-card';

  const header = document.createElement('div');
  header.className = 'personal-library-activity-header';
  createText(header, 'span', event.type, 'pill');
  createText(
    header,
    'time',
    formatDate(event.timestamp),
    'personal-library-meta'
  );
  card.appendChild(header);

  createText(card, 'h3', routeTitle(event));
  createText(card, 'p', event.summary);
  createRouteLink(
    card,
    event.route,
    'Open',
    'btn secondary'
  );
  return card;
};

const renderCards = (
  host,
  records,
  creator,
  emptyTitle,
  emptyText
) => {
  host.replaceChildren();
  if (!records.length) {
    const empty = document.createElement('article');
    empty.className = 'card personal-library-empty';
    createText(empty, 'h3', emptyTitle);
    createText(empty, 'p', emptyText);
    host.appendChild(empty);
    return;
  }
  records.forEach(record =>
    host.appendChild(creator(record))
  );
};

const initialise = async () => {
  const status =
    document.getElementById('personalLibraryStatus');
  const continueHost =
    document.getElementById('personalLibraryContinue');
  const savedHost =
    document.getElementById('personalLibrarySaved');
  const notesHost =
    document.getElementById('personalLibraryNotes');
  const audioHost =
    document.getElementById('personalLibraryAudio');
  const activityHost =
    document.getElementById('personalLibraryActivity');
  const activitySearch =
    document.getElementById('personalLibraryActivitySearch');
  const activityType =
    document.getElementById('personalLibraryActivityType');
  const activityReset =
    document.getElementById('personalLibraryActivityReset');
  const preferencesHost =
    document.getElementById('personalLibraryPreferences');
  const ignoredHost =
    document.getElementById('personalLibraryIgnored');

  if (
    !status || !continueHost || !savedHost || !notesHost ||
    !audioHost || !activityHost || !activitySearch ||
    !activityType || !activityReset || !preferencesHost ||
    !ignoredHost
  ) {
    return;
  }

  try {
    const model = await loadPersonalLibraryModel();

    const metricMap = {
      personalLibrarySavedCount: model.metrics.savedRoutes,
      personalLibraryProgressCount: model.metrics.inProgress,
      personalLibraryCompletedCount: model.metrics.completed,
      personalLibraryNotesCount: model.metrics.notes,
      personalLibraryAudioCount: model.metrics.audioStarts,
      personalLibraryPreferenceCount:
        model.metrics.activePreferences
    };
    Object.entries(metricMap).forEach(([id, value]) =>
      renderMetric(id, value)
    );

    renderCards(
      continueHost,
      model.continueReading,
      createReadingCard,
      'No reading in progress',
      'Open an eligible literature route and begin reading to create a local resume point.'
    );
    renderCards(
      savedHost,
      model.savedRoutes,
      createSavedCard,
      'No saved routes',
      'Use the Reading Workspace or Search Facets to save published routes locally.'
    );
    renderCards(
      notesHost,
      model.recentNotes,
      createNoteCard,
      'No reading notes',
      'Add a reflection, question, practice note or section bookmark from an eligible reading page.'
    );
    renderCards(
      audioHost,
      model.recentAudio,
      createAudioCard,
      'No listening history',
      'Start device read-aloud from a supported audio route to create local history.'
    );

    preferencesHost.replaceChildren();
    if (!model.activePreferences.length) {
      createText(
        preferencesHost,
        'p',
        'Default presentation preferences are active.'
      );
    } else {
      model.activePreferences.forEach(label =>
        createText(
          preferencesHost,
          'span',
          label,
          'pill'
        )
      );
    }

    ignoredHost.textContent =
      model.ignoredRecords > 0
        ? `${model.ignoredRecords} invalid, duplicate or no-longer-published local record${model.ignoredRecords === 1 ? '' : 's'} were excluded.`
        : 'No invalid or stale local route records were detected.';

    const renderActivity = () => {
      const records = filterActivityEvents(
        model.activity,
        {
          type: activityType.value,
          query: activitySearch.value
        }
      );
      renderCards(
        activityHost,
        records,
        createActivityCard,
        'No activity matches',
        'Change the activity type or search text.'
      );
      const activityStatus =
        document.getElementById(
          'personalLibraryActivityStatus'
        );
      if (activityStatus) {
        activityStatus.textContent =
          `${records.length} local activity event${records.length === 1 ? '' : 's'} match.`;
      }
    };

    activitySearch.addEventListener(
      'input',
      renderActivity
    );
    activityType.addEventListener(
      'change',
      renderActivity
    );
    activityReset.addEventListener('click', () => {
      activitySearch.value = '';
      activityType.value = 'all';
      renderActivity();
      activitySearch.focus();
    });

    renderActivity();
    status.textContent =
      `Personal Library loaded from route release ${model.routeRelease}. No new browser data was written.`;
  } catch (error) {
    console.warn(
      '[OmSaravanaBhava] Personal Library unavailable',
      error
    );
    status.textContent =
      `Personal Library unavailable: ${String(error?.message || error)}`;
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener(
    'DOMContentLoaded',
    initialise
  );
}
