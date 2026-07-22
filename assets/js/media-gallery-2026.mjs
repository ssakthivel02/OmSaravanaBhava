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

const card = item => {
  const article = create('article', 'media-card');
  article.setAttribute('data-spotlight', '');
  const image = create('img');
  image.src = item.asset;
  image.alt = item.alt || item.titleEn || '';
  image.loading = 'lazy';
  image.decoding = 'async';
  const body = create('div', 'media-card-body');
  const pills = create('div', 'premium-pills');
  [item.category, item.mediaType, item.documentaryPhoto ? 'Documentary photo' : 'Not documentary photography']
    .filter(Boolean)
    .forEach(value => pills.appendChild(create('span', 'premium-pill', value.replaceAll('-', ' '))));
  const actions = create('div', 'premium-actions');
  const link = create('a', 'premium-button secondary', 'Open related module');
  link.href = item.relatedRoute || 'platform-hub.html';
  actions.appendChild(link);
  body.append(
    pills,
    create('h3', '', item.titleTa ? `${item.titleTa} · ${item.titleEn || ''}` : item.titleEn || item.id),
    create('p', '', `Provenance: ${String(item.sourceType || 'not recorded').replaceAll('-', ' ')}. Rights status: ${String(item.rightsStatus || 'review required').replaceAll('-', ' ')}.`),
    actions
  );
  article.append(image, body);
  return article;
};

const initialise = async () => {
  const grid = byId('mediaGrid');
  const status = byId('mediaStatus');
  const query = byId('mediaQuery');
  const category = byId('mediaCategory');
  const type = byId('mediaType');
  const clear = byId('mediaClear');
  const count = byId('mediaCount');
  if (!grid || !status || !query || !category || !type || !clear || !count) return;
  try {
    const payload = await fetchJson('/data/media-gallery.json');
    const items = Array.isArray(payload.items) ? payload.items : [];
    [...new Set(items.map(item => item.category).filter(Boolean))].sort()
      .forEach(value => category.add(new Option(value, value)));
    [...new Set(items.map(item => item.mediaType).filter(Boolean))].sort()
      .forEach(value => type.add(new Option(value.replaceAll('-', ' '), value)));
    const state = {query: '', category: 'All', type: 'All'};
    const render = () => {
      const needle = state.query.trim().toLocaleLowerCase();
      const filtered = items.filter(item => {
        const text = [item.id, item.titleTa, item.titleEn, item.category, item.mediaType, item.alt]
          .filter(Boolean).join(' ').toLocaleLowerCase();
        return (!needle || text.includes(needle)) &&
          (state.category === 'All' || item.category === state.category) &&
          (state.type === 'All' || item.mediaType === state.type);
      });
      grid.replaceChildren();
      if (!filtered.length) {
        grid.appendChild(create('article', 'premium-card', 'No governed media item matched this filter.'));
      } else {
        filtered.forEach(item => grid.appendChild(card(item)));
      }
      count.textContent = String(items.length);
      status.textContent = `${filtered.length} of ${items.length} provenance-labelled media items shown.`;
    };
    query.addEventListener('input', event => { state.query = event.target.value; render(); });
    category.addEventListener('change', event => { state.category = event.target.value; render(); });
    type.addEventListener('change', event => { state.type = event.target.value; render(); });
    clear.addEventListener('click', () => {
      state.query = '';
      state.category = 'All';
      state.type = 'All';
      query.value = '';
      category.value = 'All';
      type.value = 'All';
      render();
      query.focus();
    });
    render();
    document.documentElement.dataset.mediaGalleryRelease = String(RELEASE);
  } catch (error) {
    console.error(error);
    status.textContent = 'The governed media registry could not be loaded.';
    grid.innerHTML = '<article class="premium-card" role="alert">Media evidence is temporarily unavailable. Temple and devotional modules remain available.</article>';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialise, {once: true});
} else {
  initialise();
}
