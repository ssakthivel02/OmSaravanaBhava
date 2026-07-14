export const RELEASE = 222;
export const LENSES_PATH = '/data/discovery-lenses.json';
export const NAVIGATION_PATH = '/data/navigation-sections.json';
export const ROUTES_PATH = '/data/site-routes.json';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

export const normaliseRoute = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, `${CANONICAL_ORIGIN}/`);
    if (url.origin !== CANONICAL_ORIGIN) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
};

export const normaliseStatus = value =>
  String(value ?? '').trim().toLocaleLowerCase();

export const normaliseDiscoveryModel = (
  lensesPayload,
  navigationPayload,
  routesPayload
) => {
  const lensConfig =
    lensesPayload && typeof lensesPayload === 'object'
      ? lensesPayload
      : {};
  const navigation =
    navigationPayload && typeof navigationPayload === 'object'
      ? navigationPayload
      : {};
  const routeRegistry =
    routesPayload && typeof routesPayload === 'object'
      ? routesPayload
      : {};

  const allowedStatuses = new Set(
    (Array.isArray(lensConfig.allowedStatuses)
      ? lensConfig.allowedStatuses
      : []
    ).map(normaliseStatus)
  );
  const excludedStatuses = new Set(
    (Array.isArray(lensConfig.excludedStatuses)
      ? lensConfig.excludedStatuses
      : []
    ).map(normaliseStatus)
  );

  const routeMap = new Map();
  (Array.isArray(routeRegistry.routes) ? routeRegistry.routes : [])
    .forEach(record => {
      const path = normaliseRoute(record?.path);
      if (!path || routeMap.has(path)) return;
      routeMap.set(path, {
        path,
        titleTa: String(record.titleTa ?? '').trim(),
        titleEn: String(record.titleEn ?? path).trim() || path,
        category: String(record.category ?? 'Uncategorised').trim(),
        status: normaliseStatus(record.status),
        summary: String(record.summary ?? '').trim()
      });
    });

  const sections = [];
  const itemMap = new Map();
  (Array.isArray(navigation.sections) ? navigation.sections : [])
    .forEach(section => {
      const id = String(section?.id ?? '').trim();
      if (!id) return;
      const itemPaths = [];

      (Array.isArray(section.items) ? section.items : [])
        .forEach(item => {
          const path = normaliseRoute(item?.path);
          const route = routeMap.get(path);
          if (!path || !route) return;
          if (excludedStatuses.has(route.status)) return;
          if (
            allowedStatuses.size > 0 &&
            !allowedStatuses.has(route.status)
          ) {
            return;
          }

          const existing = itemMap.get(path);
          const merged = {
            path,
            titleTa:
              String(item.titleTa ?? '').trim() ||
              route.titleTa,
            titleEn:
              String(item.titleEn ?? '').trim() ||
              route.titleEn,
            description:
              String(item.description ?? '').trim() ||
              route.summary,
            category: route.category,
            status: route.status,
            sectionIds: [
              ...new Set([
                ...(existing?.sectionIds || []),
                id
              ])
            ],
            audiences: [
              ...new Set([
                ...(existing?.audiences || []),
                ...(Array.isArray(section.audiences)
                  ? section.audiences.map(value =>
                      String(value).trim()
                    )
                  : [])
              ])
            ]
          };
          itemMap.set(path, merged);
          itemPaths.push(path);
        });

      sections.push({
        id,
        titleTa: String(section.titleTa ?? '').trim(),
        titleEn: String(section.titleEn ?? id).trim() || id,
        summary: String(section.summary ?? '').trim(),
        audiences: Array.isArray(section.audiences)
          ? section.audiences
              .map(value => String(value).trim())
              .filter(Boolean)
          : [],
        itemPaths: [...new Set(itemPaths)]
      });
    });

  const lenses = [];
  (Array.isArray(lensConfig.lenses) ? lensConfig.lenses : [])
    .forEach(lens => {
      const id = String(lens?.id ?? '').trim();
      if (!id) return;
      lenses.push({
        id,
        titleTa: String(lens.titleTa ?? '').trim(),
        titleEn: String(lens.titleEn ?? id).trim() || id,
        summary: String(lens.summary ?? '').trim(),
        sectionIds: Array.isArray(lens.sectionIds)
          ? lens.sectionIds
              .map(value => String(value).trim())
              .filter(Boolean)
          : [],
        audiences: Array.isArray(lens.audiences)
          ? lens.audiences
              .map(value => String(value).trim())
              .filter(Boolean)
          : []
      });
    });

  const audienceLabels =
    navigation.audienceLabels &&
    typeof navigation.audienceLabels === 'object'
      ? Object.fromEntries(
          Object.entries(navigation.audienceLabels)
            .map(([key, value]) => [
              String(key).trim(),
              String(value).trim()
            ])
            .filter(([key, value]) => key && value)
        )
      : {};

  return {
    release: Number(lensConfig.release) || 0,
    routeRelease: Number(routeRegistry.release) || 0,
    navigationRelease: Number(navigation.release) || 0,
    allowedStatuses: [...allowedStatuses],
    excludedStatuses: [...excludedStatuses],
    featuredLensIds: Array.isArray(
      lensConfig.featuredLensIds
    )
      ? lensConfig.featuredLensIds
          .map(value => String(value).trim())
          .filter(Boolean)
      : [],
    audienceLabels,
    sections,
    lenses,
    items: [...itemMap.values()]
  };
};

