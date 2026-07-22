(() => {
  'use strict';

  const normalisePath = value => {
    try {
      const decoded = decodeURIComponent(value || '/');
      const clean = decoded.replace(/\/{2,}/g, '/');
      return clean === '/index.html' ? '/' : clean;
    } catch {
      return value || '/';
    }
  };

  const fetchJson = async path => {
    const response = await fetch(path, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {'Accept': 'application/json'}
    });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  };

  const tokensFor = value => normalisePath(value)
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(token => token.length > 1 && !['html', 'htm', 'www'].includes(token));

  const appendText = (parent, tag, text, className) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  };

  const makeSuggestionCard = route => {
    const article = document.createElement('article');
    article.className = 'card';
    appendText(article, 'span', route.category || 'Route', 'pill');
    if (route.status) appendText(article, 'span', route.status, 'pill');
    const heading = appendText(
      article,
      'h3',
      route.titleTa ? `${route.titleTa} · ${route.titleEn || ''}` : route.titleEn || route.path
    );
    if (route.summary) appendText(article, 'p', route.summary);
    const link = document.createElement('a');
    link.className = 'btn secondary';
    link.href = route.path;
    link.textContent = 'Open suggested route';
    link.setAttribute('aria-label', `Open ${heading.textContent}`);
    article.appendChild(link);
    return article;
  };

  const rankRoutes = (routes, currentPath) => {
    const pathTokens = tokensFor(currentPath);
    const pathSegments = new Set(tokensFor(currentPath.replace(/\.[^.]+$/, '')));
    const current = normalisePath(currentPath).replace(/\/+$/, '') || '/';
    return routes
      .filter(route => route && route.path && route.path !== '/404.html')
      .filter(route => (normalisePath(route.path).replace(/\/+$/, '') || '/') !== current)
      .map(route => {
        const title = `${route.titleTa || ''} ${route.titleEn || ''}`.toLocaleLowerCase();
        const category = String(route.category || '').toLocaleLowerCase();
        const summary = String(route.summary || '').toLocaleLowerCase();
        const routePath = normalisePath(route.path).toLocaleLowerCase();
        let score = 0;
        for (const token of pathTokens) {
          if (routePath.includes(token)) score += 8;
          if (title.includes(token)) score += 6;
          if (category.includes(token)) score += 4;
          if (summary.includes(token)) score += 2;
          if (pathSegments.has(token) && tokensFor(route.path).includes(token)) score += 4;
        }
        if (['published', 'published-source-linked', 'partial-reviewed', 'navigation'].includes(route.status)) score += 1;
        return {...route, score};
      })
      .sort((a, b) =>
        b.score - a.score ||
        String    const searchInput = document.getElementById('recoverySearch');
    const status = document.getElementById('suggestionStatus');
    const grid = document.getElementById('suggestionGrid');\ };

  const fallbackPaths = [
    '/site-directory.html',
    '/platform-hub.html',
    '/murugan-song-library.html',
    '/temple-encyclopedia.html',
    '/sloka-library.html',
    '/thiruppugazh.html',
    '/ai-search.html'
  ];

  const applyExactAlias = async currentPath => {
    try {
      const payload = await fetchJson('data/route-aliases.json');
      const records = Array.isArray(payload.records) ? payload.records : [];
      const match = records.find(record => normalisePath(record.path) === currentPath);
      const target = normalisePath(match?.target || '');
      if (!target || target === currentPath) return false;
      const notice = document.getElementById('suggestionStatus');
      if (notice) notice.textContent = `Verifieding to ${exactAlias.target}`;
        const destination = new URL(exactAlias.target, location.origin);
        destination.search = location.search;
        destination.hash = location.hash;
        location.replace(destination.href);
        return;
      }

      const historicalRoutes = Array.isArray(historical) ? historical : historical.routes;
      const additionsRoutes = Array.isArray(additions.records) ? additions.records : [];
      if (!Array.isArray(historicalRoutes)) throw new Error('Route directory  const loadGovernedRoutes = async () => {
    try {
      const module = await import('./effective-route-registry.mjs');
      const registry = await module.loadEffectiveRouteRegistry();
      return Array.isArray(registry.routes) ? registry.routes : [];
    } catch (error) {
      console.warn('[OmSaravanaBhava] Effective registry unavailable for 404', error);
      const payload = await fetchJson('data/site-routes.json');
      return Array.isArray(payload) ? payload : payload.routes || [];
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const currentPath = normalisePath(location.pathname);
    const pathElement = document.getElementById('requestedPath');
    const searchInput = document.getElementById('recoverySearch');
    const status = document.getElementById('suggestionStatus');
    const grid = document.getElementById('suggestionGrid');
    if (pathElement) pathElement.textContent = currentPath;
    if (searchInput) searchInput.value = tokensFor(currentPath).slice(0, 4).join(' ');
    if (!status || !grid) return;

    if (await applyExactAlias(currentPath)) return;

    try {
      const routes = await loadGovernedRoutes();
      const ranked = rankRoutes(routes, currentPath);
      const positive = ranked.filter(route => route.score > 0);
      const selected = (positive.length ? positive : fallbackPaths
        .map(path => ranked.find(route => normalisePath(route.path) === path))
        .filter(Boolean))
        .slice(0, 6);

      grid.replaceChildren();
      selected.forEach(route => grid.appendChild(makeSuggestionCard(route)));
      grid.setAttribute('aria-busy', 'false');
      if (selected.length) {
        status.textContent = positive.length
          ? `${selected.length} related governed route suggestion${selected.length === 1 ? '' : 's'} found.`
          : 'No exact alias or close route match was found. Showing reliable recovery routes.';
      } else {
        appendText(grid, 'div', 'Open the complete site directory or return home.', 'card');
        status.textContent = 'No route suggestions were available.';
      }
    } catch (error) {
      console.error('[OmSaravanaBhava] Smart 404 recovery failed', error);
      grid.replaceChildren();
      const fallback = document.createElement('div');
      fallback.className = 'card';
      appendText(fallback, 'h3', 'Route suggestions are temporarily unavailable');
      const paragraph = appendText(fallback, 'p', 'Use the complete site directory to continue.');
      const link = document.createElement('a');
      link.className = 'btn secondary';
      link.href = 'site-directory.html';
      link.textContent = 'Open site directory';
      paragraph.after(link);
      grid.appendChild(fallback);
      grid.setAttribute('aria-busy', 'false');
      status.textContent = 'Local route suggestions could not be loaded.';
    }
  });
})();
