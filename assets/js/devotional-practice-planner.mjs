export const RELEASE = 228;
export const CONFIG_PATH = '/data/devotional-practice-planner.json';
export const ROUTES_PATH = '/data/site-routes.json';
export const STORAGE_KEY = 'osb-devotional-practice-plans-v1';
export const COLLECTIONS_STORAGE_KEY = 'osb-devotional-collections-v1';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

const safeStorage = storage => {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
};
const cleanText = (value, maximum) =>
  String(value ?? '').trim().slice(0, maximum);

export const normalisePlannerRoute = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, `${CANONICAL_ORIGIN}/`);
    if (url.origin !== CANONICAL_ORIGIN) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return ''; }
};

export const routePath = value => {
  const route = normalisePlannerRoute(value);
  if (!route) return '';
  try { return new URL(route, CANONICAL_ORIGIN).pathname; }
  catch { return ''; }
};

export const normaliseIsoDate = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const normaliseLocalDate = value => {
  const raw = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
};

export const localDateString = date => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

export const sanitiseWeekdays = value => {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map(Number)
    .filter(day =>
      Number.isInteger(day) && day >= 0 && day <= 6 &&
      !seen.has(day) && seen.add(day)
    )
    .sort((a, b) => a - b);
};

export const sanitisePlan = (
  value,
  {
    maximumRoutesPerPlan = 50,
    maximumCheckInsPerPlan = 180,
    maximumNameLength = 60,
    maximumDescriptionLength = 240,
    timestamp = new Date().toISOString()
  } = {}
) => {
  if (!value || typeof value !== 'object') return null;
  const id = cleanText(value.id, 180);
  const name = cleanText(value.name, maximumNameLength);
  if (!id || !name) return null;

  const routeSeen = new Set();
  const routes = [];
  (Array.isArray(value.routes) ? value.routes : []).forEach(record => {
    if (!record || typeof record !== 'object') return;
    const route = normalisePlannerRoute(record.route);
    const path = routePath(route);
    if (!route || !path || routeSeen.has(path)) return;
    routeSeen.add(path);
    routes.push({
      route,
      addedAt: normaliseIsoDate(record.addedAt) || timestamp
    });
  });
  const validRoutes = routes.slice(
    0, Math.max(1, Number(maximumRoutesPerPlan) || 50)
  );
  const validPaths = new Set(validRoutes.map(item => routePath(item.route)));

  const checkInByDate = new Map();
  (Array.isArray(value.checkIns) ? value.checkIns : []).forEach(record => {
    if (!record || typeof record !== 'object') return;
    const date = normaliseLocalDate(record.date);
    const route = normalisePlannerRoute(record.route);
    if (!date || !route || !validPaths.has(routePath(route))) return;
    const item = {
      date,
      route,
      completedAt: normaliseIsoDate(record.completedAt) || timestamp
    };
    const previous = checkInByDate.get(date);
    if (!previous || item.completedAt >= previous.completedAt) {
      checkInByDate.set(date, item);
    }
  });
  const checkIns = [...checkInByDate.values()]
    .sort((a, b) =>
      String(b.date).localeCompare(String(a.date)) ||
      String(b.completedAt).localeCompare(String(a.completedAt))
    )
    .slice(0, Math.max(1, Number(maximumCheckInsPerPlan) || 180));

  const rawIndex = Number(value.currentIndex);
  const currentIndex = validRoutes.length
    ? Math.max(0, Math.min(
        validRoutes.length - 1,
        Number.isInteger(rawIndex) ? rawIndex : 0
      ))
    : 0;

  return {
    id,
    name,
    description: cleanText(value.description, maximumDescriptionLength),
    sourceCollectionId: cleanText(value.sourceCollectionId, 180),
    weekdays: sanitiseWeekdays(value.weekdays),
    routes: validRoutes,
    currentIndex,
    checkIns,
    createdAt: normaliseIsoDate(value.createdAt) || timestamp,
    updatedAt:
      normaliseIsoDate(value.updatedAt) ||
      normaliseIsoDate(value.createdAt) ||
      timestamp
  };
};

