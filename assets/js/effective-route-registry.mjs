export const CONSUMER_RELEASE = 246;
export const HISTORICAL_REGISTRY_PATH = '/data/site-routes.json';
export const EFFECTIVE_OVERRIDES_PATH =
  '/data/site-routes-effective-overrides.json';
export const ROUTE_ADDITIONS_PATH = '/data/site-routes-additions.json';
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

const DEFAULT_FETCH_OPTIONS = Object.freeze({
  cache: 'no-store',
  credentials: 'same-origin',
  headers: {'Accept': 'application/json'}
});

let sharedPromise;

export const normaliseRoutePath = (
  value,
  origin = globalThis.location?.origin || CANONICAL_ORIGIN
) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, `${origin}/`);
    return url.origin === origin ? url.pathname : '';
  } catch {
    return '';
  }
};

export const normaliseStatus = value =>
  String(value ?? '').trim().toLocaleLowerCase();

export const fetchJson = async (
  path,
  fetcher = globalThis.fetch,
  options = DEFAULT_FETCH_OPTIONS
) => {
  if (typeof fetcher !== 'function') {
    throw new TypeError('Fetch API unavailable');
  }
  const response = await fetcher(path, options);
  if (!response?.ok) {
    throw new Error(`${path}: HTTP ${response?.status ?? 'unknown'}`);
  }
  const payload = await response.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError(`${path}: expected JSON object`);
  }
  return payload;
};

export const validateHistoricalRegistry = payload => {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Historical registry must be an object.'];
  }
  if (!Array.isArray(payload.routes)) {
    errors.push('Historical registry routes must be an array.');
  }
  const seen = new Set();
  (Array.isArray(payload.routes) ? payload.routes : []).forEach(
    (record, index) => {
      const path = normaliseRoutePath(record?.path);
      if (!path) {
        errors.push(`Historical route ${index} has an invalid path.`);
      } else if (seen.has(path)) {
        errors.push(`Historical route ${path} is duplicated.`);
      } else {
        seen.add(path);
      }
    }
  );
  return errors;
};

export const validateEffectiveOverrides = payload => {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Effective overrides must be an object.'];
  }
  if (!Number.isInteger(payload.release) || payload.release < 1) {
    errors.push('Override release must be a positive integer.');
  }
  if (!Array.isArray(payload.records)) {
    errors.push('Override records must be an array.');
  }
  if (
    Array.isArray(payload.records) &&
    Number(payload.recordCount) !== payload.records.length
  ) {
    errors.push('Override recordCount does not match records length.');
  }
  const seen = new Set();
  (Array.isArray(payload.records) ? payload.records : []).forEach(
    (record, index) => {
      const path = normaliseRoutePath(record?.path);
      if (!path) {
        errors.push(`Override ${index} has an invalid path.`);
      } else if (seen.has(path)) {
        errors.push(`Override ${path} is duplicated.`);
      } else {
        seen.add(path);
      }
      if (!normaliseStatus(record?.status)) {
        errors.push(`Override ${path || index} has no status.`);
      }
    }
  );
  return errors;
};

export const validateRouteAdditions = payload => {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Route additions must be an object.'];
  }
  if (!Array.isArray(payload.records)) {
    errors.push('Route additions records must be an array.');
  }
  if (
    Array.isArray(payload.records) &&
    Number(payload.recordCount) !== payload.records.length
  ) {
    errors.push('Route additions recordCount does not match records length.');
  }
  const seen = new Set();
  (Array.isArray(payload.records) ? payload.records : []).forEach(
    (record, index) => {
      const path = normaliseRoutePath(record?.path);
      if (!path) {
        errors.push(`Route addition ${index} has an invalid path.`);
      } else if (seen.has(path)) {
        errors.push(`Route addition ${path} is duplicated.`);
      } else {
        seen.add(path);
      }
      if (!String(record?.titleEn || record?.titleTa || '').trim()) {
        errors.push(`Route addition ${path || index} has no title.`);
      }
      if (!normaliseStatus(record?.status)) {
        errors.push(`Route addition ${path || index} has no status.`);
      }
    }
  );
  return errors;
};

