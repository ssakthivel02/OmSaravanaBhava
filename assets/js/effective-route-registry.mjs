export const CONSUMER_RELEASE = 237;
export const HISTORICAL_REGISTRY_PATH = '/data/site-routes.json';
export const EFFECTIVE_OVERRIDES_PATH =
  '/data/site-routes-effective-overrides.json';
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
      path: normaliseRoutePath(base.path) || String(base.path ?? '')
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

export const composeEffectiveRegistry = (
  historicalPayload,
  overridesPayload
) => {
  const historicalErrors = validateHistoricalRegistry(historicalPayload);
  const overrideErrors = validateEffectiveOverrides(overridesPayload);
  if (historicalErrors.length || overrideErrors.length) {
    throw new Error(
      [...historicalErrors, ...overrideErrors].join(' ')
    );
  }

  const overrides = buildOverrideMap(overridesPayload);
  const matched = new Set();
  const routes = historicalPayload.routes.map(record => {
    const path = normaliseRoutePath(record?.path);
    const override = overrides.get(path);
    if (override) matched.add(path);
    return mergeRouteRecord(record, override);
  });
  const unmatchedOverrides = [...overrides.keys()]
    .filter(path => !matched.has(path))
    .sort();

  return {
    ...historicalPayload,
    release: Number(historicalPayload.release) || 0,
    effectiveRelease: CONSUMER_RELEASE,
    effectiveRegistryRelease: Number(overridesPayload.release) || 0,
    effectiveRegistryGenerated: String(
      overridesPayload.generated || ''
    ),
    effectiveRegistryMode: 'explicit-overrides',
    effectiveRegistrySources: {
      historical: HISTORICAL_REGISTRY_PATH,
      overrides: EFFECTIVE_OVERRIDES_PATH
    },
    effectiveRegistryDiagnostics: {
      historicalCount: historicalPayload.routes.length,
      overrideCount: overrides.size,
      appliedCount: matched.size,
      unmatchedOverrides
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
  effectiveRegistryMode: 'historical-fallback',
  effectiveRegistrySources: {
    historical: HISTORICAL_REGISTRY_PATH,
    overrides: EFFECTIVE_OVERRIDES_PATH
  },
  effectiveRegistryDiagnostics: {
    historicalCount: Array.isArray(historicalPayload?.routes)
      ? historicalPayload.routes.length
      : 0,
    overrideCount: 0,
    appliedCount: 0,
    unmatchedOverrides: [],
    warning: String(error?.message || error || 'Overrides unavailable')
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
      const effective = composeEffectiveRegistry(
        historical,
        overrides
      );
      globalThis.document?.documentElement?.setAttribute(
        'data-effective-route-registry',
        'ready'
      );
      globalThis.dispatchEvent?.(
        new CustomEvent('osb:effective-route-registry-ready', {
          detail: {
            release: CONSUMER_RELEASE,
            overrides: effective.effectiveRegistryDiagnostics.appliedCount,
            mode: effective.effectiveRegistryMode
          }
        })
      );
      return effective;
    } catch (error) {
      if (strict) throw error;
      console.warn(
        '[OmSaravanaBhava] Effective route overrides unavailable',
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
  if (registry?.effectiveRegistryMode === 'explicit-overrides') {
    return `Effective registry loaded: ${diagnostics.historicalCount || 0} routes, ${diagnostics.appliedCount || 0} canonical overrides.`;
  }
  return `Historical registry fallback: ${diagnostics.historicalCount || 0} routes. Canonical overrides were unavailable.`;
};
