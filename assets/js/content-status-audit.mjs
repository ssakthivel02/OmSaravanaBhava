export const RELEASE = 231;
export const CONFIG_PATH = '/data/content-status.json';
export const ROUTES_PATH = '/data/site-routes.json';
export const BOUNDARIES_PATH = '/data/publication-boundaries.json';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

export const normaliseRoute = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, `${CANONICAL_ORIGIN}/`);
    return url.origin === CANONICAL_ORIGIN ? url.pathname : '';
  } catch {
    return '';
  }
};

export const buildStatusCounts = routesPayload => {
  const counts = new Map();
  const routes = Array.isArray(routesPayload?.routes)
    ? routesPayload.routes
    : [];
  routes.forEach(record => {
    if (!record || typeof record !== 'object') return;
    const status = String(record.status ?? 'unspecified').trim() ||
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
    .map(record => [normaliseRoute(record.path), record])
    .filter(([route]) => route)
);

export const evaluateBoundary = (record, routeRecord) => {
  const declared = String(routeRecord?.status ?? '').trim();
  const expectedDeclared = String(
    record?.declaredRouteStatus ?? ''
  ).trim();
  const verified = String(record?.verifiedStatus ?? '').trim();
  const route = normaliseRoute(record?.route);
  return {
    ...record,
    route,
    routePresent: Boolean(routeRecord),
    declaredStatus: declared || 'missing',
    declaredStatusExpected: expectedDeclared,
    verifiedStatus: verified,
    declaredMatchesSnapshot:
      Boolean(routeRecord) && declared === expectedDeclared,
    aligned:
      Boolean(routeRecord) && declared === verified,
    mismatch:
      !routeRecord || declared !== verified,
    readingExcluded: record?.readingEligible === false
  };
};

export const applyPublicationBoundaries = (
  routes,
  boundariesPayload
) => {
  const records = Array.isArray(boundariesPayload?.records)
    ? boundariesPayload.records
    : [];
  const map = new Map(
    records
      .map(record => [normaliseRoute(record.route), record])
      .filter(([route]) => route)
  );
  return (Array.isArray(routes) ? routes : [])
    .filter(route => {
      const boundary = map.get(normaliseRoute(route.path));
      return boundary?.readingEligible !== false;
    })
    .map(route => {
      const boundary = map.get(normaliseRoute(route.path));
      return boundary
        ? {
            ...route,
            status: boundary.verifiedStatus || route.status,
            publicationBoundary: boundary
          }
        : route;
    });
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
    const haystack = [
      record.titleTa,
      record.titleEn,
      record.route,
      record.declaredStatus,
      record.verifiedStatus,
      record.contentScope
    ].join(' ').toLocaleLowerCase();
    return haystack.includes(needle);
  });
};

export const summariseAudit = (routesPayload, evaluated) => {
  const records = Array.isArray(evaluated) ? evaluated : [];
  return {
    routes: Array.isArray(routesPayload?.routes)
      ? routesPayload.routes.length
      : 0,
    audited: records.length,
    mismatches: records.filter(record => record.mismatch).length,
    aligned: records.filter(record => record.aligned).length,
    excluded: records.filter(record => record.readingExcluded).length
  };
};

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
  const route = normaliseRoute(record?.route);
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
    const marker = String(record?.evidenceMarker ?? '');
    const robots = String(record?.pageRobots ?? '');
    return {
      route,
      available: response.ok,
      status: response.status,
      markerFound: Boolean(marker) && text.includes(marker),
      robotsFound:
        Boolean(robots) &&
        new RegExp(
          `<meta\\s+name=["']robots["']\\s+content=["']${robots.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          )}["']`,
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
  const items = Array.isArray(records) ? records : [];
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await verifyPageEvidence(
        items[index],
        fetcher
      );
    }
  };
  await Promise.all(
    Array.from(
      {length: Math.max(1, Math.min(concurrency, items.length || 1))},
      () => worker()
    )
  );
  return results;
};

const createText = (parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(text ?? '');
  parent.appendChild(element);
  return element;
};

const appendPill = (parent, text) =>
  createText(parent, 'span', text, 'pill');

const appendFact = (list, term, detail) => {
  const row = document.createElement('div');
  row.className = 'content-status-fact';
  createText(row, 'dt', term);
  createText(row, 'dd', detail);
  list.appendChild(row);
};

