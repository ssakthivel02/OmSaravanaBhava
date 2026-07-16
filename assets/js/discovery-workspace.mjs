import {
  CONSUMER_RELEASE,
  loadEffectiveRouteRegistry,
  normaliseRoutePath,
  normaliseStatus,
  registryStatusMessage
} from './effective-route-registry.mjs';

export const RELEASE = 237;
export const LENSES_PATH = '/data/discovery-lenses.json';
export const NAVIGATION_PATH = '/data/navigation-sections.json';

const fetchJson = async (path, fetcher = globalThis.fetch) => {
  if (typeof fetcher !== 'function') {
    throw new Error('Fetch API unavailable');
  }
  const response = await fetcher(path, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  return response.json();
};

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
      const path = normaliseRoutePath(record?.path);
      if (!path || routeMap.has(path)) return;
      routeMap.set(path, {
        ...record,
        path,
        titleTa: String(record.titleTa ?? '').trim(),
        titleEn: String(record.titleEn ?? path).trim() || path,
        category: String(
          record.category ?? 'Uncategorised'
        ).trim(),
        status: normaliseStatus(record.status),
        summary: String(record.summary ?? '').trim(),
        readingEligible: record.readingEligible !== false
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
          const path = normaliseRoutePath(item?.path);
          const route = routeMap.get(path);
          if (!path || !route) return;
          if (!route.readingEligible) return;
          if (excludedStatuses.has(route.status)) return;
          if (
            allowedStatuses.size > 0 &&
            !allowedStatuses.has(route.status)
          ) return;

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
            publicationStatusPrevious: String(
              route.publicationStatusPrevious || ''
            ),
            effectiveOverrideApplied:
              route.effectiveOverrideApplied === true,
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
                  ? section.audiences
                      .map(value => String(value).trim())
                      .filter(Boolean)
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

  const lenses = (Array.isArray(lensConfig.lenses)
    ? lensConfig.lenses
    : []
  ).map(lens => ({
    id: String(lens?.id ?? '').trim(),
    titleTa: String(lens?.titleTa ?? '').trim(),
    titleEn: String(lens?.titleEn ?? lens?.id ?? '').trim(),
    summary: String(lens?.summary ?? '').trim(),
    sectionIds: Array.isArray(lens?.sectionIds)
      ? lens.sectionIds
          .map(value => String(value).trim())
          .filter(Boolean)
      : [],
    audiences: Array.isArray(lens?.audiences)
      ? lens.audiences
          .map(value => String(value).trim())
          .filter(Boolean)
      : []
  })).filter(lens => lens.id);

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
    release: RELEASE,
    sourceRelease: Number(lensConfig.release) || 0,
    routeRelease: Number(routeRegistry.release) || 0,
    effectiveRegistryRelease:
      Number(routeRegistry.effectiveRegistryRelease) || 0,
    effectiveRegistryMode:
      String(routeRegistry.effectiveRegistryMode || ''),
    registryMessage: registryStatusMessage(routeRegistry),
    navigationRelease: Number(navigation.release) || 0,
    allowedStatuses: [...allowedStatuses],
    excludedStatuses: [...excludedStatuses],
    featuredLensIds: Array.isArray(lensConfig.featuredLensIds)
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

export const itemsForLens = (model, lensId = 'all') => {
  const items = Array.isArray(model?.items) ? model.items : [];
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
      ) return false;
      if (
        status !== 'all' &&
        item.status !== status
      ) return false;
      if (!needle) return true;
      return [
        item.titleTa,
        item.titleEn,
        item.description,
        item.category,
        item.status,
        item.publicationStatusPrevious,
        ...item.sectionIds
      ].join(' ').toLocaleLowerCase().includes(needle);
    })
    .sort((left, right) =>
      left.category.localeCompare(right.category) ||
      left.titleEn.localeCompare(right.titleEn)
    );
};

