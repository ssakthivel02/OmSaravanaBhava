export const RELEASE = 221;
export const CONFIG_PATH = '/data/maintenance-checks.json';
export const DEFAULT_TRANSIENT_CACHE_PREFIXES = Object.freeze([
  'osb-runtime-v',
  'osb-data-v'
]);

export const normaliseSameOriginPath = (
  value,
  origin = 'https://omsaravanabhava.org'
) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const base = new URL(origin);
    const url = new URL(raw, `${base.origin}/`);
    if (url.origin !== base.origin) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
};

export const readJsonPath = (value, path) => {
  const segments = String(path ?? '')
    .split('.')
    .map(segment => segment.trim())
    .filter(Boolean);
  let current = value;
  for (const segment of segments) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !(segment in current)
    ) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

export const evaluateTextIncludes = (text, expected) => ({
  ok: String(text).includes(String(expected)),
  actual: String(text).includes(String(expected))
    ? String(expected)
    : 'marker not found'
});

export const evaluateTextCount = (
  text,
  expected,
  expectedCount = 1
) => {
  const source = String(text);
  const marker = String(expected);
  const count = marker
    ? source.split(marker).length - 1
    : 0;
  return {
    ok: count === Number(expectedCount),
    actual: count
  };
};

export const evaluateJsonEquals = (
  value,
  jsonPath,
  expected
) => {
  const actual = readJsonPath(value, jsonPath);
  return {
    ok: actual === expected,
    actual
  };
};

export const evaluateRouteRegistry = (
  value,
  expectedRelease,
  requiredRoute
) => {
  const records = Array.isArray(value?.routes) ? value.routes : [];
  const paths = records
    .filter(record => record && typeof record === 'object')
    .map(record => String(record.path ?? '').trim())
    .filter(Boolean);
  const unique = new Set(paths);
  const requiredCount = paths.filter(path => path === requiredRoute).length;
  const duplicateCount = paths.length - unique.size;
  return {
    ok:
      value?.release === expectedRelease &&
      requiredCount === 1 &&
      duplicateCount === 0,
    actual: {
      release: value?.release,
      routeCount: paths.length,
      requiredRouteCount: requiredCount,
      duplicateCount
    }
  };
};

export const evaluateAuditConfig = (
  value,
  expectedRelease,
  requiredFiles
) => {
  const files = Array.isArray(value?.requiredFiles)
    ? value.requiredFiles.map(item => String(item))
    : [];
  const missing = (Array.isArray(requiredFiles) ? requiredFiles : [])
    .filter(path => !files.includes(path));
  return {
    ok:
      value?.expectedRelease === expectedRelease &&
      missing.length === 0,
    actual: {
      expectedRelease: value?.expectedRelease,
      requiredFileCount: files.length,
      missing
    }
  };
};

export const evaluateCheckPayload = (check, text) => {
  const mode = String(check?.mode ?? '').trim();
  if (mode === 'textIncludes') {
    return evaluateTextIncludes(text, check.expected);
  }
  if (mode === 'textCount') {
    return evaluateTextCount(
      text,
      check.expected,
      check.expectedCount
    );
  }

  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      actual: `invalid JSON: ${String(error?.message || error)}`
    };
  }

  if (mode === 'jsonEquals') {
    return evaluateJsonEquals(
      value,
      check.jsonPath,
      check.expected
    );
  }
  if (mode === 'routeRegistry') {
    return evaluateRouteRegistry(
      value,
      check.expectedRelease,
      check.requiredRoute
    );
  }
  if (mode === 'auditConfig') {
    return evaluateAuditConfig(
      value,
      check.expectedRelease,
      check.requiredFiles
    );
  }
  return {
    ok: false,
    actual: `unsupported mode: ${mode}`
  };
};

export const runResourceCheck = async (
  check,
  fetcher = globalThis.fetch
) => {
  const path = normaliseSameOriginPath(check?.path);
  if (!path || typeof fetcher !== 'function') {
    return {
      ...check,
      path,
      ok: false,
      status: null,
      error: 'Invalid same-origin path or Fetch API unavailable'
    };
  }

  try {
    const response = await fetcher(path, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        'Accept': check.mode?.startsWith('json') ||
          check.mode === 'routeRegistry' ||
          check.mode === 'auditConfig'
          ? 'application/json,text/plain;q=0.8'
          : 'text/plain,text/html,application/xml;q=0.8'
      }
    });
    const text = await response.text();
    const evaluation = evaluateCheckPayload(check, text);
    return {
      ...check,
      path,
      status: response.status,
      ok: response.ok && evaluation.ok,
      actual: evaluation.actual,
      error: response.ok ? '' : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      ...check,
      path,
      status: null,
      ok: false,
      error: String(error?.message || error)
    };
  }
};

