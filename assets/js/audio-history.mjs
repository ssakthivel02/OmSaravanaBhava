export const RELEASE = 219;
export const STORAGE_KEY = 'osb-audio-listening-history-v1';
export const PLAYER_TRACK_KEY = 'osb-player-track';
export const MAX_HISTORY_ITEMS = 20;
export const PLAYLIST_PATH = '/data/read-aloud-playlist.json';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

const safeStorage = storage => {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const normaliseTrackRoute = route => {
  const value = String(route ?? '').trim();
  if (!value) return '';
  try {
    const url = new URL(value, `${CANONICAL_ORIGIN}/`);
    if (url.origin !== CANONICAL_ORIGIN) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
};

export const normaliseHistoryItem = (
  track,
  playedAt = new Date().toISOString()
) => {
  if (!track || typeof track !== 'object') return null;
  const id = String(track.id ?? '').trim();
  const route = normaliseTrackRoute(track.route);
  if (!id || !route) return null;

  const playCount = Number(track.playCount);
  return {
    id,
    titleTa: String(track.titleTa ?? '').trim(),
    titleEn: String(track.titleEn ?? id).trim() || id,
    artist: String(track.artist ?? 'Text attribution not stated').trim(),
    album: String(track.album ?? 'Om Saravana Bhava read-aloud').trim(),
    kind: String(track.kind ?? 'Read-aloud').trim(),
    route,
    playbackMode: String(track.playbackMode ?? 'device-tts').trim(),
    publicationStatus: String(track.publicationStatus ?? 'published').trim(),
    recordingRights: String(
      track.recordingRights ??
      'Device speech only; no third-party performance recording bundled'
    ).trim(),
    lastPlayedAt: String(track.lastPlayedAt ?? playedAt),
    playCount: Number.isInteger(playCount) && playCount > 0 ? playCount : 1
  };
};

export const loadHistory = storage => {
  const target = safeStorage(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(target.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    const items = [];
    parsed.forEach(record => {
      const item = normaliseHistoryItem(record, record?.lastPlayedAt);
      if (!item || seen.has(item.id)) return;
      seen.add(item.id);
      items.push(item);
    });
    return items
      .sort((left, right) =>
        String(right.lastPlayedAt).localeCompare(String(left.lastPlayedAt))
      )
      .slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
};

export const saveHistory = (items, storage) => {
  const target = safeStorage(storage);
  if (!target) return false;
  try {
    const clean = [];
    const seen = new Set();
    (Array.isArray(items) ? items : []).forEach(record => {
      const item = normaliseHistoryItem(record, record?.lastPlayedAt);
      if (!item || seen.has(item.id)) return;
      seen.add(item.id);
      clean.push(item);
    });
    target.setItem(
      STORAGE_KEY,
      JSON.stringify(clean.slice(0, MAX_HISTORY_ITEMS))
    );
    return true;
  } catch {
    return false;
  }
};

export const upsertHistory = (
  items,
  track,
  playedAt = new Date().toISOString()
) => {
  const incoming = normaliseHistoryItem(track, playedAt);
  if (!incoming) return Array.isArray(items) ? [...items] : [];

  const previous = (Array.isArray(items) ? items : [])
    .map(record => normaliseHistoryItem(record, record?.lastPlayedAt))
    .filter(Boolean);
  const existing = previous.find(record => record.id === incoming.id);
  incoming.playCount = (existing?.playCount || 0) + 1;
  incoming.lastPlayedAt = playedAt;

  return [
    incoming,
    ...previous.filter(record => record.id !== incoming.id)
  ].slice(0, MAX_HISTORY_ITEMS);
};

export const recordPlaybackStart = (
  track,
  storage,
  playedAt = new Date().toISOString()
) => {
  const history = upsertHistory(loadHistory(storage), track, playedAt);
  if (!saveHistory(history, storage)) {
    throw new Error('Browser storage is unavailable.');
  }
  return history;
};

export const removeHistoryItem = (id, storage) => {
  const targetId = String(id ?? '').trim();
  const history = loadHistory(storage).filter(item => item.id !== targetId);
  saveHistory(history, storage);
  return history;
};

export const clearHistory = storage => {
  const target = safeStorage(storage);
  if (!target) return false;
  try {
    target.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return saveHistory([], target);
  }
};

export const isPlaybackStartStatus = status => {
  const value = String(status ?? '').trim();
  return /^Reading section 1 of \d+/i.test(value);
};

export const buildHistorySummary = items => {
  const history = Array.isArray(items) ? items : [];
  return {
    uniqueTracks: history.length,
    recordedStarts: history.reduce(
      (total, item) => total + (Number(item?.playCount) || 0),
      0
    ),
    latestPlayedAt: history[0]?.lastPlayedAt || ''
  };
};

const loadPlaylist = async (fetcher = globalThis.fetch) => {
  if (typeof fetcher !== 'function') return [];
  const response = await fetcher(PLAYLIST_PATH, {
    cache: 'default',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error(`Playlist returned HTTP ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
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
    : item.titleTa || item.titleEn || item.id;

const createHistoryCard = item => {
  const article = document.createElement('article');
  article.className = 'card audio-history-item';

  const labels = document.createElement('div');
  labels.className = 'audio-history-labels';
  createText(labels, 'span', item.kind, 'pill');
  createText(labels, 'span', item.playbackMode, 'pill');
  createText(labels, 'span', item.publicationStatus, 'pill');
  article.appendChild(labels);

  createText(article, 'h2', displayTitle(item));
  createText(article, 'p', `${item.artist} · ${item.album}`);
  createText(
    article,
    'p',
    `Actual read-aloud starts in this browser: ${item.playCount}`,
    'audio-history-meta'
  );
  createText(
    article,
    'p',
    `Last started: ${new Date(item.lastPlayedAt).toLocaleString()}`,
    'audio-history-meta'
  );
  createText(article, 'p', item.recordingRights, 'audio-history-rights');

  const actions = document.createElement('div');
  actions.className = 'audio-history-actions';

  const player = document.createElement('a');
  player.className = 'btn';
  player.href = `audio-library.html?track=${encodeURIComponent(item.id)}`;
  player.textContent = 'Open in read-aloud player';
  actions.appendChild(player);

  const text = document.createElement('a');
  text.className = 'btn secondary';
  text.href = item.route;
  text.textContent = 'Open source text';
  actions.appendChild(text);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn secondary';
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => {
    removeHistoryItem(item.id);
    renderHistoryPage();
  });
  actions.appendChild(remove);

  article.appendChild(actions);
  return article;
};

const renderHistoryPage = () => {
  const host = document.getElementById('audioHistoryItems');
  const unique = document.getElementById('audioHistoryUnique');
  const starts = document.getElementById('audioHistoryStarts');
  const status = document.getElementById('audioHistoryStatus');
  const clearButton = document.getElementById('audioHistoryClear');
  const exportButton = document.getElementById('audioHistoryExport');
  if (!host || !unique || !starts || !status || !clearButton || !exportButton) {
    return;
  }

  const history = loadHistory();
  const summary = buildHistorySummary(history);
  unique.textContent = String(summary.uniqueTracks);
  starts.textContent = String(summary.recordedStarts);
  clearButton.disabled = history.length === 0;
  exportButton.disabled = history.length === 0;
  host.replaceChildren();

  if (!history.length) {
    const empty = document.createElement('article');
    empty.className = 'card audio-history-empty';
    createText(empty, 'h2', 'No listening history yet');
    createText(
      empty,
      'p',
      'History is added only after device speech actually begins reading the first section.'
    );
    const link = document.createElement('a');
    link.className = 'btn';
    link.href = 'audio-library.html';
    link.textContent = 'Open verified read-aloud queue';
    empty.appendChild(link);
    host.appendChild(empty);
    status.textContent = 'No actual read-aloud starts are stored in this browser.';
    return;
  }

  history.forEach(item => host.appendChild(createHistoryCard(item)));
  status.textContent =
    `${summary.uniqueTracks} unique item${summary.uniqueTracks === 1 ? '' : 's'} ` +
    `and ${summary.recordedStarts} actual read-aloud start${summary.recordedStarts === 1 ? '' : 's'} stored locally.`;
};

const bindHistoryPageControls = () => {
  const clearButton = document.getElementById('audioHistoryClear');
  const exportButton = document.getElementById('audioHistoryExport');
  if (!clearButton || !exportButton) return;

  clearButton.addEventListener('click', () => {
    if (!confirm('Clear the browser-local audio listening history?')) return;
    clearHistory();
    renderHistoryPage();
  });

  exportButton.addEventListener('click', () => {
    const items = loadHistory();
    const blob = new Blob([
      JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        items
      }, null, 2)
    ], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'omsaravanabhava-audio-history.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
};

const initialisePlaybackRecorder = async () => {
  const status = document.getElementById('playerStatus');
  if (!status || typeof MutationObserver === 'undefined') return;

  try {
    const playlist = await loadPlaylist();
    const tracks = new Map(playlist.map(track => [String(track.id), track]));
    let lastRecordedId = '';
    let lastRecordedAt = 0;

    const inspect = () => {
      const message = status.textContent || '';
      if (!isPlaybackStartStatus(message)) return;

      const id = localStorage.getItem(PLAYER_TRACK_KEY) || '';
      const track = tracks.get(id);
      if (!track) return;

      const now = Date.now();
      if (id === lastRecordedId && now - lastRecordedAt < 5000) return;

      recordPlaybackStart(track);
      lastRecordedId = id;
      lastRecordedAt = now;
    };

    const observer = new MutationObserver(inspect);
    observer.observe(status, {
      childList: true,
      characterData: true,
      subtree: true
    });
    inspect();
  } catch (error) {
    console.warn('[OmSaravanaBhava] Audio history recorder unavailable', error);
  }
};

const initialise = () => {
  if (document.getElementById('audioHistoryItems')) {
    bindHistoryPageControls();
    renderHistoryPage();
    window.addEventListener('storage', event => {
      if (event.key === STORAGE_KEY) renderHistoryPage();
    });
  }
  initialisePlaybackRecorder();
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialise);
}
