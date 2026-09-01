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

const card = item => {
  const article = create('article', 'premium-card');
  const pills = create('div', 'premium-pills');
  pills.append(
    create('span', 'premium-pill', item.category || 'Capability'),
    create('span', 'premium-pill', String(item.status || '').replaceAll('-', ' '))
  );
  const routes = create('div', 'premium-pills');
  (item.existingFiles || []).forEach(path => {
    const link = create('a', 'premium-pill', path);
    link.href = path;
    routes.appendChild(link);
  });
  article.append(
    pills,
    create('h3', '', item.title || item.id),
    create('p', '', item.nextAction || ''),
    routes
  );
  return article;
};

const initialise = async () => {
  const metrics = byId('roadmapMetrics');
  const grid = byId('roadmapGrid');
  const status = byId('roadmapStatus');
  const query = byId('roadmapQuery');
  const filter = byId('roadmapFilter');
  const clear = byId('roadmapClear');
  if (!metrics || !grid || !status || !query || !filter || !clear) return;
  try {
    const data = await fetchJson('/data/platform-capability-matrix.json');
    const records = Array.isArray(data.records) ? data.records : [];
    const counts = data.statusCounts || {};
    metrics.replaceChildren(
      metric(data.capabilityCount || records.length, 'Capabilities audited'),
      metric(counts.connected || 0, 'Connected'),
      metric(counts['exists-not-governed'] || 0, 'Existing but ungoverned'),
      metric(counts['missing-capability-route'] || 0, 'Missing capability routes')
    );
    [...new Set(records.map(item => item.status).filter(Boolean))]
      .sort()
      .forEach(value => filter.add(new Option(value.replaceAll('-', ' '), value)));
    const state = {query: '', filter: 'All'};
    const render = () => {
      const needle = state.query.trim().toLocaleLowerCase();
      const filtered = records.filter(item => {
        const text = [item.id, item.title, item.category, item.status, item.nextAction]
          .filter(Boolean).join(' ').toLocaleLowerCase();
        return (!needle || text.includes(needle)) &&
          (state.filter === 'All' || item.status === state.filter);
      });
      grid.replaceChildren();
      if (!filtered.length) {
        grid.appendChild(create('article', 'premium-card', 'No capability matched this filter.'));
      } else {
        filtered.forEach(item => grid.appendChild(card(item)));
      }
      status.textContent = `${filtered.length} of ${records.length} planned capabilities shown.`;
    };
    query.addEventListener('input', event => {
      state.query = event.target.value;
      render();
    });
    filter.addEventListener('change', event => {
      state.filter = event.target.value;
      render();
    });
    clear.addEventListener('click', () => {
      state.query = '';
      state.filter = 'All';
      query.value = '';
      filter.value = 'All';
      render();
      query.focus();
    });
    render();
    document.documentElement.dataset.platformRoadmapRelease = String(RELEASE);
  } catch (error) {
    console.error(error);
    status.textContent = 'Capability matrix is still being generated. Existing routes remain available through the Platform Hub.';
    grid.innerHTML = '<article class="premium-card" role="alert">Capability evidence is temporarily unavailable.</article>';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialise, {once: true});
} else {
  initialise();
}