export const auditPaths = async (
  paths,
  fetcher = globalThis.fetch,
  concurrency = 4
) => {
  const queue = [...new Set(
    (Array.isArray(paths) ? paths : [])
      .map(path => normaliseSameOriginPath(path))
      .filter(Boolean)
  )];
  const results = new Array(queue.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;
      const path = queue[index];
      try {
        const response = await fetcher(path, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: {'Accept': '*/*'}
        });
        results[index] = {
          path,
          status: response.status,
          ok: response.ok
        };
      } catch (error) {
        results[index] = {
          path,
          status: null,
          ok: false,
          error: String(error?.message || error)
        };
      }
    }
  };

  const workerCount = Math.max(
    1,
    Math.min(Number(concurrency) || 1, queue.length || 1)
  );
  await Promise.all(
    Array.from({length: workerCount}, () => worker())
  );
  return results;
};

export const summariseResults = results => {
  const items = Array.isArray(results) ? results : [];
  const passed = items.filter(item => item?.ok === true).length;
  const failed = items.length - passed;
  return {
    total: items.length,
    passed,
    failed,
    status:
      items.length === 0
        ? 'NOT_RUN'
        : failed === 0
          ? 'PASS'
          : 'FAIL'
  };
};

export const listTransientCaches = async (
  cacheStorage = globalThis.caches,
  prefixes = DEFAULT_TRANSIENT_CACHE_PREFIXES
) => {
  if (!cacheStorage?.keys) return [];
  const names = await cacheStorage.keys();
  return names.filter(name =>
    prefixes.some(prefix => String(name).startsWith(prefix))
  );
};

export const clearTransientCaches = async (
  cacheStorage = globalThis.caches,
  prefixes = DEFAULT_TRANSIENT_CACHE_PREFIXES
) => {
  if (!cacheStorage?.keys || !cacheStorage?.delete) {
    return {deleted: [], failed: []};
  }
  const names = await listTransientCaches(cacheStorage, prefixes);
  const deleted = [];
  const failed = [];
  for (const name of names) {
    try {
      const ok = await cacheStorage.delete(name);
      if (ok) deleted.push(name);
      else failed.push(name);
    } catch {
      failed.push(name);
    }
  }
  return {deleted, failed};
};

export const requestServiceWorkerUpdate = async (
  navigatorRef = globalThis.navigator
) => {
  if (!navigatorRef?.serviceWorker?.getRegistrations) {
    return {supported: false, registrations: 0, updated: 0};
  }
  const registrations =
    await navigatorRef.serviceWorker.getRegistrations();
  let updated = 0;
  for (const registration of registrations) {
    try {
      await registration.update();
      updated += 1;
    } catch {
      // Report count only; one registration failure must not block another.
    }
  }
  return {
    supported: true,
    registrations: registrations.length,
    updated
  };
};

export const buildBrowserSnapshot = async ({
  navigatorRef = globalThis.navigator,
  cacheStorage = globalThis.caches,
  storageManager = globalThis.navigator?.storage
} = {}) => {
  let estimate = {};
  if (storageManager?.estimate) {
    try {
      estimate = await storageManager.estimate();
    } catch {
      estimate = {};
    }
  }

  let cacheNames = [];
  if (cacheStorage?.keys) {
    try {
      cacheNames = await cacheStorage.keys();
    } catch {
      cacheNames = [];
    }
  }

  let localStorageAvailable = false;
  try {
    const key = '__osb_maintenance_probe__';
    globalThis.localStorage?.setItem(key, '1');
    globalThis.localStorage?.removeItem(key);
    localStorageAvailable = true;
  } catch {
    localStorageAvailable = false;
  }

  return {
    online: navigatorRef?.onLine !== false,
    serviceWorkerSupported:
      Boolean(navigatorRef?.serviceWorker),
    serviceWorkerControlled:
      Boolean(navigatorRef?.serviceWorker?.controller),
    cacheApiSupported: Boolean(cacheStorage?.keys),
    cacheCount: cacheNames.length,
    localStorageAvailable,
    storageUsage: Number(estimate.usage) || 0,
    storageQuota: Number(estimate.quota) || 0
  };
};

