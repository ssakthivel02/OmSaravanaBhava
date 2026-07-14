export const RELEASE = 217;
export const STORAGE_KEY = 'osb-accessibility-preferences-v1';
export const STYLESHEET_PATH = '/assets/css/accessibility-preferences.css';

export const DEFAULT_PREFERENCES = Object.freeze({
  largeText: false,
  highContrast: false,
  reducedMotion: false,
  underlinedLinks: false
});

export const PREFERENCE_CLASSES = Object.freeze({
  largeText: 'osb-a11y-large-text',
  highContrast: 'osb-a11y-high-contrast',
  reducedMotion: 'osb-a11y-reduced-motion',
  underlinedLinks: 'osb-a11y-underlined-links'
});

const safeStorage = storage => {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const normalisePreferences = value => {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(
    Object.keys(DEFAULT_PREFERENCES).map(key => [key, source[key] === true])
  );
};

export const loadPreferences = storage => {
  const target = safeStorage(storage);
  if (!target) return {...DEFAULT_PREFERENCES};
  try {
    return normalisePreferences(JSON.parse(target.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return {...DEFAULT_PREFERENCES};
  }
};

export const savePreferences = (preferences, storage) => {
  const target = safeStorage(storage);
  if (!target) return false;
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(normalisePreferences(preferences)));
    return true;
  } catch {
    return false;
  }
};

export const ensureAccessibilityStylesheet = (
  documentRef = globalThis.document,
  path = STYLESHEET_PATH
) => {
  if (!documentRef?.head || !documentRef.createElement) return null;
  const existing = documentRef.getElementById?.('osb-accessibility-preferences-css');
  if (existing) return existing;
  const link = documentRef.createElement('link');
  link.id = 'osb-accessibility-preferences-css';
  link.rel = 'stylesheet';
  link.href = path;
  documentRef.head.appendChild(link);
  return link;
};

export const applyPreferences = (
  preferences,
  documentRef = globalThis.document
) => {
  const clean = normalisePreferences(preferences);
  const root = documentRef?.documentElement;
  if (!root?.classList) return clean;

  ensureAccessibilityStylesheet(documentRef);
  root.classList.add('osb-a11y-ready');

  Object.entries(PREFERENCE_CLASSES).forEach(([key, className]) => {
    root.classList.toggle(className, clean[key]);
    root.dataset[`osbA11y${key[0].toUpperCase()}${key.slice(1)}`] =
      clean[key] ? 'on' : 'off';
  });

  return clean;
};

export const applyStoredPreferences = (
  storage,
  documentRef = globalThis.document
) => applyPreferences(loadPreferences(storage), documentRef);

export const updatePreference = (
  name,
  enabled,
  storage,
  documentRef = globalThis.document
) => {
  if (!(name in DEFAULT_PREFERENCES)) {
    throw new TypeError(`Unknown accessibility preference: ${name}`);
  }
  const preferences = loadPreferences(storage);
  preferences[name] = enabled === true;
  if (!savePreferences(preferences, storage)) {
    throw new Error('Browser storage is unavailable.');
  }
  return applyPreferences(preferences, documentRef);
};

export const resetPreferences = (
  storage,
  documentRef = globalThis.document
) => {
  const preferences = {...DEFAULT_PREFERENCES};
  const target = safeStorage(storage);
  if (target) {
    try {
      target.removeItem(STORAGE_KEY);
    } catch {
      savePreferences(preferences, target);
    }
  }
  return applyPreferences(preferences, documentRef);
};

export const activePreferenceLabels = preferences => {
  const clean = normalisePreferences(preferences);
  const labels = [];
  if (clean.largeText) labels.push('Large text');
  if (clean.highContrast) labels.push('High contrast');
  if (clean.reducedMotion) labels.push('Reduced motion');
  if (clean.underlinedLinks) labels.push('Underlined links');
  return labels;
};

const initialiseAccessibilityCentre = () => {
  const form = document.getElementById('accessibilityPreferences');
  const status = document.getElementById('accessibilityStatus');
  const reset = document.getElementById('accessibilityReset');
  const active = document.getElementById('accessibilityActive');
  if (!form || !status || !reset || !active) return;

  const controls = Object.keys(DEFAULT_PREFERENCES)
    .map(name => form.elements.namedItem(name))
    .filter(Boolean);

  const render = preferences => {
    controls.forEach(control => {
      control.checked = preferences[control.name] === true;
    });
    const labels = activePreferenceLabels(preferences);
    active.textContent = labels.length
      ? labels.join(', ')
      : 'Default presentation';
  };

  const applyFromForm = () => {
    const preferences = Object.fromEntries(
      controls.map(control => [control.name, control.checked])
    );
    if (!savePreferences(preferences)) {
      status.textContent = 'Browser storage is unavailable. Changes apply only until this page closes.';
      applyPreferences(preferences);
      render(preferences);
      return;
    }
    applyPreferences(preferences);
    render(preferences);
    status.textContent = 'Accessibility preferences saved in this browser.';
  };

  controls.forEach(control => {
    control.addEventListener('change', applyFromForm);
  });

  reset.addEventListener('click', () => {
    const preferences = resetPreferences();
    render(preferences);
    status.textContent = 'Accessibility preferences reset to defaults.';
    controls[0]?.focus();
  });

  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return;
    const preferences = applyStoredPreferences();
    render(preferences);
    status.textContent = 'Accessibility preferences were updated in another tab.';
  });

  const preferences = applyStoredPreferences();
  render(preferences);
  status.textContent = 'Preferences are stored only in this browser.';
};

if (typeof document !== 'undefined') {
  applyStoredPreferences();
  document.addEventListener('DOMContentLoaded', initialiseAccessibilityCentre);
}