export const itemsForLens = (
  model,
  lensId = 'all'
) => {
  const items = Array.isArray(model?.items)
    ? model.items
    : [];
  const lens = (model?.lenses || [])
    .find(record => record.id === lensId);
  if (!lens || lens.id === 'all' || lens.sectionIds.length === 0) {
    return [...items];
  }
  const sectionIds = new Set(lens.sectionIds);
  return items.filter(item =>
    item.sectionIds.some(id => sectionIds.has(id))
  );
};

export const filterDiscoveryItems = (
  model,
  {
    lensId = 'all',
    audience = 'all',
    status = 'all',
    query = ''
  } = {}
) => {
  const needle = String(query)
    .trim()
    .toLocaleLowerCase();
  return itemsForLens(model, lensId)
    .filter(item => {
      if (
        audience !== 'all' &&
        !item.audiences.includes(audience)
      ) {
        return false;
      }
      if (
        status !== 'all' &&
        item.status !== status
      ) {
        return false;
      }
      if (!needle) return true;
      const haystack = [
        item.titleTa,
        item.titleEn,
        item.description,
        item.category,
        item.status,
        ...item.sectionIds
      ].join(' ').toLocaleLowerCase();
      return haystack.includes(needle);
    })
    .sort((left, right) =>
      left.category.localeCompare(right.category) ||
      left.titleEn.localeCompare(right.titleEn)
    );
};

export const buildDiscoveryMetrics = model => {
  const items = Array.isArray(model?.items)
    ? model.items
    : [];
  const categories = new Set(
    items.map(item => item.category).filter(Boolean)
  );
  const statuses = new Map();
  items.forEach(item => {
    statuses.set(
      item.status,
      (statuses.get(item.status) || 0) + 1
    );
  });
  return {
    routeCount: items.length,
    sectionCount: (model?.sections || [])
      .filter(section => section.itemPaths.length > 0)
      .length,
    categoryCount: categories.size,
    lensCount: (model?.lenses || []).length,
    statuses: [...statuses.entries()]
      .map(([status, count]) => ({status, count}))
      .sort((left, right) =>
        right.count - left.count ||
        left.status.localeCompare(right.status)
      )
  };
};

export const lensRouteCounts = model =>
  (model?.lenses || []).map(lens => ({
    id: lens.id,
    count: itemsForLens(model, lens.id).length
  }));

