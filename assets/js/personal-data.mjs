export const RELEASE = 225;
export const REGISTRY_PATH = '/data/personal-data-registry.json';
export const BACKUP_SCHEMA = 'osb-personal-data-backup-v1';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

export const DATASET_IDS = Object.freeze([
  'readingList',
  'readingProgress',
  'readingNotes',
  'accessibility',
  'audioHistory'
]);

const safeStorage = storage => {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const cleanText = (value, maximum = 240) =>
  String(value ?? '').trim().slice(0, maximum);

export const normaliseSameOriginRoute = value => {
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

export const normaliseIsoDate = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const sanitiseReadingList = (value, maximumItems = 100) => {
  const seen = new Set();
  const items = [];
  (Array.isArray(value) ? value : []).forEach(record => {
    if (!record || typeof record !== 'object') return;
    const route = normaliseSameOriginRoute(record.route);
    if (!route || seen.has(route)) return;
    seen.add(route);
    items.push({
      route,
      titleTa: cleanText(record.titleTa, 180),
      titleEn: cleanText(record.titleEn || record.title || route, 180) || route,
      kind: cleanText(record.kind || 'Published page', 80) || 'Published page',
      status: cleanText(record.status || 'published', 80) || 'published',
      summary: cleanText(record.summary, 500),
      savedAt: normaliseIsoDate(record.savedAt) || new Date(0).toISOString()
    });
  });
  return items.slice(0, Math.max(1, Number(maximumItems) || 100));
};

export const sanitiseReadingProgress = (value, maximumItems = 50) => {
  const seen = new Set();
  const items = [];
  (Array.isArray(value) ? value : []).forEach(record => {
    if (!record || typeof record !== 'object') return;
    const route = normaliseSameOriginRoute(record.route);
    if (!route || seen.has(route)) return;
    seen.add(route);
    const percent = Math.max(0, Math.min(100, Number(record.percent) || 0));
    items.push({
      route,
      titleTa: cleanText(record.titleTa, 180),
      titleEn: cleanText(record.titleEn || record.title || route, 180) || route,
      category: cleanText(record.category || 'Reading', 80) || 'Reading',
      status: cleanText(record.status || 'published', 80) || 'published',
      summary: cleanText(record.summary, 500),
      percent: Math.round(percent * 10) / 10,
      lastVisitedAt:
        normaliseIsoDate(record.lastVisitedAt) || new Date(0).toISOString(),
      completedAt: normaliseIsoDate(record.completedAt)
    });
  });
  return items.slice(0, Math.max(1, Number(maximumItems) || 50));
};

export const sanitiseReadingNotes = (value, maximumItems = 100) => {
  const seen = new Set();
  const items = [];
  (Array.isArray(value) ? value : []).forEach(record => {
    if (!record || typeof record !== 'object') return;
    const id = cleanText(record.id, 180);
    const route = normaliseSameOriginRoute(record.route);
    if (!id || !route || seen.has(id)) return;
    const headingId = cleanText(record.headingId, 120).replace(/^#/, '');
    const note = cleanText(record.note, 500);
    if (!headingId && !note) return;
    seen.add(id);
    const kind = ['reflection', 'question', 'practice', 'reference']
      .includes(String(record.kind ?? '').toLocaleLowerCase())
      ? String(record.kind).toLocaleLowerCase()
      : 'reflection';
    items.push({
      id,
      route,
      titleTa: cleanText(record.titleTa, 180),
      titleEn: cleanText(record.titleEn || record.title || route, 180) || route,
      category: cleanText(record.category || 'Reading', 80) || 'Reading',
      status: cleanText(record.status || 'published', 80) || 'published',
      headingId,
      headingLabel: cleanText(record.headingLabel, 160),
      kind,
      note,
      createdAt: normaliseIsoDate(record.createdAt) || new Date(0).toISOString(),
      updatedAt:
        normaliseIsoDate(record.updatedAt) ||
        normaliseIsoDate(record.createdAt) ||
        new Date(0).toISOString()
    });
  });
  return items.slice(0, Math.max(1, Number(maximumItems) || 100));
};

export const sanitiseAccessibility = value => {
  const source = value && typeof value === 'object' ? value : {};
  return {
    largeText: source.largeText === true,
    highContrast: source.highContrast === true,
    reducedMotion: source.reducedMotion === true,
    underlinedLinks: source.underlinedLinks === true
  };
};

export const sanitiseAudioHistory = (value, maximumItems = 20) => {
  const seen = new Set();
  const items = [];
  (Array.isArray(value) ? value : []).forEach(record => {
    if (!record || typeof record !== 'object') return;
    const id = cleanText(record.id, 180);
    const route = normaliseSameOriginRoute(record.route);
    if (!id || !route || seen.has(id)) return;
    seen.add(id);
    const playCount = Number(record.playCount);
    items.push({
      id,
      titleTa: cleanText(record.titleTa, 180),
      titleEn: cleanText(record.titleEn || id, 180) || id,
      artist: cleanText(record.artist || 'Text attribution not stated', 180),
      album: cleanText(record.album || 'Om Saravana Bhava read-aloud', 180),
      kind: cleanText(record.kind || 'Read-aloud', 80),
      route,
      playbackMode: cleanText(record.playbackMode || 'device-tts', 80),
      publicationStatus: cleanText(record.publicationStatus || 'published', 80),
      recordingRights: cleanText(
        record.recordingRights ||
        'Device speech only; no third-party performance recording bundled',
        300
      ),
      lastPlayedAt:
        normaliseIsoDate(record.lastPlayedAt) || new Date(0).toISOString(),
      playCount: Number.isInteger(playCount) && playCount > 0 ? playCount : 1
    });
  });
  return items.slice(0, Math.max(1, Number(maximumItems) || 20));
};

export const registryMap = registry =>
  new Map(
    (Array.isArray(registry?.datasets) ? registry.datasets : [])
      .filter(item => DATASET_IDS.includes(item?.id))
      .map(item => [item.id, item])
  );

export const sanitiseDataset = (id, value, registry) => {
  const definition = registryMap(registry).get(id);
  if (!definition) return undefined;
  if (id === 'readingList') {
    return sanitiseReadingList(value, definition.maximumItems);
  }
  if (id === 'readingProgress') {
    return sanitiseReadingProgress(value, definition.maximumItems);
  }
  if (id === 'readingNotes') {
    return sanitiseReadingNotes(value, definition.maximumItems);
  }
  if (id === 'accessibility') {
    return sanitiseAccessibility(value);
  }
  if (id === 'audioHistory') {
    return sanitiseAudioHistory(value, definition.maximumItems);
  }
  return undefined;
};

export const readRegisteredDatasets = (
  registry,
  storage = undefined
) => {
  const target = safeStorage(storage);
  const result = {};
  const errors = [];
  if (!target) {
    return {datasets: result, errors: ['Browser local storage is unavailable.']};
  }

  registryMap(registry).forEach((definition, id) => {
    const raw = target.getItem(definition.storageKey);
    if (raw === null) {
      result[id] = definition.shape === 'object'
        ? sanitiseAccessibility({})
        : [];
      return;
    }
    try {
      result[id] = sanitiseDataset(id, JSON.parse(raw), registry);
    } catch {
      errors.push(`${definition.label}: invalid stored JSON was ignored.`);
      result[id] = definition.shape === 'object'
        ? sanitiseAccessibility({})
        : [];
    }
  });
  return {datasets: result, errors};
};

export const datasetCount = value => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    return Object.values(value).some(Boolean) ? 1 : 0;
  }
  return 0;
};

export const buildInventory = (registry, storage = undefined) => {
  const {datasets, errors} = readRegisteredDatasets(registry, storage);
  const definitions = registryMap(registry);
  const items = DATASET_IDS
    .filter(id => definitions.has(id))
    .map(id => ({
      ...definitions.get(id),
      count: datasetCount(datasets[id]),
      value: datasets[id]
    }));
  return {
    datasets,
    errors,
    items,
    populatedDatasets: items.filter(item => item.count > 0).length,
    totalRecords: items.reduce((total, item) => total + item.count, 0)
  };
};

export const createBackup = (
  registry,
  selectedIds = DATASET_IDS,
  storage = undefined,
  exportedAt = new Date().toISOString()
) => {
  const inventory = buildInventory(registry, storage);
  const selected = new Set(selectedIds);
  const datasets = {};
  inventory.items.forEach(item => {
    if (selected.has(item.id)) datasets[item.id] = item.value;
  });
  return {
    schema: registry.schema || BACKUP_SCHEMA,
    release: RELEASE,
    exportedAt,
    origin: registry.canonicalOrigin || CANONICAL_ORIGIN,
    datasets
  };
};

export const validateBackup = (value, registry) => {
  const errors = [];
  const warnings = [];
  const source = value && typeof value === 'object' ? value : {};

  if (source.schema !== (registry.schema || BACKUP_SCHEMA)) {
    errors.push('Unsupported backup schema.');
  }
  if (source.origin && source.origin !== (registry.canonicalOrigin || CANONICAL_ORIGIN)) {
    errors.push('Backup origin does not match OmSaravanaBhava.');
  }
  if (!source.datasets || typeof source.datasets !== 'object' || Array.isArray(source.datasets)) {
    errors.push('Backup datasets object is missing.');
  }

  const clean = {};
  const definitions = registryMap(registry);
  if (!errors.length) {
    Object.entries(source.datasets).forEach(([id, data]) => {
      if (!definitions.has(id)) {
        warnings.push(`Unknown dataset ignored: ${id}`);
        return;
      }
      clean[id] = sanitiseDataset(id, data, registry);
      const inputCount = Array.isArray(data) ? data.length : datasetCount(data);
      const outputCount = datasetCount(clean[id]);
      if (outputCount < inputCount) {
        warnings.push(
          `${definitions.get(id).label}: ${inputCount - outputCount} invalid or duplicate record(s) removed.`
        );
      }
    });
  }

  if (!Object.keys(clean).length && !errors.length) {
    errors.push('Backup contains no supported datasets.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    backup: {
      schema: registry.schema || BACKUP_SCHEMA,
      release: Number(source.release) || 0,
      exportedAt: normaliseIsoDate(source.exportedAt),
      origin: source.origin || registry.canonicalOrigin || CANONICAL_ORIGIN,
      datasets: clean
    }
  };
};

const timestampValue = (record, field) => {
  const value = normaliseIsoDate(record?.[field]);
  return value ? new Date(value).getTime() : 0;
};

export const mergeArrayDataset = (
  existing,
  incoming,
  {
    uniqueBy,
    timestampField,
    maximumItems
  }
) => {
  const map = new Map();
  [...(Array.isArray(existing) ? existing : []),
   ...(Array.isArray(incoming) ? incoming : [])]
    .forEach(record => {
      const key = cleanText(record?.[uniqueBy], 240);
      if (!key) return;
      const current = map.get(key);
      if (
        !current ||
        timestampValue(record, timestampField) >=
          timestampValue(current, timestampField)
      ) {
        map.set(key, record);
      }
    });

  return [...map.values()]
    .sort((left, right) =>
      timestampValue(right, timestampField) -
      timestampValue(left, timestampField)
    )
    .slice(0, Math.max(1, Number(maximumItems) || 100));
};

export const applyValidatedBackup = (
  validation,
  registry,
  {
    selectedIds = DATASET_IDS,
    mode = 'merge',
    storage = undefined
  } = {}
) => {
  if (!validation?.ok) {
    return {ok: false, applied: [], errors: ['Backup validation failed.']};
  }

  const target = safeStorage(storage);
  if (!target) {
    return {ok: false, applied: [], errors: ['Browser local storage is unavailable.']};
  }

  const definitions = registryMap(registry);
  const selected = new Set(selectedIds);
  const applied = [];
  const errors = [];

  Object.entries(validation.backup.datasets).forEach(([id, incoming]) => {
    if (!selected.has(id) || !definitions.has(id)) return;
    const definition = definitions.get(id);
    try {
      let output = incoming;
      if (
        mode === 'merge' &&
        definition.shape === 'array' &&
        definition.mergeSupported
      ) {
        let existing = [];
        const raw = target.getItem(definition.storageKey);
        if (raw !== null) {
          try {
            existing = sanitiseDataset(id, JSON.parse(raw), registry);
          } catch {
            existing = [];
          }
        }
        output = mergeArrayDataset(existing, incoming, definition);
      } else {
        output = sanitiseDataset(id, incoming, registry);
      }
      target.setItem(definition.storageKey, JSON.stringify(output));
      applied.push({
        id,
        label: definition.label,
        count: datasetCount(output),
        mode:
          mode === 'merge' && definition.shape === 'array'
            ? 'merged'
            : 'replaced'
      });
    } catch (error) {
      errors.push(`${definition.label}: ${String(error?.message || error)}`);
    }
  });

  return {
    ok: errors.length === 0 && applied.length > 0,
    applied,
    errors
  };
};

export const sha256Hex = async text => {
  if (!globalThis.crypto?.subtle || typeof TextEncoder === 'undefined') {
    return '';
  }
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(String(text))
  );
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const fetchRegistry = async (fetcher = globalThis.fetch) => {
  if (typeof fetcher !== 'function') throw new Error('Fetch API unavailable');
  const response = await fetcher(REGISTRY_PATH, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error(`Registry returned HTTP ${response.status}`);
  return response.json();
};

const createText = (parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(text);
  parent.appendChild(element);
  return element;
};

const downloadJson = (filename, value) => {
  const text = JSON.stringify(value, null, 2);
  const blob = new Blob([text], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return text;
};

const renderInventory = (registry, host, checkboxHost) => {
  const inventory = buildInventory(registry);
  host.replaceChildren();
  checkboxHost.replaceChildren();

  inventory.items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'personal-data-card';
    createText(card, 'h3', item.label);
    createText(
      card,
      'strong',
      String(item.count),
      'personal-data-count'
    );
    createText(
      card,
      'p',
      `${item.count} local record${item.count === 1 ? '' : 's'} · ${item.storageKey}`
    );
    host.appendChild(card);

    const label = document.createElement('label');
    label.className = 'personal-data-checkbox';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = item.id;
    input.checked = true;
    label.appendChild(input);
    createText(label, 'span', `${item.label} (${item.count})`);
    checkboxHost.appendChild(label);
  });

  const values = {
    personalDataDatasetCount: inventory.items.length,
    personalDataPopulatedCount: inventory.populatedDatasets,
    personalDataRecordCount: inventory.totalRecords
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  });

  return inventory;
};

