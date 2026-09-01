import {isRouteSaved, saveReadingRecord} from './reading-list.mjs';

export const RELEASE = 216;

export const PUBLISHED_STATUSES = new Set([
  'published',
  'published-source-linked',
  'partial-reviewed',
  'reviewed-opening-extract',
  'source-register',
  'source-linked-sections-available'
]);

const STATUS_GROUPS = new Map([
  ['published', 'published'],
  ['published-source-linked', 'published'],
  ['partial-reviewed', 'bounded'],
  ['reviewed-opening-extract', 'bounded'],
  ['source-linked-sections-available', 'bounded'],
  ['source-register', 'register']
]);

export const normalise = value =>
  String(value ?? '').trim().toLocaleLowerCase();

export const normaliseRoutePath = route => {
  const value = String(route ?? '').trim();
  if (!value) return '';
  const path = value.split('#', 1)[0].split('?', 1)[0];
  return path.startsWith('/') ? path : `/${path}`;
};

export const publicationGroup = status =>
  STATUS_GROUPS.get(normalise(status)) || 'excluded';

export const isPublishedRecord = (record, routePaths) => {
  if (!record || typeof record !== 'object') return false;
  const status = normalise(record.status);
  const tags = Array.isArray(record.tags) ? record.tags.map(normalise) : [];
  const route = normaliseRoutePath(record.route);
  return PUBLISHED_STATUSES.has(status) &&
    !tags.includes('not-published') &&
    Boolean(route) &&
    routePaths.has(route);
};

export const buildFacetModel = (records, routePayload) => {
  const routes = Array.isArray(routePayload?.routes) ? routePayload.routes : [];
  const routePaths = new Set(routes.map(item => item?.path).filter(Boolean));
  const items = (Array.isArray(records) ? records : [])
    .filter(record => isPublishedRecord(record, routePaths))
    .map(record => ({
      ...record,
      kind: String(record.kind || 'Other').trim() || 'Other',
      statusGroup: publicationGroup(record.status)
    }))
    .sort((left, right) =>
      left.kind.localeCompare(right.kind, 'en') ||
      String(left.titleEn || left.titleTa || '').localeCompare(
        String(right.titleEn || right.titleTa || ''),
        'en'
      )
    );

  const counts = new Map();
  const statusCounts = new Map();
  items.forEach(item => {
    counts.set(item.kind, (counts.get(item.kind) || 0) + 1);
    statusCounts.set(item.statusGroup, (statusCounts.get(item.statusGroup) || 0) + 1);
  });

  return {
    items,
    total: items.length,
    kinds: [...counts.entries()].sort(([left], [right]) => left.localeCompare(right, 'en')),
    counts,
    statusCounts
  };
};

export const filterFacetRecords = (model, filters = {}) => {
  const query = normalise(filters.query);
  const terms = query.split(/\s+/).filter(Boolean);
  const selectedKind = String(filters.kind || 'All');
  const selectedStatus = String(filters.status || 'all');

  return model.items.filter(item => {
    if (selectedKind !== 'All' && item.kind !== selectedKind) return false;
    if (selectedStatus !== 'all' && item.statusGroup !== selectedStatus) return false;
    if (!terms.length) return true;
    const haystack = normalise([
      item.id,
      item.kind,
      item.titleTa,
      item.titleEn,
      item.summary,
      item.status,
      ...(Array.isArray(item.tags) ? item.tags : [])
    ].join(' '));
    return terms.every(term => haystack.includes(term));
  });
};

const createText = (parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
};

