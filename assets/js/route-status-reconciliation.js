(() => {
  'use strict';

  const RELEASE = 238;
  const OVERRIDES_PATH = '/data/site-routes-effective-overrides.json';
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

  const buildOverrideMap = payload => new Map(
    (Array.isArray(payload?.records) ? payload.records : [])
      .map(record => [normaliseRoute(record?.path), record])
      .filter(([path]) => path)
  );

  const transitionLabel = record => {
    const previous = String(
      record?.publicationStatusPrevious || ''
    ).trim();
    const canonical = String(
      record?.publicationStatusCanonical ||
      record?.status ||
      ''
    ).trim();
    if (!canonical) return '';
    return previous && previous !== canonical
      ? `${previous} → ${canonical}`
      : canonical;
  };

  const annotateCards = overrideMap => {
    const selectors = [
      '#discoveryResults article',
      '#routeGrid article',
      '#contentStatusAudit article'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(article => {
      if (article.dataset.routeStatusAnnotated === 'true') return;
      const routeLink = [...article.querySelectorAll('a[href]')]
        .find(link => overrideMap.has(
          normaliseRoute(link.getAttribute('href'))
        ));
      if (!routeLink) return;
      const route = normaliseRoute(routeLink.getAttribute('href'));
      const override = overrideMap.get(route);
      const host = article.querySelector(
        '.discovery-route-meta, .route-meta, .content-status-labels'
      );
      if (!host || !override) return;
      const badge = document.createElement('span');
      badge.className = 'pill route-status-reconciled';
      badge.textContent = `Canonical: ${override.status}`;
      badge.title = `Publication status ${transitionLabel(override)}`;
      host.appendChild(badge);
      article.dataset.routeStatusAnnotated = 'true';
      article.dataset.canonicalPublicationStatus =
        String(override.status || '');
    });
  };

  const loadOverrides = async (
    fetcher = globalThis.fetch
  ) => {
    if (typeof fetcher !== 'function') {
      throw new Error('Fetch API unavailable');
    }
    const response = await fetcher(OVERRIDES_PATH, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {'Accept': 'application/json'}
    });
    if (!response.ok) {
      throw new Error(`${OVERRIDES_PATH}: HTTP ${response.status}`);
    }
    return response.json();
  };

  const api = Object.freeze({
    RELEASE,
    OVERRIDES_PATH,
    CANONICAL_ORIGIN,
    normaliseRoute,
    buildOverrideMap,
    transitionLabel,
    annotateCards,
    loadOverrides
  });
  globalThis.OSBRouteStatusPolicy = api;

  if (typeof document === 'undefined') return;

  const initialise = async () => {
    try {
      const payload = await loadOverrides();
      const overrideMap = buildOverrideMap(payload);
      const render = () => annotateCards(overrideMap);
      render();
      const observer = new MutationObserver(render);
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      document.documentElement.dataset.routeStatusPolicy = 'ready';
      document.documentElement.dataset.routeStatusRelease =
        String(RELEASE);
      globalThis.dispatchEvent(new CustomEvent(
        'osb:route-status-annotations-ready',
        {
          detail: {
            release: RELEASE,
            records: overrideMap.size,
            globalFetchReplaced: false
          }
        }
      ));
    } catch (error) {
      console.warn(
        '[OmSaravanaBhava] Route status annotations unavailable',
        error
      );
      document.documentElement.dataset.routeStatusPolicy = 'fallback';
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, {
      once: true
    });
  } else {
    initialise();
  }
})();
