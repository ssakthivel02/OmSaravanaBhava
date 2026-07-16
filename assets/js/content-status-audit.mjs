import {
  CONSUMER_RELEASE,
  loadEffectiveRouteRegistry,
  normaliseRoutePath,
  registryStatusMessage
} from './effective-route-registry.mjs';

export const RELEASE = 237;
export const CONFIG_PATH = '/data/content-status.json';
export const BOUNDARIES_PATH = '/data/publication-boundaries.json';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

export const buildStatusCounts = routesPayload => {
  const counts = new Map();
  const routes = Array.isArray(routesPayload?.routes)
    ? routesPayload.routes
    : [];
  routes.forEach(record => {
    const status = String(record?.status || 'unspecified').trim() ||
      'unspecified';
    counts.set(status, (counts.get(status) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([status, count]) => ({status, count}))
    .sort((left, right) =>
      right.count - left.count ||
      left.status.localeCompare(right.status)
    );
};

export const buildRouteMap = routesPayload => new Map(
  (Array.isArray(routesPayload?.routes) ? routesPayload.routes : [])
    .filter(record => record && typeof record === 'object')
    .map(record => [normaliseRoutePath(record.path), record])
    .filter(([route]) => route)
);

export const evaluateBoundary = (record, routeRecord) => {
  const route = normaliseRoutePath(record?.route);
  const effectiveStatus = String(routeRecord?.status || '').trim();
  const verifiedStatus = String(record?.verifiedStatus || '').trim();
  const previousStatus = String(
    routeRecord?.publicationStatusPrevious ||
    record?.declaredRouteStatus ||
    ''
  ).trim();
  return {
    ...record,
    route,
    routePresent: Boolean(routeRecord),
    previousStatus: previousStatus || 'missing',
    effectiveStatus: effectiveStatus || 'missing',
    verifiedStatus,
    aligned: Boolean(routeRecord) && effectiveStatus === verifiedStatus,
    mismatch: !routeRecord || effectiveStatus !== verifiedStatus,
    readingExcluded: routeRecord
      ? routeRecord.readingEligible === false
      : record?.readingEligible === false,
    overrideApplied: routeRecord?.effectiveOverrideApplied === true
  };
};

export const filterBoundaryRecords = (
  records,
  {state = 'all', query = ''} = {}
) => {
  const needle = String(query).trim().toLocaleLowerCase();
  return (Array.isArray(records) ? records : []).filter(record => {
    if (state === 'mismatch' && !record.mismatch) return false;
    if (state === 'aligned' && !record.aligned) return false;
    if (
      state === 'reading-excluded' &&
      !record.readingExcluded
    ) {
      return false;
    }
    if (!needle) return true;
    return [
      record.titleTa,
      record.titleEn,
      record.route,
      record.previousStatus,
      record.effectiveStatus,
      record.verifiedStatus,
      record.contentScope
    ].join(' ').toLocaleLowerCase().includes(needle);
  });
};

export const summariseAudit = (routesPayload, records) => ({
  routes: Array.isArray(routesPayload?.routes)
    ? routesPayload.routes.length
    : 0,
  audited: records.length,
  mismatches: records.filter(record => record.mismatch).length,
  aligned: records.filter(record => record.aligned).length,
  excluded: records.filter(record => record.readingExcluded).length,
  overrides: Number(
    routesPayload?.effectiveRegistryDiagnostics?.appliedCount
  ) || 0
});

const fetchJson = async (path, fetcher = globalThis.fetch) => {
  if (typeof fetcher !== 'function') {
    throw new Error('Fetch API unavailable');
  }
  const response = await fetcher(path, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};

export const verifyPageEvidence = async (
  record,
  fetcher = globalThis.fetch
) => {
  const route = normaliseRoutePath(record?.route);
  if (!route || typeof fetcher !== 'function') {
    return {
      route,
      available: false,
      markerFound: false,
      robotsFound: false,
      error: 'Invalid route or Fetch API unavailable'
    };
  }
  try {
    const response = await fetcher(route, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {'Accept': 'text/html'}
    });
    const text = await response.text();
    const marker = String(record?.evidenceMarker || '');
    const robots = String(record?.pageRobots || '');
    const escaped = robots.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return {
      route,
      available: response.ok,
      status: response.status,
      markerFound: Boolean(marker) && text.includes(marker),
      robotsFound: Boolean(robots) && new RegExp(
        `<meta\\s+name=["']robots["']\\s+content=["']${escaped}["']`,
        'i'
      ).test(text),
      error: response.ok ? '' : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      route,
      available: false,
      markerFound: false,
      robotsFound: false,
      error: String(error?.message || error)
    };
  }
};

export const verifyAllPageEvidence = async (
  records,
  fetcher = globalThis.fetch,
  concurrency = 4
) => {
  const source = Array.isArray(records) ? records : [];
  const results = new Array(source.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < source.length) {
      const index = cursor++;
      results[index] = await verifyPageEvidence(source[index], fetcher);
    }
  };
  await Promise.all(
    Array.from(
      {length: Math.max(1, Math.min(concurrency, source.length || 1))},
      () => worker()
    )
  );
  return results;
};

const text = (parent, tag, value, className) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = String(value ?? '');
  parent.appendChild(node);
  return node;
};

const pill = (parent, value) =>
  text(parent, 'span', value, 'pill');

const fact = (list, term, detail) => {
  const row = document.createElement('div');
  row.className = 'content-status-fact';
  text(row, 'dt', term);
  text(row, 'dd', detail);
  list.appendChild(row);
};

const renderCounts = (host, counts) => {
  host.replaceChildren();
  counts.forEach(item => {
    const article = document.createElement('article');
    article.className = 'content-status-count';
    text(article, 'strong', item.count);
    text(article, 'code', item.status);
    host.appendChild(article);
  });
};

const renderRecord = (record, evidence) => {
  const article = document.createElement('article');
  article.className =
    `card content-status-record ${record.mismatch ? 'is-mismatch' : 'is-aligned'}`;

  const primary = document.createElement('div');
  const labels = document.createElement('div');
  labels.className = 'content-status-labels';
  pill(labels, record.mismatch ? 'Effective conflict' : 'Aligned');
  pill(
    labels,
    record.readingExcluded
      ? 'Excluded from reading'
      : 'Bounded reading eligible'
  );
  if (record.overrideApplied) pill(labels, 'Explicit override applied');
  primary.appendChild(labels);

  text(
    primary,
    'h3',
    record.titleTa || record.titleEn || record.route
  );
  if (record.titleTa && record.titleEn) {
    text(primary, 'p', record.titleEn, 'content-status-title-en');
  }
  text(primary, 'p', record.contentScope || '');

  const comparison = document.createElement('div');
  comparison.className = 'content-status-comparison';
  const previous = document.createElement('div');
  previous.className = 'content-status-state';
  text(previous, 'span', 'Historical route status');
  text(previous, 'strong', record.previousStatus);
  comparison.appendChild(previous);
  text(comparison, 'span', '→', 'content-status-arrow');
  const effective = document.createElement('div');
  effective.className = 'content-status-state';
  text(effective, 'span', 'Effective canonical status');
  text(effective, 'strong', record.effectiveStatus);
  comparison.appendChild(effective);
  primary.appendChild(comparison);

  const actions = document.createElement('div');
  actions.className = 'content-status-actions';
  const open = document.createElement('a');
  open.className = 'btn';
  open.href = record.route;
  open.textContent = 'Open audited page';
  actions.appendChild(open);
  if (record.sourceDataPath) {
    const source = document.createElement('a');
    source.className = 'btn secondary';
    source.href = record.sourceDataPath;
    source.textContent = 'Open source data';
    actions.appendChild(source);
  }
  primary.appendChild(actions);
  article.appendChild(primary);

  const facts = document.createElement('dl');
  facts.className = 'content-status-facts';
  fact(facts, 'Route', record.route);
  fact(facts, 'Verified status', record.verifiedStatus);
  fact(
    facts,
    'Complete text',
    record.fullTextPublished ? 'Published' : 'Not claimed'
  );
  fact(facts, 'Robots declaration', record.pageRobots || 'Not declared');
  fact(
    facts,
    'Page reachable',
    evidence?.available ? `Yes · HTTP ${evidence.status}` : 'Unavailable'
  );
  fact(
    facts,
    'Boundary marker',
    evidence?.markerFound ? 'Confirmed' : 'Not confirmed'
  );
  fact(
    facts,
    'Robots marker',
    evidence?.robotsFound ? 'Confirmed' : 'Not confirmed'
  );
  if (evidence?.error) {
    text(facts, 'p', evidence.error, 'content-status-evidence');
  }
  article.appendChild(facts);
  return article;
};

export const initialiseContentStatusAudit = async ({
  documentRef = globalThis.document,
  fetcher = globalThis.fetch
} = {}) => {
  if (!documentRef) return false;
  const message = documentRef.getElementById('contentStatusMessage');
  const countsHost = documentRef.getElementById('contentStatusCounts');
  const auditHost = documentRef.getElementById('contentStatusAudit');
  const state = documentRef.getElementById('contentStatusFilter');
  const search = documentRef.getElementById('contentStatusSearch');
  const refresh = documentRef.getElementById('contentStatusRefresh');
  const visible = documentRef.getElementById('contentStatusVisible');
  if (
    !message || !countsHost || !auditHost ||
    !state || !search || !refresh || !visible
  ) return false;

  let evaluated = [];
  let evidenceMap = new Map();

  const render = () => {
    const filtered = filterBoundaryRecords(evaluated, {
      state: state.value,
      query: search.value
    });
    auditHost.replaceChildren();
    if (!filtered.length) {
      const empty = documentRef.createElement('article');
      empty.className = 'card';
      text(empty, 'h3', 'No audited record matches');
      text(empty, 'p', 'Change the audit-state filter or search.');
      auditHost.appendChild(empty);
    } else {
      filtered.forEach(record => {
        auditHost.appendChild(
          renderRecord(record, evidenceMap.get(record.route))
        );
      });
    }
    visible.textContent = `${filtered.length} shown`;
  };

  const run = async () => {
    refresh.disabled = true;
    message.textContent =
      'Loading the explicit effective route registry…';
    try {
      const [config, routes, boundaries] = await Promise.all([
        fetchJson(CONFIG_PATH, fetcher),
        loadEffectiveRouteRegistry({fetcher, cache: false}),
        fetchJson(BOUNDARIES_PATH, fetcher)
      ]);
      if (!Array.isArray(boundaries.records)) {
        throw new Error('Publication boundary records are unavailable');
      }
      const routeMap = buildRouteMap(routes);
      evaluated = boundaries.records.map(record =>
        evaluateBoundary(
          record,
          routeMap.get(normaliseRoutePath(record.route))
        )
      );
      renderCounts(countsHost, buildStatusCounts(routes));
      const summary = summariseAudit(routes, evaluated);
      const metrics = {
        contentStatusRoutes: summary.routes,
        contentStatusAudited: summary.audited,
        contentStatusMismatch: summary.mismatches,
        contentStatusExcluded: summary.excluded
      };
      Object.entries(metrics).forEach(([id, value]) => {
        const element = documentRef.getElementById(id);
        if (element) element.textContent = String(value);
      });
      message.textContent =
        `${registryStatusMessage(routes)} ${summary.mismatches} effective conflict${summary.mismatches === 1 ? '' : 's'} remain. Checking page evidence…`;
      render();

      const evidence = await verifyAllPageEvidence(
        boundaries.records,
        fetcher
      );
      evidenceMap = new Map(
        evidence.map(item => [item.route, item])
      );
      const confirmed = evidence.filter(
        item => item.available && item.markerFound && item.robotsFound
      ).length;
      message.textContent =
        `Audit ready: ${summary.audited} records, ${summary.overrides} explicit overrides, ${summary.mismatches} conflicts, ${confirmed}/${evidence.length} page declarations confirmed.`;
      render();
      documentRef.documentElement.dataset.contentStatusRelease =
        String(RELEASE);
      documentRef.documentElement.dataset.consumerRelease =
        String(CONSUMER_RELEASE);
      documentRef.documentElement.dataset.contentStatusConfigRelease =
        String(config.release || '');
      return true;
    } catch (error) {
      console.warn(
        '[OmSaravanaBhava] Content status audit unavailable',
        error
      );
      message.textContent =
        `Content status audit unavailable: ${String(error?.message || error)}`;
      return false;
    } finally {
      refresh.disabled = false;
    }
  };

  state.addEventListener('change', render);
  search.addEventListener('input', render);
  refresh.addEventListener('click', run);
  return run();
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => initialiseContentStatusAudit(),
      {once: true}
    );
  } else {
    initialiseContentStatusAudit();
  }
}