export const buildOverrideMap = payload => new Map(
  (Array.isArray(payload?.records) ? payload.records : [])
    .map(record => [normaliseRoutePath(record?.path), record])
    .filter(([path]) => path)
);

export const mergeRouteRecord = (record, override) => {
  const base = record && typeof record === 'object' ? record : {};
  if (!override || typeof override !== 'object') {
    return {
      ...base,
      path: normaliseRoutePath(base.path) || String(base.path ?? ''),
      readingEligible: base.readingEligible !== false
    };
  }
  return {
    ...base,
    ...override,
    path: normaliseRoutePath(base.path || override.path),
    status: String(override.status || base.status || ''),
    summary: String(override.summary || base.summary || ''),
    publicationStatusPrevious: String(
      override.publicationStatusPrevious || base.status || ''
    ),
    publicationStatusCanonical: String(
      override.publicationStatusCanonical ||
      override.status ||
      base.status ||
      ''
    ),
    publicationStatusSource: String(
      override.publicationStatusSource || EFFECTIVE_OVERRIDES_PATH
    ),
    publicationBoundaryRelease: Number(
      override.publicationBoundaryRelease
    ) || 0,
    readingEligible: override.readingEligible !== false,
    effectiveOverrideApplied: true
  };
};

const emptyAdditions = () => ({
  release: 0,
  generated: '',
  recordCount: 0,
  records: []
});

export const composeEffectiveRegistry = (
  historicalPayload,
  overridesPayload,
  additionsPayload = emptyAdditions()
) => {
  const historicalErrors = validateHistoricalRegistry(historicalPayload);
  const overrideErrors = validateEffectiveOverrides(overridesPayload);
  const additionErrors = validateRouteAdditions(additionsPayload);
  if (
    historicalErrors.length ||
    overrideErrors.length ||
    additionErrors.length
  ) {
    throw new Error(
      [...historicalErrors, ...overrideErrors, ...additionErrors].join(' ')
    );
  }

  const overrides = buildOverrideMap(overridesPayload);
  const matchedOverrides = new Set();
  const seenPaths = new Set();
  const routes = historicalPayload.routes.map(record => {
    const path = normaliseRoutePath(record?.path);
    const override = overrides.get(path);
    seenPaths.add(path);
    if (override) matchedOverrides.add(path);
    return mergeRouteRecord(record, override);
  });

  const duplicateAdditions = [];
  const appliedAdditions = [];
  additionsPayload.records.forEach(record => {
    const path = normaliseRoutePath(record?.path);
    if (seenPaths.has(path)) {
      duplicateAdditions.push(path);
      return;
    }
    const override = overrides.get(path);
    if (override) matchedOverrides.add(path);
    const merged = mergeRouteRecord(record, override);
    routes.push({
      ...merged,
      path,
      routeAdditionApplied: true,
      routeAdditionSource: ROUTE_ADDITIONS_PATH,
      routeAdditionRelease: Number(additionsPayload.release) || 0
    });
    seenPaths.add(path);
    appliedAdditions.push(path);
  });

  const unmatchedOverrides = [...overrides.keys()]
    .filter(path => !matchedOverrides.has(path))
    .sort();

  return {
    ...historicalPayload,
    release: Number(historicalPayload.release) || 0,
    effectiveRelease: CONSUMER_RELEASE,
    effectiveRegistryRelease: Number(overridesPayload.release) || 0,
    effectiveRegistryGenerated: String(
      overridesPayload.generated || ''
    ),
    routeAdditionsRelease: Number(additionsPayload.release) || 0,
    routeAdditionsGenerated: String(additionsPayload.generated || ''),
    effectiveRegistryMode: 'overrides-and-append-only-additions',
    effectiveRegistrySources: {
      historical: HISTORICAL_REGISTRY_PATH,
      overrides: EFFECTIVE_OVERRIDES_PATH,
      additions: ROUTE_ADDITIONS_PATH
    },
    effectiveRegistryDiagnostics: {
      historicalCount: historicalPayload.routes.length,
      overrideCount: overrides.size,
      appliedOverrideCount: matchedOverrides.size,
      additionCount: additionsPayload.records.length,
      appliedAdditionCount: appliedAdditions.length,
      appliedAdditions,
      duplicateAdditions,
      unmatchedOverrides,
      totalEffectiveRoutes: routes.length
    },
    routes
  };
};

