
export const fetchJson = async path => {
  const url = new URL(path, window.location.origin);
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'omit',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};
export const loadOperationsData = async () => {
  const paths = {
    summary: '/data/operations/summary.json',
    routes: '/data/operations/route-health.json',
    pwa: '/data/operations/pwa-health.json',
    attestation: '/data/operations/deployment-attestation.json',
    catalog: '/data/operations/check-catalog.json',
    liveRoutes: '/data/site-routes.json'
  };
  const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await fetchJson(path)]));
  return Object.fromEntries(entries);
};