export const buildDiscoveryMetrics = model => {
  const items = Array.isArray(model?.items) ? model.items : [];
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
    overrideCount: items.filter(
      item => item.effectiveOverrideApplied
    ).length,
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

export const loadDiscoveryModel = async (
  fetcher = globalThis.fetch
) => {
  const [lenses, navigation, routes] = await Promise.all([
    fetchJson(LENSES_PATH, fetcher),
    fetchJson(NAVIGATION_PATH, fetcher),
    loadEffectiveRouteRegistry({fetcher})
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
  value,
  className
) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(value ?? '');
  parent.appendChild(element);
  return element;
};

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

const displayTitle = record =>
  record.titleTa && record.titleEn
    ? `${record.titleTa} · ${record.titleEn}`
    : record.titleTa || record.titleEn;

const createRouteCard = item => {
  const article = document.createElement('article');
  article.className = 'card discovery-route-card';

  const meta = document.createElement('div');
  meta.className = 'discovery-route-meta';
  createText(meta, 'span', item.category, 'pill');
  createText(meta, 'span', item.status, 'pill');
  if (item.effectiveOverrideApplied) {
    createText(meta, 'span', 'Explicit override', 'pill');
  }
  article.appendChild(meta);
  createText(article, 'h3', displayTitle(item));
  createText(article, 'p', item.description);
  const audience = item.audiences.length
    ? item.audiences.join(' · ')
    : 'General';
  createText(
    article,
    'p',
    `Audience: ${audience}`,
    'discovery-route-audience'
  );
  const link = document.createElement('a');
  link.className = 'btn';
  link.href = item.path;
  link.textContent = 'Open route';
  article.appendChild(link);
  return article;
};

const createLensButton = (
  lens,
  count,
  active,
  activate
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
  createText(button, 'span', lens.titleTa, 'discovery-lens-ta');
  createText(button, 'strong', lens.titleEn);
  createText(
    button,
    'span',
    lens.summary,
    'discovery-lens-summary'
  );
  createText(
    button,
    'span',
    `${count} route${count === 1 ? '' : 's'}`,
    'discovery-lens-count'
  );
  button.addEventListener('click', () => activate(lens.id));
  return button;
};

export const initialiseDiscoveryWorkspace = async ({
  documentRef = globalThis.document,
  fetcher = globalThis.fetch
} = {}) => {
  if (!documentRef) return false;
  const search = documentRef.getElementById('discoverySearch');
  const audience = documentRef.getElementById('discoveryAudience');
  const status = documentRef.getElementById('discoveryStatusFilter');
  const reset = documentRef.getElementById('discoveryReset');
  const lenses = documentRef.getElementById('discoveryLensGrid');
  const results = documentRef.getElementById('discoveryResults');
  const loadStatus = documentRef.getElementById('discoveryLoadStatus');
  const resultStatus = documentRef.getElementById(
    'discoveryResultStatus'
  );
  if (
    !search || !audience || !status || !reset ||
    !lenses || !results || !loadStatus || !resultStatus
  ) return false;

  try {
    const model = await loadDiscoveryModel(fetcher);
    let lensId = model.featuredLensIds[0] ||
      model.lenses[0]?.id ||
      'all';

    const metrics = buildDiscoveryMetrics(model);
    [
      ['discoveryRouteCount', metrics.routeCount],
      ['discoverySectionCount', metrics.sectionCount],
      ['discoveryCategoryCount', metrics.categoryCount]
    ].forEach(([id, value]) => {
      const node = documentRef.getElementById(id);
      if (node) node.textContent = String(value);
    });

    const audienceValues = [...new Set(
      model.items.flatMap(item => item.audiences)
    )].sort().map(value => ({
      value,
      label: model.audienceLabels[value] || value
    }));
    const statusValues = [...new Set(
      model.items.map(item => item.status)
    )].filter(Boolean).sort();

    populateSelect(audience, audienceValues, 'All audiences');
    populateSelect(status, statusValues, 'All publication states');

    const render = () => {
      const filtered = filterDiscoveryItems(model, {
        lensId,
        audience: audience.value,
        status: status.value,
        query: search.value
      });
      results.replaceChildren();
      if (!filtered.length) {
        const empty = documentRef.createElement('article');
        empty.className = 'card';
        createText(empty, 'h3', 'No discovery route matches');
        createText(
          empty,
          'p',
          'Reset the filters or choose another discovery lens.'
        );
        results.appendChild(empty);
      } else {
        filtered.forEach(item => {
          results.appendChild(createRouteCard(item));
        });
      }
      resultStatus.textContent =
        `${filtered.length} of ${model.items.length} eligible routes shown.`;

      const countMap = new Map(
        lensRouteCounts(model)
          .map(item => [item.id, item.count])
      );
      lenses.replaceChildren();
      model.lenses.forEach(lens => {
        lenses.appendChild(createLensButton(
          lens,
          countMap.get(lens.id) || 0,
          lens.id === lensId,
          value => {
            lensId = value;
            render();
          }
        ));
      });
    };

    search.addEventListener('input', render);
    audience.addEventListener('change', render);
    status.addEventListener('change', render);
    reset.addEventListener('click', () => {
      search.value = '';
      audience.value = 'all';
      status.value = 'all';
      lensId = model.featuredLensIds[0] ||
        model.lenses[0]?.id ||
        'all';
      render();
      search.focus();
    });

    loadStatus.textContent =
      `${model.registryMessage} ${metrics.overrideCount} eligible discovery routes use explicit canonical overrides.`;
    render();
    documentRef.documentElement.dataset.discoveryRelease =
      String(RELEASE);
    documentRef.documentElement.dataset.consumerRelease =
      String(CONSUMER_RELEASE);
    return true;
  } catch (error) {
    console.error(
      '[OmSaravanaBhava] Discovery workspace unavailable',
      error
    );
    loadStatus.textContent =
      `Discovery workspace unavailable: ${String(error?.message || error)}`;
    results.replaceChildren();
    const alert = documentRef.createElement('article');
    alert.className = 'card';
    alert.setAttribute('role', 'alert');
    createText(
      alert,
      'p',
      'Use the structured Explore page or Site Directory.'
    );
    results.appendChild(alert);
    return false;
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => initialiseDiscoveryWorkspace(),
      {once: true}
    );
  } else {
    initialiseDiscoveryWorkspace();
  }
}