const fetchJson = async (
  path,
  fetcher = globalThis.fetch
) => {
  if (typeof fetcher !== 'function') {
    throw new Error('Fetch API unavailable');
  }
  const response = await fetcher(path, {
    cache: 'default',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return response.json();
};

export const loadDiscoveryModel = async (
  fetcher = globalThis.fetch
) => {
  const [lenses, navigation, routes] =
    await Promise.all([
      fetchJson(LENSES_PATH, fetcher),
      fetchJson(NAVIGATION_PATH, fetcher),
      fetchJson(ROUTES_PATH, fetcher)
    ]);
  return normaliseDiscoveryModel(
    lenses,
    navigation,
    routes
  );
};

const createText = (
  parent,
  tag,
  text,
  className
) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(text);
  parent.appendChild(element);
  return element;
};

const displayTitle = record =>
  record.titleTa && record.titleEn
    ? `${record.titleTa} · ${record.titleEn}`
    : record.titleTa || record.titleEn;

const populateSelect = (
  select,
  values,
  allLabel
) => {
  select.replaceChildren();
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = allLabel;
  select.appendChild(all);
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value.value ?? value;
    option.textContent = value.label ?? value;
    select.appendChild(option);
  });
};

const renderMetric = (id, value) => {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
};

const createLensCard = (
  lens,
  count,
  active,
  selectLens
) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className =
    `discovery-lens${active ? ' is-active' : ''}`;
  button.dataset.lensId = lens.id;
  button.setAttribute(
    'aria-pressed',
    active ? 'true' : 'false'
  );
  createText(
    button,
    'span',
    lens.titleTa,
    'discovery-lens-ta'
  );
  createText(
    button,
    'strong',
    lens.titleEn
  );
  createText(
    button,
    'span',
    lens.summary,
    'discovery-lens-summary'
  );
  createText(
    button,
    'span',
    `${count} published route${count === 1 ? '' : 's'}`,
    'discovery-lens-count'
  );
  button.addEventListener(
    'click',
    () => selectLens(lens.id)
  );
  return button;
};

const renderLensGrid = (
  host,
  model,
  activeLensId,
  selectLens
) => {
  const counts = new Map(
    lensRouteCounts(model)
      .map(item => [item.id, item.count])
  );
  host.replaceChildren();
  model.lenses.forEach(lens => {
    host.appendChild(
      createLensCard(
        lens,
        counts.get(lens.id) || 0,
        lens.id === activeLensId,
        selectLens
      )
    );
  });
};

const createRouteCard = item => {
  const article = document.createElement('article');
  article.className = 'card discovery-route-card';

  const meta = document.createElement('div');
  meta.className = 'discovery-route-meta';
  createText(meta, 'span', item.category, 'pill');
  createText(meta, 'span', item.status, 'pill');
  article.appendChild(meta);

  createText(article, 'h2', displayTitle(item));
  createText(article, 'p', item.description);
  createText(
    article,
    'p',
    item.audiences.join(' · '),
    'discovery-audiences'
  );

  const link = document.createElement('a');
  link.className = 'btn';
  link.href = item.path;
  link.textContent = 'Open published route';
  article.appendChild(link);
  return article;
};

const renderResults = (
  host,
  results
) => {
  host.replaceChildren();
  if (!results.length) {
    const empty = document.createElement('article');
    empty.className = 'card discovery-empty';
    createText(empty, 'h2', 'No routes match');
    createText(
      empty,
      'p',
      'Change the discovery lens, audience, status or search text.'
    );
    host.appendChild(empty);
    return;
  }
  results.forEach(item =>
    host.appendChild(createRouteCard(item))
  );
};