const renderImportPreview = (
  registry,
  validation,
  host,
  checkboxHost
) => {
  host.replaceChildren();
  checkboxHost.replaceChildren();
  const definitions = registryMap(registry);

  if (!validation.ok) {
    const card = document.createElement('article');
    card.className = 'personal-data-preview is-error';
    createText(card, 'h3', 'Import blocked');
    validation.errors.forEach(error => createText(card, 'p', error));
    host.appendChild(card);
    return;
  }

  Object.entries(validation.backup.datasets).forEach(([id, value]) => {
    const definition = definitions.get(id);
    if (!definition) return;
    const count = datasetCount(value);

    const card = document.createElement('article');
    card.className = 'personal-data-preview';
    createText(card, 'h3', definition.label);
    createText(card, 'strong', String(count), 'personal-data-count');
    createText(card, 'p', `${count} validated record${count === 1 ? '' : 's'}`);
    host.appendChild(card);

    const label = document.createElement('label');
    label.className = 'personal-data-checkbox';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = id;
    input.checked = true;
    label.appendChild(input);
    createText(label, 'span', `${definition.label} (${count})`);
    checkboxHost.appendChild(label);
  });

  validation.warnings.forEach(warning => {
    const warningCard = document.createElement('article');
    warningCard.className = 'personal-data-preview is-warning';
    createText(warningCard, 'p', warning);
    host.appendChild(warningCard);
  });
};