const formatBytes = value => {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const createText = (parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(text);
  parent.appendChild(element);
  return element;
};

const renderSummary = (summary, prefix) => {
  const total = document.getElementById(`${prefix}Total`);
  const passed = document.getElementById(`${prefix}Passed`);
  const passedInline = document.getElementById(`${prefix}PassedInline`);
  const failed = document.getElementById(`${prefix}Failed`);
  if (total) total.textContent = String(summary.total);
  if (passed) passed.textContent = String(summary.passed);
  if (passedInline) passedInline.textContent = String(summary.passed);
  if (failed) failed.textContent = String(summary.failed);
};

const renderResultCards = (host, results) => {
  host.replaceChildren();
  results.forEach(result => {
    const article = document.createElement('article');
    article.className =
      `maintenance-result ${result.ok ? 'is-pass' : 'is-fail'}`;
    const heading = document.createElement('div');
    heading.className = 'maintenance-result-heading';
    createText(
      heading,
      'strong',
      result.label || result.path
    );
    createText(
      heading,
      'span',
      result.ok ? 'PASS' : 'FAIL',
      'maintenance-status'
    );
    article.appendChild(heading);
    createText(article, 'code', result.path || '');
    if (result.status !== undefined) {
      createText(
        article,
        'p',
        `HTTP status: ${result.status ?? 'unavailable'}`
      );
    }
    if (result.actual !== undefined) {
      createText(
        article,
        'pre',
        typeof result.actual === 'string'
          ? result.actual
          : JSON.stringify(result.actual, null, 2)
      );
    }
    if (result.error) {
      createText(article, 'p', result.error, 'maintenance-error');
    }
    host.appendChild(article);
  });
};

const downloadJson = (filename, value) => {
  const blob = new Blob(
    [JSON.stringify(value, null, 2)],
    {type: 'application/json'}
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const initialise = async () => {
  const status = document.getElementById('maintenanceStatus');
  const checkButton = document.getElementById('maintenanceRunChecks');
  const routeButton = document.getElementById('maintenanceAuditRoutes');
  const requiredButton =
    document.getElementById('maintenanceAuditRequired');
  const updateButton = document.getElementById('maintenanceCheckUpdate');
  const clearButton = document.getElementById('maintenanceClearCaches');
  const exportButton = document.getElementById('maintenanceExport');
  const resultsHost = document.getElementById('maintenanceResults');
  const browserHost = document.getElementById('maintenanceBrowserState');
  if (
    !status ||
    !checkButton ||
    !routeButton ||
    !requiredButton ||
    !updateButton ||
    !clearButton ||
    !exportButton ||
    !resultsHost ||
    !browserHost
  ) {
    return;
  }

  let config;
  let report = {
    release: RELEASE,
    generatedAt: '',
    browser: {},
    resourceChecks: [],
    criticalRoutes: [],
    requiredFiles: [],
    actions: []
  };

  try {
    const response = await fetch(CONFIG_PATH, {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    config = await response.json();
  } catch (error) {
    status.textContent =
      `Maintenance registry unavailable: ${String(error?.message || error)}`;
    for (const button of [
      checkButton,
      routeButton,
      requiredButton
    ]) {
      button.disabled = true;
    }
    return;
  }

  const refreshBrowserState = async () => {
    const snapshot = await buildBrowserSnapshot();
    report.browser = snapshot;
    browserHost.replaceChildren();
    const entries = [
      ['Online', snapshot.online ? 'Yes' : 'No'],
      [
        'Service worker supported',
        snapshot.serviceWorkerSupported ? 'Yes' : 'No'
      ],
      [
        'Service worker controlling page',
        snapshot.serviceWorkerControlled ? 'Yes' : 'No'
      ],
      [
        'Cache API supported',
        snapshot.cacheApiSupported ? 'Yes' : 'No'
      ],
      ['Cache containers', snapshot.cacheCount],
      [
        'Local storage available',
        snapshot.localStorageAvailable ? 'Yes' : 'No'
      ],
      ['Storage usage', formatBytes(snapshot.storageUsage)],
      ['Storage quota', formatBytes(snapshot.storageQuota)]
    ];
    entries.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'maintenance-browser-row';
      createText(row, 'span', label);
      createText(row, 'strong', value);
      browserHost.appendChild(row);
    });
  };

  await refreshBrowserState();
  status.textContent =
    `Release ${RELEASE} maintenance tools are ready. No check has run yet.`;

  checkButton.addEventListener('click', async () => {
    checkButton.disabled = true;
    status.textContent = 'Running same-origin release checks…';
    const results = [];
    for (const check of config.checks || []) {
      results.push(await runResourceCheck(check));
    }
    report.resourceChecks = results;
    report.generatedAt = new Date().toISOString();
    const summary = summariseResults(results);
    renderSummary(summary, 'maintenanceChecks');
    renderResultCards(resultsHost, results);
    status.textContent =
      `Release checks ${summary.status}: ${summary.passed}/${summary.total} passed.`;
    exportButton.disabled = false;
    checkButton.disabled = false;
  });

  routeButton.addEventListener('click', async () => {
    routeButton.disabled = true;
    status.textContent = 'Checking critical deployed routes…';
    const results = await auditPaths(config.criticalRoutes || []);
    report.criticalRoutes = results;
    report.generatedAt = new Date().toISOString();
    const summary = summariseResults(results);
    renderSummary(summary, 'maintenanceRoutes');
    renderResultCards(
      resultsHost,
      results.map(item => ({
        ...item,
        label: item.path
      }))
    );
    status.textContent =
      `Critical-route audit ${summary.status}: ${summary.passed}/${summary.total} available.`;
    exportButton.disabled = false;
    routeButton.disabled = false;
  });

  requiredButton.addEventListener('click', async () => {
    requiredButton.disabled = true;
    status.textContent =
      'Loading the static-audit file registry…';
    try {
      const response = await fetch('/quality/site-audit-config.json', {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const auditConfig = await response.json();
      status.textContent =
        `Checking ${auditConfig.requiredFiles?.length || 0} required files…`;
      const results = await auditPaths(
        auditConfig.requiredFiles || [],
        globalThis.fetch,
        5
      );
      report.requiredFiles = results;
      report.generatedAt = new Date().toISOString();
      const summary = summariseResults(results);
      renderSummary(summary, 'maintenanceRequired');
      renderResultCards(
        resultsHost,
        results.map(item => ({
          ...item,
          label: item.path
        }))
      );
      status.textContent =
        `Required-file audit ${summary.status}: ${summary.passed}/${summary.total} available.`;
      exportButton.disabled = false;
    } catch (error) {
      status.textContent =
        `Required-file audit failed: ${String(error?.message || error)}`;
    } finally {
      requiredButton.disabled = false;
    }
  });

  updateButton.addEventListener('click', async () => {
    updateButton.disabled = true;
    status.textContent = 'Requesting service-worker update check…';
    const result = await requestServiceWorkerUpdate();
    report.actions.push({
      action: 'service-worker-update',
      at: new Date().toISOString(),
      result
    });
    status.textContent = result.supported
      ? `Update requested for ${result.updated}/${result.registrations} registration(s).`
      : 'Service workers are not supported in this browser.';
    await refreshBrowserState();
    exportButton.disabled = false;
    updateButton.disabled = false;
  });

  clearButton.addEventListener('click', async () => {
    if (
      !confirm(
        'Clear only transient runtime and JSON caches? Reading lists, accessibility preferences and audio history will be preserved.'
      )
    ) {
      return;
    }
    clearButton.disabled = true;
    const result = await clearTransientCaches(
      globalThis.caches,
      config.transientCachePrefixes ||
        DEFAULT_TRANSIENT_CACHE_PREFIXES
    );
    report.actions.push({
      action: 'clear-transient-caches',
      at: new Date().toISOString(),
      result
    });
    status.textContent =
      `${result.deleted.length} transient cache(s) cleared; ` +
      `${result.failed.length} failed. User data was not removed.`;
    await refreshBrowserState();
    exportButton.disabled = false;
    clearButton.disabled = false;
  });

  exportButton.addEventListener('click', () => {
    report.generatedAt =
      report.generatedAt || new Date().toISOString();
    downloadJson(
      'omsaravanabhava-maintenance-report.json',
      report
    );
    status.textContent =
      'Browser-local maintenance report exported as JSON.';
  });
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialise);
}