export const loadPlans = (storage, config) => {
  const target = safeStorage(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(target.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed
      .map(record => sanitisePlan(record, {
        maximumRoutesPerPlan: config?.maximumRoutesPerPlan,
        maximumCheckInsPerPlan: config?.maximumCheckInsPerPlan,
        maximumNameLength: config?.maximumNameLength,
        maximumDescriptionLength: config?.maximumDescriptionLength,
        timestamp:
          record?.updatedAt || record?.createdAt || new Date().toISOString()
      }))
      .filter(plan => {
        if (!plan || seen.has(plan.id)) return false;
        seen.add(plan.id);
        return true;
      })
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, Math.max(1, Number(config?.maximumPlans) || 12));
  } catch { return []; }
};

export const savePlans = (plans, storage, config) => {
  const target = safeStorage(storage);
  if (!target) return false;
  try {
    const seen = new Set();
    const clean = (Array.isArray(plans) ? plans : [])
      .map(record => sanitisePlan(record, {
        maximumRoutesPerPlan: config?.maximumRoutesPerPlan,
        maximumCheckInsPerPlan: config?.maximumCheckInsPerPlan,
        maximumNameLength: config?.maximumNameLength,
        maximumDescriptionLength: config?.maximumDescriptionLength,
        timestamp:
          record?.updatedAt || record?.createdAt || new Date().toISOString()
      }))
      .filter(plan => {
        if (!plan || seen.has(plan.id)) return false;
        seen.add(plan.id);
        return true;
      })
      .slice(0, Math.max(1, Number(config?.maximumPlans) || 12));
    target.setItem(STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch { return false; }
};

export const loadCollections = (
  storage,
  storageKey = COLLECTIONS_STORAGE_KEY
) => {
  const target = safeStorage(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(target.getItem(storageKey) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(item =>
          item && typeof item === 'object' &&
          cleanText(item.id, 180) && cleanText(item.name, 60)
        )
      : [];
  } catch { return []; }
};

export const createPlan = (
  plans,
  {
    id,
    name,
    description = '',
    sourceCollection = null,
    weekdays = [],
    timestamp = new Date().toISOString()
  },
  config
) => {
  const previous = Array.isArray(plans) ? [...plans] : [];
  if (previous.length >= Math.max(1, Number(config?.maximumPlans) || 12)) {
    return previous;
  }
  const generatedId =
    cleanText(id, 180) ||
    globalThis.crypto?.randomUUID?.() ||
    `plan-${timestamp.replace(/[^0-9]/g, '')}`;
  const routes = (
    sourceCollection && Array.isArray(sourceCollection.items)
      ? sourceCollection.items
      : []
  ).map(item => ({route: item.route, addedAt: timestamp}));

  const plan = sanitisePlan({
    id: generatedId,
    name,
    description,
    sourceCollectionId: cleanText(sourceCollection?.id, 180),
    weekdays,
    routes,
    currentIndex: 0,
    checkIns: [],
    createdAt: timestamp,
    updatedAt: timestamp
  }, {
    maximumRoutesPerPlan: config?.maximumRoutesPerPlan,
    maximumCheckInsPerPlan: config?.maximumCheckInsPerPlan,
    maximumNameLength: config?.maximumNameLength,
    maximumDescriptionLength: config?.maximumDescriptionLength,
    timestamp
  });
  if (!plan) return previous;
  return [plan, ...previous.filter(item => item.id !== plan.id)]
    .slice(0, Math.max(1, Number(config?.maximumPlans) || 12));
};

export const updatePlan = (
  plans, id, changes, config,
  timestamp = new Date().toISOString()
) => {
  const targetId = cleanText(id, 180);
  return (Array.isArray(plans) ? plans : []).map(record => {
    if (record.id !== targetId) return record;
    return sanitisePlan({
      ...record,
      name: changes?.name === undefined ? record.name : changes.name,
      description:
        changes?.description === undefined
          ? record.description
          : changes.description,
      weekdays:
        changes?.weekdays === undefined
          ? record.weekdays
          : changes.weekdays,
      updatedAt: timestamp
    }, {
      maximumRoutesPerPlan: config?.maximumRoutesPerPlan,
      maximumCheckInsPerPlan: config?.maximumCheckInsPerPlan,
      maximumNameLength: config?.maximumNameLength,
      maximumDescriptionLength: config?.maximumDescriptionLength,
      timestamp
    }) || record;
  });
};

export const deletePlan = (plans, id) => {
  const targetId = cleanText(id, 180);
  return (Array.isArray(plans) ? plans : [])
    .filter(record => record.id !== targetId);
};

export const addRouteToPlan = (
  plans, planId, route, config,
  timestamp = new Date().toISOString()
) => {
  const path = routePath(route);
  if (!path) return Array.isArray(plans) ? [...plans] : [];
  return (Array.isArray(plans) ? plans : []).map(record => {
    if (record.id !== planId) return record;
    const existing = Array.isArray(record.routes) ? record.routes : [];
    if (
      existing.some(item => routePath(item.route) === path) ||
      existing.length >= Math.max(1, Number(config?.maximumRoutesPerPlan) || 50)
    ) return record;
    return {
      ...record,
      routes: [
        ...existing,
        {route: normalisePlannerRoute(route), addedAt: timestamp}
      ],
      updatedAt: timestamp
    };
  });
};

export const removeRouteFromPlan = (
  plans, planId, route, config,
  timestamp = new Date().toISOString()
) => {
  const path = routePath(route);
  return (Array.isArray(plans) ? plans : []).map(record => {
    if (record.id !== planId) return record;
    const routes = (record.routes || [])
      .filter(item => routePath(item.route) !== path);
    const paths = new Set(routes.map(item => routePath(item.route)));
    return sanitisePlan({
      ...record,
      routes,
      checkIns: (record.checkIns || [])
        .filter(item => paths.has(routePath(item.route))),
      currentIndex:
        routes.length
          ? Math.min(record.currentIndex || 0, routes.length - 1)
          : 0,
      updatedAt: timestamp
    }, {
      maximumRoutesPerPlan: config?.maximumRoutesPerPlan,
      maximumCheckInsPerPlan: config?.maximumCheckInsPerPlan,
      maximumNameLength: config?.maximumNameLength,
      maximumDescriptionLength: config?.maximumDescriptionLength,
      timestamp
    }) || record;
  });
};

export const moveCurrentRoute = (
  plans, planId, direction,
  timestamp = new Date().toISOString()
) => {
  const delta = direction === 'previous' ? -1 : 1;
  return (Array.isArray(plans) ? plans : []).map(record => {
    if (record.id !== planId || !record.routes?.length) return record;
    const length = record.routes.length;
    const current = Number.isInteger(record.currentIndex)
      ? record.currentIndex
      : 0;
    return {
      ...record,
      currentIndex: (current + delta + length) % length,
      updatedAt: timestamp
    };
  });
};

export const isPlanDueOnDate = (plan, date = new Date()) => {
  const weekdays = sanitiseWeekdays(plan?.weekdays);
  if (!weekdays.length) return true;
  const value = date instanceof Date ? date : new Date(date);
  return !Number.isNaN(value.getTime()) && weekdays.includes(value.getDay());
};

export const checkInPlan = (
  plans, planId,
  {
    date = localDateString(new Date()),
    timestamp = new Date().toISOString()
  } = {},
  config
) => {
  const localDate = normaliseLocalDate(date);
  if (!localDate) return Array.isArray(plans) ? [...plans] : [];
  return (Array.isArray(plans) ? plans : []).map(record => {
    if (record.id !== planId || !record.routes?.length) return record;
    const index = Math.max(0, Math.min(
      record.routes.length - 1,
      Number.isInteger(record.currentIndex) ? record.currentIndex : 0
    ));
    const current = record.routes[index];
    return sanitisePlan({
      ...record,
      currentIndex: (index + 1) % record.routes.length,
      checkIns: [
        {date: localDate, route: current.route, completedAt: timestamp},
        ...(record.checkIns || []).filter(item => item.date !== localDate)
      ],
      updatedAt: timestamp
    }, {
      maximumRoutesPerPlan: config?.maximumRoutesPerPlan,
      maximumCheckInsPerPlan: config?.maximumCheckInsPerPlan,
      maximumNameLength: config?.maximumNameLength,
      maximumDescriptionLength: config?.maximumDescriptionLength,
      timestamp
    }) || record;
  });
};

export const removeCheckIn = (
  plans, planId, date, config,
  timestamp = new Date().toISOString()
) => {
  const localDate = normaliseLocalDate(date);
  return (Array.isArray(plans) ? plans : []).map(record => {
    if (record.id !== planId) return record;
    return sanitisePlan({
      ...record,
      checkIns: (record.checkIns || [])
        .filter(item => item.date !== localDate),
      updatedAt: timestamp
    }, {
      maximumRoutesPerPlan: config?.maximumRoutesPerPlan,
      maximumCheckInsPerPlan: config?.maximumCheckInsPerPlan,
      maximumNameLength: config?.maximumNameLength,
      maximumDescriptionLength: config?.maximumDescriptionLength,
      timestamp
    }) || record;
  });
};

export const normaliseEligibleRoutes = (payload, config) => {
  const allowed = new Set(
    (config?.allowedRouteStatuses || [])
      .map(value => String(value).trim().toLocaleLowerCase())
  );
  const excluded = new Set(
    (config?.excludedRouteStatuses || [])
      .map(value => String(value).trim().toLocaleLowerCase())
  );
  const excludedCategories = new Set(
    (config?.excludedCategories || [])
      .map(value => String(value).trim().toLocaleLowerCase())
  );
  const seen = new Set();
  const routes = [];
  (Array.isArray(payload?.routes) ? payload.routes : []).forEach(record => {
    const path = routePath(record?.path);
    const status = String(record?.status ?? '')
      .trim().toLocaleLowerCase();
    const category = String(record?.category ?? '').trim();
    if (
      !path || seen.has(path) || excluded.has(status) ||
      (allowed.size && !allowed.has(status)) ||
      excludedCategories.has(category.toLocaleLowerCase())
    ) return;
    seen.add(path);
    routes.push({
      path,
      route: path,
      titleTa: cleanText(record.titleTa, 180),
      titleEn: cleanText(record.titleEn || path, 180) || path,
      category: cleanText(category || 'Published route', 100),
      status: status || 'published',
      summary: cleanText(record.summary, 500)
    });
  });
  return routes.sort((a, b) =>
    a.category.localeCompare(b.category) ||
    a.titleEn.localeCompare(b.titleEn)
  );
};

export const resolvePlans = (plans, eligibleRoutes) => {
  const routeMap = new Map(
    (eligibleRoutes || []).map(route => [route.path, route])
  );
  let ignoredRoutes = 0;
  const resolved = (plans || []).map(plan => {
    const routes = [];
    (plan.routes || []).forEach(item => {
      const route = routeMap.get(routePath(item.route));
      if (!route) {
        ignoredRoutes += 1;
        return;
      }
      routes.push({...item, ...route});
    });
    const validPaths = new Set(routes.map(item => item.path));
    const checkIns = (plan.checkIns || [])
      .filter(item => validPaths.has(routePath(item.route)));
    const currentIndex = routes.length
      ? Math.min(plan.currentIndex || 0, routes.length - 1)
      : 0;
    return {
      ...plan,
      routes,
      checkIns,
      currentIndex,
      currentRoute: routes[currentIndex] || null,
      ignoredRouteCount: (plan.routes || []).length - routes.length
    };
  });
  return {plans: resolved, ignoredRoutes};
};

export const buildPlannerMetrics = (
  plans, eligibleRoutes, config, date = new Date()
) => {
  const resolved = resolvePlans(plans, eligibleRoutes);
  const today = localDateString(date);
  return {
    plans: resolved.plans.length,
    routes: resolved.plans.reduce(
      (total, plan) => total + plan.routes.length, 0
    ),
    dueToday: resolved.plans.filter(
      plan => plan.routes.length && isPlanDueOnDate(plan, date)
    ).length,
    checkedInToday: resolved.plans.filter(
      plan => plan.checkIns.some(item => item.date === today)
    ).length,
    ignoredRoutes: resolved.ignoredRoutes,
    maximumPlans: Number(config?.maximumPlans) || 12
  };
};

export const filterPlans = (plans, query) => {
  const needle = String(query).trim().toLocaleLowerCase();
  if (!needle) return [...(plans || [])];
  return (plans || []).filter(plan =>
    [
      plan.name,
      plan.description,
      ...(plan.routes || []).flatMap(route => [
        route.titleTa, route.titleEn, route.category
      ])
    ].join(' ').toLocaleLowerCase().includes(needle)
  );
};

export const filterEligibleRoutes = (routes, query) => {
  const needle = String(query).trim().toLocaleLowerCase();
  if (!needle) return [...(routes || [])];
  return (routes || []).filter(route =>
    [
      route.titleTa, route.titleEn, route.category,
      route.status, route.summary
    ].join(' ').toLocaleLowerCase().includes(needle)
  );
};

const fetchJson = async path => {
  const response = await fetch(path, {
    cache: 'default',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return response.json();
};

const createText = (parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(text);
  parent.appendChild(element);
  return element;
};

const displayTitle = route =>
  route?.titleTa && route?.titleEn
    ? `${route.titleTa} · ${route.titleEn}`
    : route?.titleTa || route?.titleEn || route?.path || route?.route || '';

const formatDate = value => {
  try { return new Date(value).toLocaleString(); }
  catch { return String(value || ''); }
};

const initialise = async () => {
  const ids = [
    'plannerStatus', 'plannerCreateForm', 'plannerName',
    'plannerDescription', 'plannerSourceCollection',
    'plannerWeekdays', 'plannerSearch', 'plannerPlans',
    'plannerRouteSearch', 'plannerRouteTarget',
    'plannerRouteResults', 'plannerRouteReset'
  ];
  const elements = Object.fromEntries(
    ids.map(id => [id, document.getElementById(id)])
  );
  if (Object.values(elements).some(value => !value)) return;

  const {
    plannerStatus: status,
    plannerCreateForm: createForm,
    plannerName: nameInput,
    plannerDescription: descriptionInput,
    plannerSourceCollection: collectionSelect,
    plannerWeekdays: weekdayHost,
    plannerSearch: planSearch,
    plannerPlans: planHost,
    plannerRouteSearch: routeSearch,
    plannerRouteTarget: routeTarget,
    plannerRouteResults: routeHost,
    plannerRouteReset: routeReset
  } = elements;

  let config;
  let eligibleRoutes;
  let collections;
  let plans;

  try {
    const [loadedConfig, routesPayload] = await Promise.all([
      fetchJson(CONFIG_PATH),
      fetchJson(ROUTES_PATH)
    ]);
    config = loadedConfig;
    eligibleRoutes = normaliseEligibleRoutes(routesPayload, config);
    collections = loadCollections(
      undefined,
      config.collectionsStorageKey || COLLECTIONS_STORAGE_KEY
    );
    plans = loadPlans(undefined, config);
  } catch (error) {
    status.textContent =
      `Practice Planner unavailable: ${String(error?.message || error)}`;
    return;
  }

  (config.weekdays || []).forEach(day => {
    const label = document.createElement('label');
    label.className = 'planner-weekday';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = String(day.id);
    label.append(input, document.createTextNode(day.label));
    weekdayHost.appendChild(label);
  });

  const saveAndRender = next => {
    plans = next;
    if (!savePlans(plans, undefined, config)) {
      status.textContent = 'Browser storage is unavailable.';
      return false;
    }
    window.dispatchEvent(new CustomEvent('osb:practice-plans-updated'));
    render();
    return true;
  };

  const renderSourceCollections = () => {
    collectionSelect.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Start with an empty plan';
    collectionSelect.appendChild(empty);
    collections.forEach(collection => {
      const option = document.createElement('option');
      option.value = collection.id;
      option.textContent =
        `${collection.name} (${(collection.items || []).length} routes)`;
      collectionSelect.appendChild(option);
    });
  };

  const renderTargetPlans = () => {
    const selected = routeTarget.value;
    routeTarget.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = plans.length ? 'Choose a plan' : 'Create a plan first';
    routeTarget.appendChild(empty);
    plans.forEach(plan => {
      const option = document.createElement('option');
      option.value = plan.id;
      option.textContent = `${plan.name} (${plan.routes.length})`;
      routeTarget.appendChild(option);
    });
    routeTarget.value =
      plans.some(plan => plan.id === selected) ? selected : '';
  };

  const createPlanCard = plan => {
    const article = document.createElement('article');
    article.className = 'card planner-plan-card';

    const heading = document.createElement('div');
    heading.className = 'planner-plan-heading';
    const title = document.createElement('div');
    createText(title, 'h2', plan.name);
    if (plan.description) createText(title, 'p', plan.description);
    heading.appendChild(title);
    const badges = document.createElement('div');
    badges.className = 'planner-badges';
    createText(badges, 'span',
      `${plan.routes.length} route${plan.routes.length === 1 ? '' : 's'}`,
      'pill');
    createText(badges, 'span',
      isPlanDueOnDate(plan, new Date()) ? 'Planned today' : 'Not planned today',
      'pill');
    if (plan.ignoredRouteCount) {
      createText(badges, 'span', `${plan.ignoredRouteCount} stale`, 'pill');
    }
    heading.appendChild(badges);
    article.appendChild(heading);

    const weekdayLabels = (plan.weekdays || [])
      .map(day => config.weekdays.find(item => item.id === day)?.label)
      .filter(Boolean);
    createText(
      article, 'p',
      weekdayLabels.length
        ? `Planned days: ${weekdayLabels.join(', ')}`
        : 'Planned days: any day',
      'planner-meta'
    );

    if (plan.currentRoute) {
      const current = document.createElement('div');
      current.className = 'planner-current-route';
      createText(current, 'span', 'Current route', 'pill');
      createText(current, 'h3', displayTitle(plan.currentRoute));
      createText(current, 'p',
        `${plan.currentRoute.category} · ${plan.currentRoute.status}`);
      const open = document.createElement('a');
      open.className = 'btn';
      open.href = plan.currentRoute.path;
      open.textContent = 'Open current route';
      current.appendChild(open);
      article.appendChild(current);
    } else {
      createText(article, 'p',
        'No currently valid route is assigned to this plan.');
    }

    const today = localDateString(new Date());
    const todayCheck = (plan.checkIns || [])
      .find(item => item.date === today);
    const actions = document.createElement('div');
    actions.className = 'planner-actions';

    const button = (label, handler, disabled = false) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = label.includes('Record') ? 'btn' : 'btn secondary';
      item.textContent = label;
      item.disabled = disabled;
      item.addEventListener('click', handler);
      actions.appendChild(item);
    };

    button('Previous route', () =>
      saveAndRender(moveCurrentRoute(plans, plan.id, 'previous')),
      !plan.routes.length);
    button('Next route', () =>
      saveAndRender(moveCurrentRoute(plans, plan.id, 'next')),
      !plan.routes.length);
    button(
      todayCheck ? 'Replace today check-in' : 'Record today check-in',
      () => {
        if (!confirm(
          'Record today’s local check-in for the current route? This is an organisational marker only.'
        )) return;
        saveAndRender(checkInPlan(
          plans, plan.id,
          {date: today, timestamp: new Date().toISOString()},
          config
        ));
      },
      !plan.routes.length
    );
    if (todayCheck) {
      button('Remove today check-in', () =>
        saveAndRender(removeCheckIn(plans, plan.id, today, config)));
    }
    button('Edit plan', () => {
      const name = prompt('Plan name', plan.name);
      if (name === null) return;
      const description = prompt('Plan description', plan.description);
      if (description === null) return;
      const days = prompt(
        'Weekday numbers separated by commas: Sunday 0 through Saturday 6. Leave blank for any day.',
        (plan.weekdays || []).join(',')
      );
      if (days === null) return;
      saveAndRender(updatePlan(
        plans, plan.id,
        {
          name,
          description,
          weekdays: days.trim()
            ? days.split(',').map(value => Number(value.trim()))
            : []
        },
        config
      ));
    });
    if (plan.ignoredRouteCount) {
      button('Remove stale routes', () => {
        const valid = new Set(eligibleRoutes.map(route => route.path));
        saveAndRender(plans.map(record => {
          if (record.id !== plan.id) return record;
          const routes = record.routes
            .filter(item => valid.has(routePath(item.route)));
          const paths = new Set(routes.map(item => routePath(item.route)));
          return {
            ...record,
            routes,
            checkIns: record.checkIns
              .filter(item => paths.has(routePath(item.route))),
            currentIndex:
              routes.length
                ? Math.min(record.currentIndex || 0, routes.length - 1)
                : 0,
            updatedAt: new Date().toISOString()
          };
        }));
      });
    }
    button('Delete plan', () => {
      if (confirm(`Delete “${plan.name}”?`)) {
        saveAndRender(deletePlan(plans, plan.id));
      }
    });
    article.appendChild(actions);

    const list = document.createElement('ol');
    list.className = 'planner-route-list';
    if (!plan.routes.length) {
      const empty = document.createElement('li');
      empty.textContent = 'No valid routes in this plan.';
      list.appendChild(empty);
    } else {
      plan.routes.forEach((route, index) => {
        const row = document.createElement('li');
        row.className =
          index === plan.currentIndex
            ? 'planner-route-row is-current'
            : 'planner-route-row';
        const body = document.createElement('div');
        createText(body, 'strong', displayTitle(route));
        createText(body, 'span',
          `${route.category} · ${route.status}`, 'planner-meta');
        row.appendChild(body);

        const rowActions = document.createElement('div');
        rowActions.className = 'planner-row-actions';
        const open = document.createElement('a');
        open.className = 'btn secondary';
        open.href = route.path;
        open.textContent = 'Open';
        rowActions.appendChild(open);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn secondary';
        remove.textContent = 'Remove';
        remove.addEventListener('click', () =>
          saveAndRender(removeRouteFromPlan(
            plans, plan.id, route.route, config
          )));
        rowActions.appendChild(remove);
        row.appendChild(rowActions);
        list.appendChild(row);
      });
    }
    article.appendChild(list);

    if (plan.checkIns.length) {
      const details = document.createElement('details');
      details.className = 'planner-history';
      const summary = document.createElement('summary');
      summary.textContent = `Recent check-ins (${plan.checkIns.length})`;
      details.appendChild(summary);
      const history = document.createElement('ul');
      plan.checkIns.slice(0, 14).forEach(checkIn => {
        const item = document.createElement('li');
        const route = plan.routes.find(
          record => routePath(record.route) === routePath(checkIn.route)
        );
        item.textContent =
          `${checkIn.date} · ${displayTitle(route || checkIn)} · ${formatDate(checkIn.completedAt)}`;
        history.appendChild(item);
      });
      details.appendChild(history);
      article.appendChild(details);
    }

    return article;
  };

  const renderPlans = () => {
    const resolved = resolvePlans(plans, eligibleRoutes);
    const filtered = filterPlans(resolved.plans, planSearch.value);
    planHost.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('article');
      empty.className = 'card';
      createText(empty, 'h2',
        plans.length ? 'No plans match' : 'No local plans yet');
      createText(empty, 'p',
        plans.length
          ? 'Change the plan search.'
          : 'Create a plan from an existing collection or begin with an empty plan.');
      planHost.appendChild(empty);
    } else {
      filtered.forEach(plan => planHost.appendChild(createPlanCard(plan)));
    }
  };

  const renderRoutes = () => {
    const records = filterEligibleRoutes(
      eligibleRoutes, routeSearch.value
    ).slice(0, 30);
    routeHost.replaceChildren();
    if (!records.length) {
      const empty = document.createElement('article');
      empty.className = 'card';
      createText(empty, 'h3', 'No eligible routes match');
      createText(empty, 'p',
        'Try Tamil or English title, category or publication state.');
      routeHost.appendChild(empty);
      return;
    }
    records.forEach(route => {
      const card = document.createElement('article');
      card.className = 'card planner-route-card';
      const badges = document.createElement('div');
      badges.className = 'planner-badges';
      createText(badges, 'span', route.category, 'pill');
      createText(badges, 'span', route.status, 'pill');
      card.appendChild(badges);
      createText(card, 'h3', displayTitle(route));
      if (route.summary) createText(card, 'p', route.summary);
      const actions = document.createElement('div');
      actions.className = 'planner-actions';
      const open = document.createElement('a');
      open.className = 'btn secondary';
      open.href = route.path;
      open.textContent = 'Open route';
      actions.appendChild(open);
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn';
      add.textContent = 'Add to selected plan';
      add.disabled = !plans.length;
      add.addEventListener('click', () => {
        const planId = routeTarget.value;
        if (!planId) {
          status.textContent = 'Choose a target plan first.';
          routeTarget.focus();
          return;
        }
        const next = addRouteToPlan(plans, planId, route.path, config);
        if (JSON.stringify(next) === JSON.stringify(plans)) {
          status.textContent =
            'That route is already present or the plan is full.';
          return;
        }
        saveAndRender(next);
      });
      actions.appendChild(add);
      card.appendChild(actions);
      routeHost.appendChild(card);
    });
  };

  const render = () => {
    const metrics = buildPlannerMetrics(
      plans, eligibleRoutes, config, new Date()
    );
    const values = {
      plannerPlanCount: metrics.plans,
      plannerRouteCount: metrics.routes,
      plannerDueCount: metrics.dueToday,
      plannerCheckedCount: metrics.checkedInToday,
      plannerIgnoredCount: metrics.ignoredRoutes
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    });
    renderTargetPlans();
    renderPlans();
    renderRoutes();
    status.textContent =
      'Practice plans and check-ins remain in this browser. No notification or spiritual outcome is implied.';
  };

  createForm.addEventListener('submit', event => {
    event.preventDefault();
    const sourceCollection = collections.find(
      item => item.id === collectionSelect.value
    ) || null;
    const weekdays = [
      ...weekdayHost.querySelectorAll('input:checked')
    ].map(input => Number(input.value));
    const next = createPlan(
      plans,
      {
        name: nameInput.value,
        description: descriptionInput.value,
        sourceCollection,
        weekdays
      },
      config
    );
    if (next.length === plans.length) {
      status.textContent =
        plans.length >= Number(config.maximumPlans)
          ? 'Maximum plan count reached.'
          : 'Enter a valid plan name.';
      return;
    }
    if (saveAndRender(next)) {
      createForm.reset();
      weekdayHost.querySelectorAll('input')
        .forEach(input => { input.checked = false; });
    }
  });

  planSearch.addEventListener('input', renderPlans);
  routeSearch.addEventListener('input', renderRoutes);
  routeTarget.addEventListener('change', renderRoutes);
  routeReset.addEventListener('click', () => {
    routeSearch.value = '';
    renderRoutes();
    routeSearch.focus();
  });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) {
      plans = loadPlans(undefined, config);
      render();
    }
    if (event.key === COLLECTIONS_STORAGE_KEY) {
      collections = loadCollections(
        undefined,
        config.collectionsStorageKey || COLLECTIONS_STORAGE_KEY
      );
      renderSourceCollections();
    }
  });

  renderSourceCollections();
  render();
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialise);
}