const checkedValues = host =>
  [...host.querySelectorAll('input[type="checkbox"]:checked')]
    .map(input => input.value);

const initialise = async () => {
  const status = document.getElementById('personalDataStatus');
  const inventoryHost = document.getElementById('personalDataInventory');
  const exportChecks = document.getElementById('personalDataExportDatasets');
  const exportButton = document.getElementById('personalDataExport');
  const checksum = document.getElementById('personalDataChecksum');
  const fileInput = document.getElementById('personalDataImportFile');
  const previewHost = document.getElementById('personalDataImportPreview');
  const importChecks = document.getElementById('personalDataImportDatasets');
  const applyButton = document.getElementById('personalDataApply');
  const mode = document.getElementById('personalDataImportMode');
  const applyResult = document.getElementById('personalDataApplyResult');

  if (
    !status || !inventoryHost || !exportChecks || !exportButton ||
    !checksum || !fileInput || !previewHost || !importChecks ||
    !applyButton || !mode || !applyResult
  ) return;

  let registry;
  let currentValidation = null;

  try {
    registry = await fetchRegistry();
    renderInventory(registry, inventoryHost, exportChecks);
    status.textContent =
      'Registered browser-local datasets are ready for explicit export or restore.';
  } catch (error) {
    status.textContent =
      `Personal data registry unavailable: ${String(error?.message || error)}`;
    exportButton.disabled = true;
    fileInput.disabled = true;
    return;
  }

  exportButton.addEventListener('click', async () => {
    const selected = checkedValues(exportChecks);
    if (!selected.length) {
      status.textContent = 'Select at least one dataset to export.';
      return;
    }
    const backup = createBackup(registry, selected);
    const text = downloadJson(
      `omsaravanabhava-personal-data-${new Date().toISOString().slice(0, 10)}.json`,
      backup
    );
    const digest = await sha256Hex(text);
    checksum.textContent = digest
      ? `SHA-256: ${digest}`
      : 'SHA-256 unavailable in this browser.';
    status.textContent =
      `${selected.length} selected dataset${selected.length === 1 ? '' : 's'} exported locally.`;
  });

  fileInput.addEventListener('change', async () => {
    currentValidation = null;
    applyButton.disabled = true;
    previewHost.replaceChildren();
    importChecks.replaceChildren();
    applyResult.textContent = '';

    const file = fileInput.files?.[0];
    if (!file) {
      status.textContent = 'No import file selected.';
      return;
    }
    if (file.size > Number(registry.maximumImportBytes || 1048576)) {
      status.textContent = 'Import blocked: file exceeds the 1 MB safety limit.';
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      currentValidation = validateBackup(parsed, registry);
      renderImportPreview(
        registry,
        currentValidation,
        previewHost,
        importChecks
      );
      applyButton.disabled = !currentValidation.ok;
      status.textContent = currentValidation.ok
        ? 'Backup validated. Review datasets and choose merge or replace before applying.'
        : 'Backup validation failed. Nothing has been changed.';
    } catch (error) {
      status.textContent =
        `Import blocked: ${String(error?.message || error)}`;
    }
  });

  applyButton.addEventListener('click', async () => {
    if (!currentValidation?.ok) {
      status.textContent = 'Validate a supported backup before applying it.';
      return;
    }
    const selected = checkedValues(importChecks);
    if (!selected.length) {
      status.textContent = 'Select at least one validated dataset to restore.';
      return;
    }

    const action = mode.value === 'replace' ? 'replace' : 'merge';
    if (
      !confirm(
        action === 'replace'
          ? 'Replace the selected local datasets with the validated backup? Other registered datasets will remain unchanged.'
          : 'Merge the validated backup into the selected local datasets?'
      )
    ) {
      return;
    }

    const result = applyValidatedBackup(
      currentValidation,
      registry,
      {
        selectedIds: selected,
        mode: action
      }
    );

    applyResult.replaceChildren();
    result.applied.forEach(item => {
      createText(
        applyResult,
        'p',
        `${item.label}: ${item.count} record${item.count === 1 ? '' : 's'} ${item.mode}.`
      );
    });
    result.errors.forEach(error =>
      createText(applyResult, 'p', error, 'personal-data-error')
    );

    if (selected.includes('accessibility')) {
      import('/assets/js/accessibility-preferences.mjs')
        .then(module => module.applyStoredPreferences())
        .catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('osb:personal-data-restored', {
      detail: {datasets: result.applied.map(item => item.id)}
    }));

    renderInventory(registry, inventoryHost, exportChecks);
    status.textContent = result.ok
      ? 'Selected browser-local datasets restored successfully.'
      : 'Restore completed with errors. Review the results below.';
  });
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialise);
}
