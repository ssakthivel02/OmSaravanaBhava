export const RELEASE = 246;

const byId = id => document.getElementById(id);
const create = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
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

const metric = (value, label) => {
  const article = create('article', 'premium-metric');
  article.append(create('strong', '', String(value)), create('span', '', label));
  return article;
};

const initialise = async () => {
  const metrics = byId('recoveryMetrics');
  const classes = byId('recoveryClasses');
  const status = byId('recoveryStatus');
  if (!metrics || !classes || !status) return;
  try {
    const data = await fetchJson('/data/route-recovery-summary.json');
    metrics.replaceChildren(
      metric(data.htmlFilesScanned || 0, 'HTML files classified'),
      metric(data.effectiveRegistryRoutes || 0, 'Governed routes'),
      metric(data.unresolvedReferencesFromCanonicalPages || 0, 'Canonical broken references'),
      metric(data.uniqueSafeRepairsOnCanonicalPages || 0, 'Unique safe repairs queued')
    );
    classes.replaceChildren();
    Object.entries(data.classificationCounts || {}).forEach(([name, count]) => {
      const article = create('article', 'premium-card');
      const pills = create('div', 'premium-pills');
      pills.appendChild(create('span', 'premium-pill', String(count)));
      article.append(
        pills,
        create('h3', '', name.replaceAll('-', ' ')),
        create('p', '', data.classificationDefinitions?.[name] || 'Controlled classification category.')
      );
      classes.appendChild(article);
    });
    status.textContent = `Phase D–E audit ready. ${data.runtimeAliasCount || 0} exact aliases are available; no bulk deletion or automatic mass replacement was performed.`;
    document.documentElement.dataset.routeRecoveryRelease = String(RELEASE);
  } catch (error) {
    console.error(error);
    status.textContent = 'Route recovery evidence is still being generated. No files have been deleted.';
    classes.innerHTML = '<article class="premium-card" role="alert">Recovery data is temporarily unavailable. Use the Complete Site Directory while the audit reruns.</article>';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialise, {once: true});
} else {
  initialise();
}