const initialiseDiscoveryPage = async model => {
  const lensHost =
    document.getElementById('discoveryLensGrid');
  const resultsHost =
    document.getElementById('discoveryResults');
  const audience =
    document.getElementById('discoveryAudience');
  const status =
    document.getElementById('discoveryStatusFilter');
  const search =
    document.getElementById('discoverySearch');
  const reset =
    document.getElementById('discoveryReset');
  const resultStatus =
    document.getElementById('discoveryResultStatus');

  if (
    !lensHost ||
    !resultsHost ||
    !audience ||
    !status ||
    !search ||
    !reset ||
    !resultStatus
  ) {
    return;
  }

  const metrics = buildDiscoveryMetrics(model);
  renderMetric(
    'discoveryRouteCount',
    metrics.routeCount
  );
  renderMetric(
    'discoverySectionCount',
    metrics.sectionCount
  );
  renderMetric(
    'discoveryCategoryCount',
    metrics.categoryCount
  );

  populateSelect(
    audience,
    Object.entries(model.audienceLabels)
      .filter(([key]) => key !== 'all')
      .map(([value, label]) => ({value, label})),
    model.audienceLabels.all || 'All visitors'
  );
  populateSelect(
    status,
    metrics.statuses.map(item => ({
      value: item.status,
      label: `${item.status} (${item.count})`
    })),
    'All publication states'
  );

  let activeLensId = 'all';

  const render = () => {
    const results = filterDiscoveryItems(model, {
      lensId: activeLensId,
      audience: audience.value,
      status: status.value,
      query: search.value
    });
    renderLensGrid(
      lensHost,
      model,
      activeLensId,
      lensId => {
        activeLensId = lensId;
        render();
      }
    );
    renderResults(resultsHost, results);
    resultStatus.textContent =
      `${results.length} actual published route${results.length === 1 ? '' : 's'} match the current view.`;
  };

  search.addEventListener('input', render);
  audience.addEventListener('change', render);
  status.addEventListener('change', render);
  reset.addEventListener('click', () => {
    activeLensId = 'all';
    search.value = '';
    audience.value = 'all';
    status.value = 'all';
    render();
    search.focus();
  });

  render();
};

const initialiseHomeDiscovery = model => {
  const host =
    document.getElementById('homeDiscoveryLenses');
  const count =
    document.getElementById('homeDiscoveryRouteCount');
  if (!host || !count) return;

  const featured = new Set(model.featuredLensIds);
  const counts = new Map(
    lensRouteCounts(model)
      .map(item => [item.id, item.count])
  );
  host.replaceChildren();
  model.lenses
    .filter(lens => featured.has(lens.id))
    .forEach(lens => {
      const link = document.createElement('a');
      link.className = 'home-discovery-lens';
      link.href =
        `/discovery.html?lens=${encodeURIComponent(lens.id)}`;
      createText(link, 'span', lens.titleTa);
      createText(link, 'strong', lens.titleEn);
      createText(
        link,
        'small',
        `${counts.get(lens.id) || 0} current routes`
      );
      host.appendChild(link);
    });

  count.textContent = String(
    buildDiscoveryMetrics(model).routeCount
  );
};

const applyLensFromUrl = () => {
  const params = new URLSearchParams(
    globalThis.location?.search || ''
  );
  const lensId = params.get('lens');
  if (!lensId) return;
  const button = document.querySelector(
    `[data-lens-id="${CSS.escape(lensId)}"]`
  );
  button?.click();
};

const initialise = async () => {
  const pageStatus =
    document.getElementById('discoveryLoadStatus');
  try {
    const model = await loadDiscoveryModel();
    initialiseHomeDiscovery(model);
    await initialiseDiscoveryPage(model);
    applyLensFromUrl();
    if (pageStatus) {
      pageStatus.textContent =
        `Discovery data loaded from route release ${model.routeRelease} and navigation release ${model.navigationRelease}.`;
    }
  } catch (error) {
    console.error(
      '[OmSaravanaBhava] Discovery workspace unavailable',
      error
    );
    if (pageStatus) {
      pageStatus.textContent =
        'The local discovery registries could not be loaded.';
    }
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener(
    'DOMContentLoaded',
    initialise
  );
}
