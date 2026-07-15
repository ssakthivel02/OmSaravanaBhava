(() => {
  'use strict';

  const RELEASE = 231;
  const ROUTES_PATH = '/data/site-routes.json';
  const BOUNDARIES_PATH = '/data/publication-boundaries.json';
  const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

  const normaliseRoute = value => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    try {
      const base = globalThis.location?.origin || CANONICAL_ORIGIN;
      const url = new URL(raw, `${base}/`);
      return url.origin === base ? url.pathname : '';
    } catch {
      return '';
    }
  };

  const buildBoundaryMap = payload => new Map(
    (Array.isArray(payload?.records) ? payload.records : [])
      .map(record => [normaliseRoute(record?.route), record])
      .filter(([route]) => route)
  );

  const applyCanonicalStatuses = (routesPayload, boundariesPayload) => {
    const source = routesPayload && typeof routesPayload === 'object'
      ? routesPayload
      : {};
    const boundaries = buildBoundaryMap(boundariesPayload);
    let reconciledCount = 0;
    const routes = (Array.isArray(source.routes) ? source.routes : [])
      .map(record => {
        if (!record || typeof record !== 'object') return record;
        const path = normaliseRoute(record.path);
        const boundary = boundaries.get(path);
        if (!boundary) return {...record};
        reconciledCount += 1;
        return {
          ...record,
          status: String(boundary.verifiedStatus || record.status || ''),
          summary: String(boundary.contentScope || record.summary || ''),
          publicationStatusPrevious: String(
            boundary.declaredRouteStatus || record.status || ''
          ),
          publicationStatusCanonical: String(
            boundary.verifiedStatus || record.status || ''
          ),
          publicationStatusSource: BOUNDARIES_PATH,
          publicationBoundaryRelease: Number(
            boundariesPayload?.release
          ) || 0,
          readingEligible: boundary.readingEligible !== false
        };
      });
    return {
      ...source,
      effectiveRelease: RELEASE,
      publicationStatusRelease: Number(boundariesPayload?.release) || 0,
      reconciliation: {
        release: RELEASE,
        source: BOUNDARIES_PATH,
        reconciledCount,
        historicalRegistryPreserved: true
      },
      routes
    };
  };

  const shouldReconcileRequest = input => {
    try {
      const raw = typeof input === 'string' || input instanceof URL
        ? String(input)
        : String(input?.url || '');
      const base = globalThis.location?.origin || CANONICAL_ORIGIN;
      const url = new URL(raw, `${base}/`);
      return url.origin === base && url.pathname === ROUTES_PATH;
    } catch {
      return false;
    }
  };

  const transitionLabel = record => {
    const previous = String(record?.declaredRouteStatus || '').trim();
    const canonical = String(record?.verifiedStatus || '').trim();
    if (!canonical) return '';
    return previous && previous !== canonical
      ? `${previous} → ${canonical}`
      : canonical;
  };

  const api = Object.freeze({
    RELEASE,
    ROUTES_PATH,
    BOUNDARIES_PATH,
    CANONICAL_ORIGIN,
    normaliseRoute,
    buildBoundaryMap,
    applyCanonicalStatuses,
    shouldReconcileRequest,
    transitionLabel
  });
  globalThis.OSBRouteStatusPolicy = api;

  if (typeof window === 'undefined' || typeof globalThis.fetch !== 'function') {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  const boundaryPromise = originalFetch(BOUNDARIES_PATH, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  }).then(response => {
    if (!response.ok) {
      throw new Error(`${BOUNDARIES_PATH}: HTTP ${response.status}`);
    }
    return response.json();
  });

  globalThis.fetch = async (input, init) => {
    if (!shouldReconcileRequest(input)) {
      return originalFetch(input, init);
    }
    const response = await originalFetch(input, init);
    if (!response.ok) return response;
    try {
      const [routesPayload, boundariesPayload] = await Promise.all([
        response.clone().json(),
        boundaryPromise
      ]);
      if (Number(boundariesPayload?.release) !== RELEASE) {
        throw new Error('Publication boundary release identity mismatch');
      }
      const effective = applyCanonicalStatuses(
        routesPayload,
        boundariesPayload
      );
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.set('content-type', 'application/json; charset=utf-8');
      headers.set('x-osb-publication-status-release', String(RELEASE));
      return new Response(
        `${JSON.stringify(effective, null, 2)}\n`,
        {
          status: response.status,
          statusText: response.statusText,
          headers
        }
      );
    } catch (error) {
      console.warn(
        '[OmSaravanaBhava] Canonical publication status unavailable',
        error
      );
      document.documentElement.dataset.routeStatusPolicy = 'fallback';
      return response;
    }
  };

  const annotateCards = boundaryMap => {
    const selectors = [
      '#discoveryResults article',
      '#routeGrid article',
      '#contentStatusAudit article'
    ];
    document.querySelectorAll(selectors.join(','))
      .forEach(article => {
        if (article.dataset.routeStatusAnnotated === 'true') return;
        const routeLink = [...article.querySelectorAll('a[href]')]
          .find(link => {
            const path = normaliseRoute(link.getAttribute('href'));
            return boundaryMap.has(path);
          });
        if (!routeLink) return;
        const route = normaliseRoute(routeLink.getAttribute('href'));
        const boundary = boundaryMap.get(route);
        const host = article.querySelector(
          '.discovery-route-meta, .route-meta, .content-status-labels'
        );
        if (!host || !boundary) return;
        const badge = document.createElement('span');
        badge.className = 'pill route-status-reconciled';
        badge.textContent = `Canonical: ${boundary.verifiedStatus}`;
        badge.title = `Publication status ${transitionLabel(boundary)}`;
        badge.setAttribute(
          'aria-label',
          `Canonical publication status ${boundary.verifiedStatus}`
        );
        host.appendChild(badge);
        article.dataset.routeStatusAnnotated = 'true';
        article.dataset.canonicalPublicationStatus =
          String(boundary.verifiedStatus || '');
      });
  };

  const initialiseAnnotations = async () => {
    try {
      const payload = await boundaryPromise;
      const boundaryMap = buildBoundaryMap(payload);
      const render = () => annotateCards(boundaryMap);
      render();
      const observer = new MutationObserver(render);
      observer.observe(document.body, {childList: true, subtree: true});
      document.documentElement.dataset.routeStatusPolicy = 'ready';
      document.documentElement.dataset.routeStatusRelease = String(RELEASE);
      globalThis.dispatchEvent(new CustomEvent(
        'osb:publication-status-ready',
        {detail: {release: RELEASE, records: boundaryMap.size}}
      ));
    } catch (error) {
      console.warn(
        '[OmSaravanaBhava] Publication status annotations unavailable',
        error
      );
      document.documentElement.dataset.routeStatusPolicy = 'fallback';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initialiseAnnotations,
      {once: true}
    );
  } else {
    initialiseAnnotations();
  }
})();