export const createHistoricalFallback = (
  historicalPayload,
  error
) => ({
  ...historicalPayload,
  effectiveRelease: CONSUMER_RELEASE,
  effectiveRegistryRelease: 0,
  routeAdditionsRelease: 0,
  effectiveRegistryMode: 'historical-fallback',
  effectiveRegistrySources: {
    historical: HISTORICAL_REGISTRY_PATH,
    overrides: EFFECTIVE_OVERRIDES_PATH,
    additions: ROUTE_ADDITIONS_PATH
  },
  effectiveRegistryDiagnostics: {
    historicalCount: Array.isArray(historicalPayload?.routes)
      ? historicalPayload.routes.length
      : 0,
    overrideCount: 0,
    appliedOverrideCount: 0,
    additionCount: 0,
    appliedAdditionCount: 0,
    totalEffectiveRoutes: Array.isArray(historicalPayload?.routes)
      ? historicalPayload.routes.length
      : 0,
    unmatchedOverrides: [],
    warning: String(error?.message || error || 'Registry extensions unavailable')
  }
});

export const loadEffectiveRouteRegistry = async ({
  fetcher = globalThis.fetch,
  strict = false,
  cache = true
} = {}) => {
  const load = async () => {
    const historical = await fetchJson(
      HISTORICAL_REGISTRY_PATH,
      fetcher
    );
    try {
      const overrides = await fetchJson(
        EFFECTIVE_OVERRIDES_PATH,
        fetcher
      );
      let additions = emptyAdditions();
      try {
        additions = await fetchJson(ROUTE_ADDITIONS_PATH, fetcher);
      } catch (additionError) {
        console.warn(
          '[OmSaravanaBhava] Optional route additions unavailable',
          additionError
        );
      }
      const effective = composeEffectiveRegistry(
        historical,
        overrides,
        additions
      );
      globalThis.document?.documentElement?.setAttribute(
        'data-effective-route-registry',
        'ready'
      );
      globalThis.dispatchEvent?.(
        new CustomEvent('osb:effective-route-registry-ready', {
          detail: {
            release: CONSUMER_RELEASE,
            overrides:
              effective.effectiveRegistryDiagnostics.appliedOverrideCount,
            additions:
              effective.effectiveRegistryDiagnostics.appliedAdditionCount,
            mode: effective.effectiveRegistryMode
          }
        })
      );
      return effective;
    } catch (error) {
      if (strict) throw error;
      console.warn(
        '[OmSaravanaBhava] Effective route registry unavailable',
        error
      );
      globalThis.document?.documentElement?.setAttribute(
        'data-effective-route-registry',
        'fallback'
      );
      return createHistoricalFallback(historical, error);
    }
  };

  if (!cache) return load();
  if (!sharedPromise) {
    sharedPromise = load().catch(error => {
      sharedPromise = undefined;
      throw error;
    });
  }
  return sharedPromise;
};

export const clearEffectiveRouteRegistryCache = () => {
  sharedPromise = undefined;
};

export const registryStatusMessage = registry => {
  const diagnostics = registry?.effectiveRegistryDiagnostics || {};
  if (
    registry?.effectiveRegistryMode ===
    'overrides-and-append-only-additions'
  ) {
    return `Effective registry loaded: ${diagnostics.totalEffectiveRoutes || 0} routes, ${diagnostics.appliedOverrideCount || 0} canonical overrides and ${diagnostics.appliedAdditionCount || 0} governed additions.`;
  }
  return `Historical registry fallback: ${diagnostics.historicalCount || 0} routes. Registry extensions were unavailable.`;
};