const loadJson = async path => {
  const response = await fetch(path, {
    cache: 'default',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
};

const resultCard = record => {
  const article = document.createElement('article');
  article.className = 'card facet-result';

  const labels = document.createElement('div');
  labels.className = 'facet-tags';
  createText(labels, 'span', record.kind, 'pill');
  createText(labels, 'span', record.status, 'pill');
  article.appendChild(labels);

  const title = record.titleTa && record.titleEn
    ? `${record.titleTa} · ${record.titleEn}`
    : record.titleTa || record.titleEn || record.id;
  createText(article, 'h2', title);
  createText(article, 'p', record.summary || 'Published local record.');

  if (Array.isArray(record.tags) && record.tags.length) {
    const tags = document.createElement('div');
    tags.className = 'facet-tags';
    record.tags.slice(0, 4).forEach(tag => createText(tags, 'span', tag, 'facet-tag'));
    article.appendChild(tags);
  }

  const actions = document.createElement('div');
  actions.className = 'facet-actions';

  const link = document.createElement('a');
  link.className = 'btn secondary';
  link.href = record.route;
  link.textContent = 'Open published route';
  actions.appendChild(link);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn secondary facet-save';
  const updateSaveState = () => {
    const saved = isRouteSaved(record.route);
    save.setAttribute('aria-pressed', String(saved));
    save.textContent = saved ? 'Saved to reading list' : 'Save to reading list';
  };
  save.addEventListener('click', () => {
    try {
      saveReadingRecord(record);
      updateSaveState();
    } catch (error) {
      console.error('[OmSaravanaBhava] Reading-list save failed', error);
      save.textContent = 'Browser storage unavailable';
      save.disabled = true;
    }
  });
  updateSaveState();
  actions.appendChild(save);

  article.appendChild(actions);
  return article;
};

const initialise = async () => {
  const total = document.getElementById('facetTotal');
  const typeTotal = document.getElementById('facetTypeTotal');
  const boundedTotal = document.getElementById('facetBoundedTotal');
  const form = document.getElementById('facetForm');
  const query = document.getElementById('facetQuery');
  const status = document.getElementById('facetStatus');
  const reset = document.getElementById('facetReset');
  const kinds = document.getElementById('facetKinds');
  const resultStatus = document.getElementById('facetResultStatus');
  const results = document.getElementById('facetResults');
  if (!total || !typeTotal || !boundedTotal || !form || !query || !status ||
      !reset || !kinds || !resultStatus || !results) return;

  const state = {kind: 'All'};
  try {
    const [records, routePayload] = await Promise.all([
      loadJson('data/search-index.json'),
      loadJson('data/site-routes.json')
    ]);
    const model = buildFacetModel(records, routePayload);
    total.textContent = String(model.total);
    typeTotal.textContent = String(model.kinds.length);
    boundedTotal.textContent = String(
      (model.statusCounts.get('bounded') || 0) +
      (model.statusCounts.get('register') || 0)
    );

    const renderKindButtons = () => {
      kinds.replaceChildren();
      const choices = [['All', model.total], ...model.kinds];
      choices.forEach(([kind, count]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'facet-kind';
        button.dataset.kind = kind;
        button.setAttribute('aria-pressed', String(state.kind === kind));
        button.append(document.createTextNode(kind));
        createText(button, 'span', String(count));
        button.addEventListener('click', () => {
          state.kind = kind;
          renderKindButtons();
          renderResults();
        });
        kinds.appendChild(button);
      });
    };

    const renderResults = () => {
      const filtered = filterFacetRecords(model, {
        query: query.value,
        kind: state.kind,
        status: status.value
      });
      results.replaceChildren();
      filtered.forEach(record => results.appendChild(resultCard(record)));
      if (!filtered.length) {
        const empty = document.createElement('article');
        empty.className = 'card facet-empty';
        createText(empty, 'h2', 'No published record matched');
        createText(empty, 'p', 'Clear one or more filters, or use the full local search.');
        results.appendChild(empty);
      }
      results.setAttribute('aria-busy', 'false');
      resultStatus.textContent =
        `${filtered.length} of ${model.total} published record${model.total === 1 ? '' : 's'} shown.`;
    };

    const params = new URLSearchParams(location.search);
    query.value = params.get('q') || '';
    const requestedStatus = params.get('status');
    if (['all', 'published', 'bounded', 'register'].includes(requestedStatus)) {
      status.value = requestedStatus;
    }
    const requestedKind = params.get('kind');
    if (requestedKind && (requestedKind === 'All' || model.counts.has(requestedKind))) {
      state.kind = requestedKind;
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      renderResults();
      results.focus?.();
    });
    query.addEventListener('input', renderResults);
    status.addEventListener('change', renderResults);
    reset.addEventListener('click', () => {
      query.value = '';
      status.value = 'all';
      state.kind = 'All';
      renderKindButtons();
      renderResults();
      query.focus();
    });

    renderKindButtons();
    renderResults();
  } catch (error) {
    console.error('[OmSaravanaBhava] Search facets failed', error);
    results.replaceChildren();
    const failure = document.createElement('article');
    failure.className = 'card facet-empty facet-error';
    createText(failure, 'h2', 'Search facets are temporarily unavailable');
    createText(failure, 'p', 'Use the full local search or site directory to continue.');
    const link = document.createElement('a');
    link.className = 'btn secondary';
    link.href = 'ai-search.html';
    link.textContent = 'Open local search';
    failure.appendChild(link);
    results.appendChild(failure);
    results.setAttribute('aria-busy', 'false');
    resultStatus.textContent = 'Published search data could not be loaded.';
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialise);
}
