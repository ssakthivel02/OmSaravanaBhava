export const RELEASE = 227;
export const CONFIG_PATH = '/data/devotional-collections.json';
export const ROUTES_PATH = '/data/site-routes.json';
export const STORAGE_KEY = 'osb-devotional-collections-v1';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

const safeStorage = storage => {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const cleanText = (value, maximum) =>
  String(value ?? '').trim().slice(0, maximum);

export const normaliseCollectionRoute = value => {
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

export const routePath = value => {
  const route = normaliseCollectionRoute(value);
  if (!route) return '';
  try {
    return new URL(route, CANONICAL_ORIGIN).pathname;
  } catch {
    return '';
  }
};

export const normaliseIsoDate = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const sanitiseCollectionItem = (
  value,
  timestamp = new Date().toISOString()
) => {
  if (!value || typeof value !== 'object') return null;
  const route = normaliseCollectionRoute(value.route);
  if (!route) return null;
  return {
    route,
    addedAt: normaliseIsoDate(value.addedAt) || timestamp
  };
};

export const sanitiseCollection = (
  value,
  {
    maximumRoutesPerCollection = 50,
    maximumNameLength = 60,
    maximumDescriptionLength = 240,
    timestamp = new Date().toISOString()
  } = {}
) => {
  if (!value || typeof value !== 'object') return null;

  const id = cleanText(value.id, 180);
  const name = cleanText(value.name, maximumNameLength);
  if (!id || !name) return null;

  const seen = new Set();
  const items = [];
  (Array.isArray(value.items) ? value.items : [])
    .forEach(record => {
      const item = sanitiseCollectionItem(record, timestamp);
      const path = routePath(item?.route);
      if (!item || !path || seen.has(path)) return;
      seen.add(path);
      items.push(item);
    });

  return {
    id,
    name,
    description: cleanText(
      value.description,
      maximumDescriptionLength
    ),
    items: items.slice(
      0,
      Math.max(1, Number(maximumRoutesPerCollection) || 50)
    ),
    createdAt:
      normaliseIsoDate(value.createdAt) || timestamp,
    updatedAt:
      normaliseIsoDate(value.updatedAt) ||
      normaliseIsoDate(value.createdAt) ||
      timestamp
  };
};

export const loadCollections = (
  storage,
  config
) => {
  const target = safeStorage(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(
      target.getItem(STORAGE_KEY) || '[]'
    );
    if (!Array.isArray(parsed)) return [];

    const seen = new Set();
    const collections = [];
    parsed.forEach(record => {
      const collection = sanitiseCollection(record, {
        maximumRoutesPerCollection:
          config?.maximumRoutesPerCollection,
        maximumNameLength:
          config?.maximumNameLength,
        maximumDescriptionLength:
          config?.maximumDescriptionLength,
        timestamp:
          record?.updatedAt ||
          record?.createdAt ||
          new Date().toISOString()
      });
      if (!collection || seen.has(collection.id)) return;
      seen.add(collection.id);
      collections.push(collection);
    });

    return collections
      .sort((left, right) =>
        String(right.updatedAt)
          .localeCompare(String(left.updatedAt))
      )
      .slice(
        0,
        Math.max(
          1,
          Number(config?.maximumCollections) || 20
        )
      );
  } catch {
    return [];
  }
};

export const saveCollections = (
  collections,
  storage,
  config
) => {
  const target = safeStorage(storage);
  if (!target) return false;

  try {
    const clean = [];
    const seen = new Set();
    (Array.isArray(collections) ? collections : [])
      .forEach(record => {
        const collection = sanitiseCollection(record, {
          maximumRoutesPerCollection:
            config?.maximumRoutesPerCollection,
          maximumNameLength:
            config?.maximumNameLength,
          maximumDescriptionLength:
            config?.maximumDescriptionLength,
          timestamp:
            record?.updatedAt ||
            record?.createdAt ||
            new Date().toISOString()
        });
        if (!collection || seen.has(collection.id)) return;
        seen.add(collection.id);
        clean.push(collection);
      });

    target.setItem(
      STORAGE_KEY,
      JSON.stringify(
        clean.slice(
          0,
          Math.max(
            1,
            Number(config?.maximumCollections) || 20
          )
        )
      )
    );
    return true;
  } catch {
    return false;
  }
};

export const createCollection = (
  collections,
  {
    id,
    name,
    description = '',
    timestamp = new Date().toISOString()
  },
  config
) => {
  const previous = Array.isArray(collections)
    ? [...collections]
    : [];

  if (
    previous.length >=
    Math.max(1, Number(config?.maximumCollections) || 20)
  ) {
    return previous;
  }

  const generatedId =
    cleanText(id, 180) ||
    (
      globalThis.crypto?.randomUUID?.() ||
      `collection-${timestamp.replace(/[^0-9]/g, '')}`
    );

  const collection = sanitiseCollection({
    id: generatedId,
    name,
    description,
    items: [],
    createdAt: timestamp,
    updatedAt: timestamp
  }, {
    maximumRoutesPerCollection:
      config?.maximumRoutesPerCollection,
    maximumNameLength:
      config?.maximumNameLength,
    maximumDescriptionLength:
      config?.maximumDescriptionLength,
    timestamp
  });

  if (!collection) return previous;

  return [
    collection,
    ...previous.filter(
      item => item.id !== collection.id
    )
  ].slice(
    0,
    Math.max(1, Number(config?.maximumCollections) || 20)
  );
};

export const updateCollection = (
  collections,
  id,
  changes,
  config,
  timestamp = new Date().toISOString()
) => {
  const targetId = cleanText(id, 180);
  return (Array.isArray(collections) ? collections : [])
    .map(record => {
      if (record.id !== targetId) return record;
      return sanitiseCollection({
        ...record,
        name:
          changes?.name === undefined
            ? record.name
            : changes.name,
        description:
          changes?.description === undefined
            ? record.description
            : changes.description,
        updatedAt: timestamp
      }, {
        maximumRoutesPerCollection:
          config?.maximumRoutesPerCollection,
        maximumNameLength:
          config?.maximumNameLength,
        maximumDescriptionLength:
          config?.maximumDescriptionLength,
        timestamp
      }) || record;
    });
};

export const deleteCollection = (
  collections,
  id
) => {
  const targetId = cleanText(id, 180);
  return (Array.isArray(collections) ? collections : [])
    .filter(record => record.id !== targetId);
};

export const addRouteToCollection = (
  collections,
  collectionId,
  route,
  config,
  timestamp = new Date().toISOString()
) => {
  const path = routePath(route);
  if (!path) return Array.isArray(collections)
    ? [...collections]
    : [];

  return (Array.isArray(collections) ? collections : [])
    .map(record => {
      if (record.id !== collectionId) return record;

      const existing = Array.isArray(record.items)
        ? record.items
        : [];
      if (
        existing.some(
          item => routePath(item.route) === path
        )
      ) {
        return record;
      }
      if (
        existing.length >=
        Math.max(
          1,
          Number(config?.maximumRoutesPerCollection) || 50
        )
      ) {
        return record;
      }

      return {
        ...record,
        items: [
          ...existing,
          {
            route: normaliseCollectionRoute(route),
            addedAt: timestamp
          }
        ],
        updatedAt: timestamp
      };
    });
};

export const removeRouteFromCollection = (
  collections,
  collectionId,
  route,
  timestamp = new Date().toISOString()
) => {
  const path = routePath(route);
  return (Array.isArray(collections) ? collections : [])
    .map(record => {
      if (record.id !== collectionId) return record;
      return {
        ...record,
        items: (Array.isArray(record.items)
          ? record.items
          : []
        ).filter(
          item => routePath(item.route) !== path
        ),
        updatedAt: timestamp
      };
    });
};

export const moveRouteInCollection = (
  collections,
  collectionId,
  route,
  direction,
  timestamp = new Date().toISOString()
) => {
  const path = routePath(route);
  const delta = direction === 'up' ? -1 : 1;

  return (Array.isArray(collections) ? collections : [])
    .map(record => {
      if (record.id !== collectionId) return record;
      const items = [...(Array.isArray(record.items)
        ? record.items
        : [])];
      const index = items.findIndex(
        item => routePath(item.route) === path
      );
      const target = index + delta;
      if (
        index < 0 ||
        target < 0 ||
        target >= items.length
      ) {
        return record;
      }
      [items[index], items[target]] =
        [items[target], items[index]];
      return {
        ...record,
        items,
        updatedAt: timestamp
      };
    });
};

export const normaliseEligibleRoutes = (
  routesPayload,
  config
) => {
  const allowed = new Set(
    (Array.isArray(config?.allowedRouteStatuses)
      ? config.allowedRouteStatuses
      : []
    ).map(value =>
      String(value).trim().toLocaleLowerCase()
    )
  );
  const excluded = new Set(
    (Array.isArray(config?.excludedRouteStatuses)
      ? config.excludedRouteStatuses
      : []
    ).map(value =>
      String(value).trim().toLocaleLowerCase()
    )
  );
  const excludedCategories = new Set(
    (Array.isArray(config?.excludedCategories)
      ? config.excludedCategories
      : []
    ).map(value =>
      String(value).trim().toLocaleLowerCase()
    )
  );

  const seen = new Set();
  const routes = [];

  (Array.isArray(routesPayload?.routes)
    ? routesPayload.routes
    : []
  ).forEach(record => {
    const path = routePath(record?.path);
    const status = String(record?.status ?? '')
      .trim()
      .toLocaleLowerCase();
    const category = String(record?.category ?? '')
      .trim();

    if (
      !path ||
      seen.has(path) ||
      excluded.has(status) ||
      (
        allowed.size > 0 &&
        !allowed.has(status)
      ) ||
      excludedCategories.has(
        category.toLocaleLowerCase()
      )
    ) {
      return;
    }

    seen.add(path);
    routes.push({
      path,
      route: path,
      titleTa: cleanText(record.titleTa, 180),
      titleEn:
        cleanText(record.titleEn || path, 180) ||
        path,
      category:
        cleanText(category || 'Published route', 100),
      status: status || 'published',
      summary: cleanText(record.summary, 500)
    });
  });

  return routes.sort((left, right) =>
    left.category.localeCompare(right.category) ||
    left.titleEn.localeCompare(right.titleEn)
  );
};

export const resolveCollections = (
  collections,
  eligibleRoutes
) => {
  const routeMap = new Map(
    (Array.isArray(eligibleRoutes)
      ? eligibleRoutes
      : []
    ).map(route => [route.path, route])
  );

  let ignoredRoutes = 0;
  const resolved = (Array.isArray(collections)
    ? collections
    : []
  ).map(collection => {
    const items = [];
    (Array.isArray(collection.items)
      ? collection.items
      : []
    ).forEach(item => {
      const path = routePath(item.route);
      const route = routeMap.get(path);
      if (!path || !route) {
        ignoredRoutes += 1;
        return;
      }
      items.push({
        ...item,
        ...route
      });
    });
    return {
      ...collection,
      items,
      storedItemCount:
        Array.isArray(collection.items)
          ? collection.items.length
          : 0,
      ignoredItemCount:
        (
          Array.isArray(collection.items)
            ? collection.items.length
            : 0
        ) - items.length
    };
  });

  return {
    collections: resolved,
    ignoredRoutes
  };
};

export const buildCollectionMetrics = (
  collections,
  eligibleRoutes,
  config
) => {
  const resolved = resolveCollections(
    collections,
    eligibleRoutes
  );
  return {
    collections:
      resolved.collections.length,
    routes:
      resolved.collections.reduce(
        (total, collection) =>
          total + collection.items.length,
        0
      ),
    ignoredRoutes:
      resolved.ignoredRoutes,
    maximumCollections:
      Number(config?.maximumCollections) || 20,
    maximumRoutesPerCollection:
      Number(config?.maximumRoutesPerCollection) || 50
  };
};

export const filterEligibleRoutes = (
  routes,
  query
) => {
  const needle = String(query)
    .trim()
    .toLocaleLowerCase();
  if (!needle) return Array.isArray(routes)
    ? [...routes]
    : [];

  return (Array.isArray(routes) ? routes : [])
    .filter(route =>
      [
        route.titleTa,
        route.titleEn,
        route.category,
        route.status,
        route.summary
      ].join(' ').toLocaleLowerCase()
        .includes(needle)
    );
};

export const filterCollections = (
  collections,
  query
) => {
  const needle = String(query)
    .trim()
    .toLocaleLowerCase();
  if (!needle) return Array.isArray(collections)
    ? [...collections]
    : [];

  return (Array.isArray(collections)
    ? collections
    : []
  ).filter(collection =>
    [
      collection.name,
      collection.description,
      ...(collection.items || []).flatMap(
        item => [
          item.titleTa,
          item.titleEn,
          item.category
        ]
      )
    ].join(' ').toLocaleLowerCase()
      .includes(needle)
  );
};

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
    throw new Error(
      `${path} returned HTTP ${response.status}`
    );
  }
  return response.json();
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

const displayTitle = route =>
  route.titleTa && route.titleEn
    ? `${route.titleTa} · ${route.titleEn}`
    : route.titleTa ||
      route.titleEn ||
      route.path;

const initialise = async () => {
  const status =
    document.getElementById('collectionsStatus');
  const createForm =
    document.getElementById('collectionsCreateForm');
  const nameInput =
    document.getElementById('collectionsName');
  const descriptionInput =
    document.getElementById('collectionsDescription');
  const collectionSearch =
    document.getElementById('collectionsSearch');
  const collectionHost =
    document.getElementById('collectionsList');
  const routeSearch =
    document.getElementById('collectionsRouteSearch');
  const routeHost =
    document.getElementById('collectionsRouteResults');
  const collectionSelect =
    document.getElementById('collectionsTarget');
  const resetRoutes =
    document.getElementById('collectionsRouteReset');

  if (
    !status || !createForm || !nameInput ||
    !descriptionInput || !collectionSearch ||
    !collectionHost || !routeSearch ||
    !routeHost || !collectionSelect ||
    !resetRoutes
  ) {
    return;
  }

  let config;
  let eligibleRoutes = [];
  let collections = [];

  try {
    const [loadedConfig, routesPayload] =
      await Promise.all([
        fetchJson(CONFIG_PATH),
        fetchJson(ROUTES_PATH)
      ]);
    config = loadedConfig;
    eligibleRoutes = normaliseEligibleRoutes(
      routesPayload,
      config
    );
    collections = loadCollections(
      undefined,
      config
    );
  } catch (error) {
    status.textContent =
      `Collections unavailable: ${String(
        error?.message || error
      )}`;
    return;
  }

  const saveAndRender = next => {
    collections = next;
    if (!saveCollections(
      collections,
      undefined,
      config
    )) {
      status.textContent =
        'Browser storage is unavailable.';
      return false;
    }
    window.dispatchEvent(
      new CustomEvent(
        'osb:collections-updated'
      )
    );
    render();
    return true;
  };

  const renderCollectionSelect = () => {
    const selected = collectionSelect.value;
    collectionSelect.replaceChildren();

    const placeholder =
      document.createElement('option');
    placeholder.value = '';
    placeholder.textContent =
      collections.length
        ? 'Choose a collection'
        : 'Create a collection first';
    collectionSelect.appendChild(placeholder);

    collections.forEach(collection => {
      const option =
        document.createElement('option');
      option.value = collection.id;
      option.textContent =
        `${collection.name} (${collection.items.length})`;
      collectionSelect.appendChild(option);
    });

    collectionSelect.value =
      collections.some(
        collection => collection.id === selected
      )
        ? selected
        : '';
  };

  const renderMetrics = () => {
    const metrics = buildCollectionMetrics(
      collections,
      eligibleRoutes,
      config
    );
    const values = {
      collectionsCount:
        metrics.collections,
      collectionsRouteCount:
        metrics.routes,
      collectionsIgnoredCount:
        metrics.ignoredRoutes,
      collectionsCapacity:
        `${metrics.maximumCollections} × ${metrics.maximumRoutesPerCollection}`
    };
    Object.entries(values).forEach(([id, value]) => {
      const element =
        document.getElementById(id);
      if (element) {
        element.textContent = String(value);
      }
    });
  };

  const createRouteRow = (
    collection,
    item,
    index
  ) => {
    const row = document.createElement('li');
    row.className = 'collections-route-row';

    const body = document.createElement('div');
    createText(body, 'strong', displayTitle(item));
    createText(
      body,
      'span',
      `${item.category} · ${item.status}`,
      'collections-meta'
    );
    row.appendChild(body);

    const actions = document.createElement('div');
    actions.className =
      'collections-route-actions';

    const open = document.createElement('a');
    open.className = 'btn secondary';
    open.href = item.path;
    open.textContent = 'Open';
    actions.appendChild(open);

    const up = document.createElement('button');
    up.type = 'button';
    up.className = 'btn secondary';
    up.textContent = '↑';
    up.title = 'Move up';
    up.disabled = index === 0;
    up.addEventListener('click', () => {
      saveAndRender(
        moveRouteInCollection(
          collections,
          collection.id,
          item.route,
          'up'
        )
      );
    });
    actions.appendChild(up);

    const down = document.createElement('button');
    down.type = 'button';
    down.className = 'btn secondary';
    down.textContent = '↓';
    down.title = 'Move down';
    down.disabled =
      index === collection.items.length - 1;
    down.addEventListener('click', () => {
      saveAndRender(
        moveRouteInCollection(
          collections,
          collection.id,
          item.route,
          'down'
        )
      );
    });
    actions.appendChild(down);

    const remove =
      document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn secondary';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      saveAndRender(
        removeRouteFromCollection(
          collections,
          collection.id,
          item.route
        )
      );
    });
    actions.appendChild(remove);

    row.appendChild(actions);
    return row;
  };

  const createCollectionCard =
    collection => {
      const article =
        document.createElement('article');
      article.className =
        'card collections-card';

      const heading =
        document.createElement('div');
      heading.className =
        'collections-card-heading';
      const titleWrap =
        document.createElement('div');
      createText(
        titleWrap,
        'h2',
        collection.name
      );
      if (collection.description) {
        createText(
          titleWrap,
          'p',
          collection.description
        );
      }
      heading.appendChild(titleWrap);

      const badges =
        document.createElement('div');
      badges.className =
        'collections-card-badges';
      createText(
        badges,
        'span',
        `${collection.items.length} route${collection.items.length === 1 ? '' : 's'}`,
        'pill'
      );
      if (collection.ignoredItemCount) {
        createText(
          badges,
          'span',
          `${collection.ignoredItemCount} stale`,
          'pill'
        );
      }
      heading.appendChild(badges);
      article.appendChild(heading);

      const actions =
        document.createElement('div');
      actions.className =
        'collections-card-actions';

      const edit =
        document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn secondary';
      edit.textContent = 'Rename or describe';
      edit.addEventListener('click', () => {
        const name = prompt(
          'Collection name',
          collection.name
        );
        if (name === null) return;
        const description = prompt(
          'Collection description',
          collection.description
        );
        if (description === null) return;
        saveAndRender(
          updateCollection(
            collections,
            collection.id,
            {name, description},
            config
          )
        );
      });
      actions.appendChild(edit);

      if (collection.ignoredItemCount) {
        const clean =
          document.createElement('button');
        clean.type = 'button';
        clean.className = 'btn secondary';
        clean.textContent =
          'Remove stale references';
        clean.addEventListener('click', () => {
          const validPaths = new Set(
            eligibleRoutes.map(
              route => route.path
            )
          );
          const next = collections.map(record => {
            if (record.id !== collection.id) {
              return record;
            }
            return {
              ...record,
              items: record.items.filter(
                item =>
                  validPaths.has(
                    routePath(item.route)
                  )
              ),
              updatedAt:
                new Date().toISOString()
            };
          });
          saveAndRender(next);
        });
        actions.appendChild(clean);
      }

      const removeCollection =
        document.createElement('button');
      removeCollection.type = 'button';
      removeCollection.className =
        'btn secondary';
      removeCollection.textContent =
        'Delete collection';
      removeCollection.addEventListener(
        'click',
        () => {
          if (
            !confirm(
              `Delete “${collection.name}”?`
            )
          ) {
            return;
          }
          saveAndRender(
            deleteCollection(
              collections,
              collection.id
            )
          );
        }
      );
      actions.appendChild(removeCollection);
      article.appendChild(actions);

      const list =
        document.createElement('ol');
      list.className =
        'collections-route-list';
      if (!collection.items.length) {
        const empty =
          document.createElement('li');
        empty.className =
          'collections-empty-route';
        empty.textContent =
          'No currently valid routes in this collection.';
        list.appendChild(empty);
      } else {
        collection.items.forEach(
          (item, index) =>
            list.appendChild(
              createRouteRow(
                collection,
                item,
                index
              )
            )
        );
      }
      article.appendChild(list);
      return article;
    };

  const renderCollections = () => {
    const resolved = resolveCollections(
      collections,
      eligibleRoutes
    );
    const filtered = filterCollections(
      resolved.collections,
      collectionSearch.value
    );

    collectionHost.replaceChildren();
    if (!filtered.length) {
      const empty =
        document.createElement('article');
      empty.className =
        'card collections-empty';
      createText(
        empty,
        'h2',
        collections.length
          ? 'No collections match'
          : 'No collections yet'
      );
      createText(
        empty,
        'p',
        collections.length
          ? 'Change the collection search.'
          : 'Create a named collection, then add routes from the current published route directory.'
      );
      collectionHost.appendChild(empty);
    } else {
      filtered.forEach(collection =>
        collectionHost.appendChild(
          createCollectionCard(collection)
        )
      );
    }
  };

  const createRouteCard = route => {
    const article =
      document.createElement('article');
    article.className =
      'card collections-route-card';

    const labels =
      document.createElement('div');
    labels.className =
      'collections-card-badges';
    createText(
      labels,
      'span',
      route.category,
      'pill'
    );
    createText(
      labels,
      'span',
      route.status,
      'pill'
    );
    article.appendChild(labels);

    createText(
      article,
      'h3',
      displayTitle(route)
    );
    if (route.summary) {
      createText(
        article,
        'p',
        route.summary
      );
    }

    const actions =
      document.createElement('div');
    actions.className =
      'collections-card-actions';

    const open =
      document.createElement('a');
    open.className = 'btn secondary';
    open.href = route.path;
    open.textContent = 'Open route';
    actions.appendChild(open);

    const add =
      document.createElement('button');
    add.type = 'button';
    add.className = 'btn';
    add.textContent = 'Add to selected';
    add.disabled = !collections.length;
    add.addEventListener('click', () => {
      const collectionId =
        collectionSelect.value;
      if (!collectionId) {
        status.textContent =
          'Choose a target collection first.';
        collectionSelect.focus();
        return;
      }
      const before = collections;
      const next = addRouteToCollection(
        collections,
        collectionId,
        route.path,
        config
      );
      const changed =
        JSON.stringify(before) !==
        JSON.stringify(next);
      if (!changed) {
        status.textContent =
          'That route is already present or the collection is full.';
        return;
      }
      saveAndRender(next);
      status.textContent =
        `${displayTitle(route)} added locally.`;
    });
    actions.appendChild(add);

    article.appendChild(actions);
    return article;
  };

  const renderRoutes = () => {
    const results = filterEligibleRoutes(
      eligibleRoutes,
      routeSearch.value
    ).slice(0, 30);

    routeHost.replaceChildren();
    if (!results.length) {
      const empty =
        document.createElement('article');
      empty.className =
        'card collections-empty';
      createText(
        empty,
        'h3',
        'No eligible routes match'
      );
      createText(
        empty,
        'p',
        'Try Tamil or English title, category or publication state.'
      );
      routeHost.appendChild(empty);
    } else {
      results.forEach(route =>
        routeHost.appendChild(
          createRouteCard(route)
        )
      );
    }
  };

  const render = () => {
    renderMetrics();
    renderCollectionSelect();
    renderCollections();
    renderRoutes();
    status.textContent =
      'Collections are stored only in this browser. Route titles are resolved from the current site directory.';
  };

  createForm.addEventListener(
    'submit',
    event => {
      event.preventDefault();
      const next = createCollection(
        collections,
        {
          name: nameInput.value,
          description:
            descriptionInput.value
        },
        config
      );

      if (next.length === collections.length) {
        status.textContent =
          collections.length >=
          Number(config.maximumCollections)
            ? 'Maximum collection count reached.'
            : 'Enter a valid collection name.';
        return;
      }

      if (saveAndRender(next)) {
        createForm.reset();
        status.textContent =
          'Collection created locally.';
      }
    }
  );

  collectionSearch.addEventListener(
    'input',
    renderCollections
  );
  routeSearch.addEventListener(
    'input',
    renderRoutes
  );
  collectionSelect.addEventListener(
    'change',
    renderRoutes
  );
  resetRoutes.addEventListener(
    'click',
    () => {
      routeSearch.value = '';
      renderRoutes();
      routeSearch.focus();
    }
  );

  window.addEventListener(
    'storage',
    event => {
      if (event.key !== STORAGE_KEY) return;
      collections = loadCollections(
        undefined,
        config
      );
      render();
    }
  );

  const candidate = new URLSearchParams(
    globalThis.location?.search || ''
  ).get('add');
  if (candidate) {
    const candidatePath = routePath(candidate);
    if (
      eligibleRoutes.some(
        route => route.path === candidatePath
      )
    ) {
      routeSearch.value = candidatePath;
    }
  }

  render();
};

if (typeof document !== 'undefined') {
  document.addEventListener(
    'DOMContentLoaded',
    initialise
  );
}