const renderCounts = (host, counts) => {
  host.replaceChildren();
  counts.forEach(item => {
    const article = document.createElement('article');
    article.className = 'content-status-count';
    createText(article, 'strong', item.count);
    createText(article, 'code', item.status);
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
  appendPill(labels, record.mismatch ? 'Registry mismatch' : 'Aligned');
  appendPill(
    labels,
    record.readingExcluded
      ? 'Excluded from reading'
      : 'Bounded reading eligible'
  );
  primary.appendChild(labels);

  createText(
    primary,
    'h3',
    record.titleTa || record.titleEn || record.route
  );
  if (record.titleTa && record.titleEn) {
    createText(
      primary,
      'p',
      record.titleEn,
      'content-status-title-en'
    );
  }
  createText(primary, 'p', record.contentScope || '');

  const comparison = document.createElement('div');
  comparison.className = 'content-status-comparison';
  const declared = document.createElement('div');
  declared.className = 'content-status-state';
  createText(declared, 'span', 'Effective route status');
  createText(declared, 'strong', record.declaredStatus);
  comparison.appendChild(declared);
  createText(comparison, 'span', '→', 'content-status-arrow');
  const verified = document.createElement('div');
  verified.className = 'content-status-state';
  createText(verified, 'span', 'Verified page scope');
  createText(verified, 'strong', record.verifiedStatus);
  comparison.appendChild(verified);
  primary.appendChild(comparison);

  const actions = document.createElement('div');
  actions.className = 'content-status-actions';
  const open = document.createElement('a');
  open.className = 'btn';
  open.href = record.route;
  open.textContent = 'Open audited page';
  actions.appendChild(open);
  const source = document.createElement('a');
  source.className = 'btn secondary';
  source.href = record.sourceDataPath;
  source.textContent = 'Open source data';
  actions.appendChild(source);
  primary.appendChild(actions);
  article.appendChild(primary);

  const facts = document.createElement('dl');
  facts.className = 'content-status-facts';
  appendFact(facts, 'Route', record.route);
  appendFact(
    facts,
    'Complete text',
    record.fullTextPublished ? 'Published' : 'Not claimed'
  );
  appendFact(facts, 'Robots declaration', record.pageRobots);
  appendFact(
    facts,
    'Page reachable',
    evidence?.available ? `Yes · HTTP ${evidence.status}` : 'Unavailable'
  );
  appendFact(
    facts,
    'Boundary marker',
    evidence?.markerFound ? 'Confirmed' : 'Not confirmed'
  );
  appendFact(
    facts,
    'Robots marker',
    evidence?.robotsFound ? 'Confirmed' : 'Not confirmed'
  );
  if (evidence?.error) {
    createText(
      facts,
      'p',
      evidence.error,
      'content-status-evidence'
    );
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
    !message ||
    !countsHost ||
    !auditHost ||
    !state ||
    !search ||
    !refresh ||
    !visible
  ) {
    return false;
  }

  let routesPayload;
  let boundaryPayload;
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
      createText(empty, 'h3', 'No audited record matches');
      createText(empty, 'p', 'Change the audit-state filter or search.');
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
    message.textContent = 'Loading route and publication-boundary registries…';
    try {
      const [config, routes, boundaries] = await Promise.all([
        fetchJson(CONFIG_PATH, fetcher),
        fetchJson(ROUTES_PATH, fetcher),
        fetchJson(BOUNDARIES_PATH, fetcher)
      ]);
      if (
        config.release !== RELEASE ||
        boundaries.release !== RELEASE
      ) {
        throw new Error('Release registry identity mismatch');
      }
      routesPayload = routes;
      boundaryPayload = boundaries;
      const routeMap = buildRouteMap(routesPayload);
      evaluated = boundaryPayload.records.map(record =>
        evaluateBoundary(record, routeMap.get(normaliseRoute(record.route)))
      );
      renderCounts(countsHost, buildStatusCounts(routesPayload));

      const summary = summariseAudit(routesPayload, evaluated);
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
        `Canonical registry loaded. ${summary.mismatches} effective conflict${summary.mismatches === 1 ? '' : 's'} remain. Checking same-origin evidence…`;
      render();

      const evidence = await verifyAllPageEvidence(
        boundaryPayload.records,
        fetcher
      );
      evidenceMap = new Map(
        evidence.map(item => [item.route, item])
      );
      const confirmed = evidence.filter(
        item => item.available && item.markerFound && item.robotsFound
      ).length;
      message.textContent =
        `Audit ready: ${summary.audited} records, ${summary.mismatches} effective conflicts, ${confirmed}/${evidence.length} page declarations confirmed in this request.`;
      render();
      documentRef.documentElement.dataset.contentStatusRelease =
        String(RELEASE);
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
