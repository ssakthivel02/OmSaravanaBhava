export const RELEASE = 224;
export const CONFIG_PATH = '/data/reading-notes.json';
export const READING_CONFIG_PATH = '/data/reading-workspace.json';
export const ROUTES_PATH = '/data/site-routes.json';
export const STORAGE_KEY = 'osb-reading-notes-v1';
export const DEFAULT_MAX_ITEMS = 100;
export const DEFAULT_MAX_LENGTH = 500;
export const CANONICAL_ORIGIN = 'https://omsaravanabhava.org';

const safeStorage = storage => {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const normaliseNoteRoute = value => {
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
  const route = normaliseNoteRoute(value);
  if (!route) return '';
  try {
    return new URL(route, CANONICAL_ORIGIN).pathname;
  } catch {
    return '';
  }
};

export const slugifyHeading = (text, index = 0) => {
  const base = String(text ?? '')
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return `osb-section-${base || 'section'}-${Number(index) + 1}`;
};

export const sanitiseNoteRecord = (
  record,
  {
    maximumNoteLength = DEFAULT_MAX_LENGTH,
    allowedKinds = ['reflection', 'question', 'practice', 'reference'],
    timestamp = new Date().toISOString()
  } = {}
) => {
  if (!record || typeof record !== 'object') return null;
  const route = normaliseNoteRoute(record.route);
  if (!route) return null;

  const headingId = String(record.headingId ?? '')
    .trim()
    .replace(/^#/, '')
    .slice(0, 120);
  const headingLabel = String(record.headingLabel ?? '')
    .trim()
    .slice(0, 160);
  const note = String(record.note ?? '')
    .trim()
    .slice(0, Math.max(1, Number(maximumNoteLength) || DEFAULT_MAX_LENGTH));

  if (!note && !headingId) return null;

  const kindValue = String(record.kind ?? 'reflection')
    .trim()
    .toLocaleLowerCase();
  const allowed = new Set(
    (Array.isArray(allowedKinds) ? allowedKinds : [])
      .map(value =>
        typeof value === 'object'
          ? String(value.id ?? '').trim().toLocaleLowerCase()
          : String(value).trim().toLocaleLowerCase()
      )
      .filter(Boolean)
  );
  const kind = allowed.has(kindValue)
    ? kindValue
    : (allowed.values().next().value || 'reflection');

  const id = String(record.id ?? '').trim() ||
    `note-${timestamp.replace(/[^0-9]/g, '')}-${headingId || 'page'}`;

  return {
    id: id.slice(0, 180),
    route,
    titleTa: String(record.titleTa ?? '').trim().slice(0, 180),
    titleEn:
      String(record.titleEn ?? record.title ?? route).trim().slice(0, 180) ||
      route,
    category:
      String(record.category ?? 'Reading').trim().slice(0, 80) ||
      'Reading',
    status:
      String(record.status ?? 'published').trim().toLocaleLowerCase().slice(0, 80) ||
      'published',
    headingId,
    headingLabel,
    kind,
    note,
    createdAt: String(record.createdAt ?? timestamp),
    updatedAt: String(record.updatedAt ?? timestamp)
  };
};

export const loadNotes = (
  storage,
  maximumItems = DEFAULT_MAX_ITEMS,
  options = {}
) => {
  const target = safeStorage(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(target.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    const notes = [];
    parsed.forEach(record => {
      const note = sanitiseNoteRecord(record, {
        ...options,
        timestamp: record?.updatedAt || record?.createdAt
      });
      if (!note || seen.has(note.id)) return;
      seen.add(note.id);
      notes.push(note);
    });
    return notes
      .sort((left, right) =>
        String(right.updatedAt).localeCompare(String(left.updatedAt))
      )
      .slice(0, Math.max(1, Number(maximumItems) || DEFAULT_MAX_ITEMS));
  } catch {
    return [];
  }
};

export const saveNotes = (
  notes,
  storage,
  maximumItems = DEFAULT_MAX_ITEMS,
  options = {}
) => {
  const target = safeStorage(storage);
  if (!target) return false;
  try {
    const clean = [];
    const seen = new Set();
    (Array.isArray(notes) ? notes : []).forEach(record => {
      const note = sanitiseNoteRecord(record, {
        ...options,
        timestamp: record?.updatedAt || record?.createdAt
      });
      if (!note || seen.has(note.id)) return;
      seen.add(note.id);
      clean.push(note);
    });
    target.setItem(
      STORAGE_KEY,
      JSON.stringify(
        clean.slice(0, Math.max(1, Number(maximumItems) || DEFAULT_MAX_ITEMS))
      )
    );
    return true;
  } catch {
    return false;
  }
};

export const upsertNote = (
  notes,
  record,
  {
    maximumItems = DEFAULT_MAX_ITEMS,
    maximumNoteLength = DEFAULT_MAX_LENGTH,
    allowedKinds = ['reflection', 'question', 'practice', 'reference'],
    timestamp = new Date().toISOString()
  } = {}
) => {
  const incoming = sanitiseNoteRecord(record, {
    maximumNoteLength,
    allowedKinds,
    timestamp
  });
  if (!incoming) return Array.isArray(notes) ? [...notes] : [];

  const previous = (Array.isArray(notes) ? notes : [])
    .map(item => sanitiseNoteRecord(item, {
      maximumNoteLength,
      allowedKinds,
      timestamp: item?.updatedAt || item?.createdAt
    }))
    .filter(Boolean);

  const existing = previous.find(item => item.id === incoming.id);
  incoming.createdAt = existing?.createdAt || incoming.createdAt || timestamp;
  incoming.updatedAt = timestamp;

  return [
    incoming,
    ...previous.filter(item => item.id !== incoming.id)
  ].slice(0, Math.max(1, Number(maximumItems) || DEFAULT_MAX_ITEMS));
};

export const removeNote = (
  id,
  storage,
  maximumItems = DEFAULT_MAX_ITEMS,
  options = {}
) => {
  const targetId = String(id ?? '').trim();
  const notes = loadNotes(storage, maximumItems, options)
    .filter(note => note.id !== targetId);
  saveNotes(notes, storage, maximumItems, options);
  return notes;
};

export const clearNotes = storage => {
  const target = safeStorage(storage);
  if (!target) return false;
  try {
    target.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};

export const filterNotes = (
  notes,
  {
    query = '',
    kind = 'all',
    route = 'all'
  } = {}
) => {
  const needle = String(query).trim().toLocaleLowerCase();
  return (Array.isArray(notes) ? notes : [])
    .filter(note => {
      if (kind !== 'all' && note.kind !== kind) return false;
      if (route !== 'all' && routePath(note.route) !== route) return false;
      if (!needle) return true;
      const haystack = [
        note.titleTa,
        note.titleEn,
        note.category,
        note.status,
        note.headingLabel,
        note.kind,
        note.note
      ].join(' ').toLocaleLowerCase();
      return haystack.includes(needle);
    })
    .sort((left, right) =>
      String(right.updatedAt).localeCompare(String(left.updatedAt))
    );
};

export const buildNotesMetrics = notes => {
  const items = Array.isArray(notes) ? notes : [];
  return {
    total: items.length,
    routes: new Set(items.map(item => routePath(item.route)).filter(Boolean)).size,
    sectionBookmarks: items.filter(item => Boolean(item.headingId)).length,
    writtenNotes: items.filter(item => Boolean(item.note)).length
  };
};

export const collectSectionOptions = root => {
  if (!root?.querySelectorAll) return [];
  const headings = [...root.querySelectorAll('main h2, main h3')]
    .filter(heading =>
      !heading.closest(
        '#osb-reader-toolbar, .reading-notes-dialog, .reading-workspace-controls'
      )
    );
  const seen = new Set();
  return headings.map((heading, index) => {
    const label = String(heading.textContent ?? '').trim();
    if (!label) return null;
    let id = String(heading.id ?? '').trim();
    if (!id) {
      id = slugifyHeading(label, index);
      let candidate = id;
      let suffix = 2;
      while (seen.has(candidate) || document.getElementById(candidate)) {
        candidate = `${id}-${suffix}`;
        suffix += 1;
      }
      id = candidate;
      heading.id = id;
    }
    seen.add(id);
    return {id, label};
  }).filter(Boolean);
};

export const buildNoteHref = note => {
  const path = routePath(note?.route);
  if (!path) return '';
  return note.headingId
    ? `${path}#${encodeURIComponent(note.headingId)}`
    : path;
};

const fetchJson = async (path, fetcher = globalThis.fetch) => {
  if (typeof fetcher !== 'function') throw new Error('Fetch API unavailable');
  const response = await fetcher(path, {
    cache: 'default',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
};

const routeIsEligible = (record, readingConfig) => {
  const path = routePath(record?.path);
  if (!path) return false;

  const allowedStatuses = new Set(
    (readingConfig?.allowedStatuses || [])
      .map(value => String(value).trim().toLocaleLowerCase())
  );
  if (
    allowedStatuses.size &&
    !allowedStatuses.has(String(record.status ?? '').trim().toLocaleLowerCase())
  ) {
    return false;
  }

  const excluded = new Set(
    (readingConfig?.excludedPaths || []).map(routePath)
  );
  if (excluded.has(path)) return false;

  if ((readingConfig?.eligibleExactPaths || []).map(routePath).includes(path)) {
    return true;
  }

  return (readingConfig?.eligiblePathPrefixes || [])
    .map(routePath)
    .some(prefix => path.startsWith(prefix));
};

export const loadNotesModel = async (
  fetcher = globalThis.fetch,
  storage = undefined
) => {
  const [config, readingConfig, routesPayload] = await Promise.all([
    fetchJson(CONFIG_PATH, fetcher),
    fetchJson(READING_CONFIG_PATH, fetcher),
    fetchJson(ROUTES_PATH, fetcher)
  ]);

  const routes = (Array.isArray(routesPayload?.routes) ? routesPayload.routes : [])
    .filter(record => routeIsEligible(record, readingConfig))
    .map(record => ({
      path: routePath(record.path),
      titleTa: String(record.titleTa ?? '').trim(),
      titleEn: String(record.titleEn ?? record.path).trim() || record.path,
      category: String(record.category ?? 'Reading').trim() || 'Reading',
      status: String(record.status ?? 'published').trim().toLocaleLowerCase(),
      summary: String(record.summary ?? '').trim()
    }));

  const allowedKinds = (config.allowedKinds || []).map(item => item.id);
  return {
    config,
    readingConfig,
    routes,
    routeMap: new Map(routes.map(route => [route.path, route])),
    notes: loadNotes(
      storage,
      config.maximumItems,
      {
        maximumNoteLength: config.maximumNoteLength,
        allowedKinds
      }
    )
  };
};

const createText = (parent, tag, text, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(text);
  parent.appendChild(element);
  return element;
};

const displayTitle = record =>
  record.titleTa && record.titleEn
    ? `${record.titleTa} · ${record.titleEn}`
    : record.titleTa || record.titleEn || record.route;

const formatDate = value => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const downloadJson = (filename, value) => {
  const blob = new Blob(
    [JSON.stringify(value, null, 2)],
    {type: 'application/json'}
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const ensureDialog = model => {
  let dialog = document.getElementById('readingNotesDialog');
  if (dialog) return dialog;

  dialog = document.createElement('dialog');
  dialog.id = 'readingNotesDialog';
  dialog.className = 'reading-notes-dialog';
  dialog.innerHTML = `
    <form method="dialog" id="readingNotesForm">
      <div class="reading-notes-dialog-heading">
        <div>
          <span class="pill">Browser-local</span>
          <h2 id="readingNotesDialogTitle">Add reading note</h2>
        </div>
        <button type="button" class="btn secondary" id="readingNotesClose">Close</button>
      </div>
      <input type="hidden" id="readingNotesId">
      <input type="hidden" id="readingNotesRoute">
      <label for="readingNotesSection">Section bookmark
        <select id="readingNotesSection"></select>
      </label>
      <label for="readingNotesKind">Note kind
        <select id="readingNotesKind"></select>
      </label>
      <label for="readingNotesText">Your note
        <textarea id="readingNotesText" rows="7" maxlength="${Number(model.config.maximumNoteLength) || DEFAULT_MAX_LENGTH}" placeholder="Add your own reflection, question or practice note. Leave blank to save only the section bookmark."></textarea>
      </label>
      <p id="readingNotesCounter">0/${Number(model.config.maximumNoteLength) || DEFAULT_MAX_LENGTH}</p>
      <div class="reading-notes-dialog-actions">
        <button type="submit" class="btn" id="readingNotesSave">Save locally</button>
        <button type="button" class="btn secondary" id="readingNotesCancel">Cancel</button>
      </div>
      <p class="reading-notes-boundary">Selected devotional text is not stored. Only your note, route metadata and optional heading label are saved in this browser.</p>
    </form>
  `;
  document.body.appendChild(dialog);

  const kindSelect = dialog.querySelector('#readingNotesKind');
  (model.config.allowedKinds || []).forEach(kind => {
    const option = document.createElement('option');
    option.value = kind.id;
    option.textContent = kind.label;
    kindSelect.appendChild(option);
  });

  const textarea = dialog.querySelector('#readingNotesText');
  const counter = dialog.querySelector('#readingNotesCounter');
  textarea.addEventListener('input', () => {
    counter.textContent =
      `${textarea.value.length}/${Number(model.config.maximumNoteLength) || DEFAULT_MAX_LENGTH}`;
  });

  const close = () => dialog.close();
  dialog.querySelector('#readingNotesClose').addEventListener('click', close);
  dialog.querySelector('#readingNotesCancel').addEventListener('click', close);

  return dialog;
};

const saveDialogRecord = (dialog, model, rerender) => {
  const id = dialog.querySelector('#readingNotesId').value;
  const route = routePath(dialog.querySelector('#readingNotesRoute').value);
  const section = dialog.querySelector('#readingNotesSection');
  const option = section.selectedOptions[0];
  const headingId = option?.value || '';
  const headingLabel = option?.dataset.label || '';
  const kind = dialog.querySelector('#readingNotesKind').value;
  const note = dialog.querySelector('#readingNotesText').value;
  const routeRecord = model.routeMap.get(route);

  const timestamp = new Date().toISOString();
  const allowedKinds = (model.config.allowedKinds || []).map(item => item.id);
  const notes = upsertNote(
    loadNotes(undefined, model.config.maximumItems, {
      maximumNoteLength: model.config.maximumNoteLength,
      allowedKinds
    }),
    {
      id,
      route,
      titleTa: routeRecord?.titleTa || '',
      titleEn: routeRecord?.titleEn || document.title,
      category: routeRecord?.category || 'Reading',
      status: routeRecord?.status || 'published',
      headingId,
      headingLabel,
      kind,
      note
    },
    {
      maximumItems: model.config.maximumItems,
      maximumNoteLength: model.config.maximumNoteLength,
      allowedKinds,
      timestamp
    }
  );

  const saved = saveNotes(
    notes,
    undefined,
    model.config.maximumItems,
    {
      maximumNoteLength: model.config.maximumNoteLength,
      allowedKinds
    }
  );
  if (!saved) throw new Error('Browser storage is unavailable.');
  dialog.close();
  rerender?.();
  window.dispatchEvent(new CustomEvent('osb:reading-notes-updated'));
};

const openDialog = ({
  model,
  route,
  sections,
  existing = null,
  rerender = null
}) => {
  const dialog = ensureDialog(model);
  const form = dialog.querySelector('#readingNotesForm');
  const idInput = dialog.querySelector('#readingNotesId');
  const routeInput = dialog.querySelector('#readingNotesRoute');
  const sectionSelect = dialog.querySelector('#readingNotesSection');
  const kindSelect = dialog.querySelector('#readingNotesKind');
  const textarea = dialog.querySelector('#readingNotesText');
  const counter = dialog.querySelector('#readingNotesCounter');
  const title = dialog.querySelector('#readingNotesDialogTitle');

  idInput.value = existing?.id || '';
  routeInput.value = routePath(existing?.route || route);
  kindSelect.value = existing?.kind || model.config.allowedKinds?.[0]?.id || 'reflection';
  textarea.value = existing?.note || '';
  counter.textContent =
    `${textarea.value.length}/${Number(model.config.maximumNoteLength) || DEFAULT_MAX_LENGTH}`;
  title.textContent = existing ? 'Edit reading note' : 'Add reading note';

  sectionSelect.replaceChildren();
  const pageOption = document.createElement('option');
  pageOption.value = '';
  pageOption.dataset.label = '';
  pageOption.textContent = 'Page overview';
  sectionSelect.appendChild(pageOption);

  (Array.isArray(sections) ? sections : []).forEach(section => {
    const option = document.createElement('option');
    option.value = section.id;
    option.dataset.label = section.label;
    option.textContent = section.label;
    sectionSelect.appendChild(option);
  });
  sectionSelect.value = existing?.headingId || '';

  form.onsubmit = event => {
    event.preventDefault();
    try {
      saveDialogRecord(dialog, model, rerender);
    } catch (error) {
      console.warn('[OmSaravanaBhava] Reading note save failed', error);
      dialog.querySelector('#readingNotesSave').textContent = 'Storage unavailable';
    }
  };

  dialog.showModal();
  textarea.focus();
};

const createNoteCard = (note, model, rerender) => {
  const article = document.createElement('article');
  article.className = 'card reading-note-card';

  const labels = document.createElement('div');
  labels.className = 'reading-note-labels';
  createText(labels, 'span', note.kind, 'pill');
  createText(labels, 'span', note.status, 'pill');
  article.appendChild(labels);

  createText(article, 'h2', displayTitle(note));
  if (note.headingLabel) {
    createText(article, 'p', `Section: ${note.headingLabel}`, 'reading-note-section');
  }
  if (note.note) {
    createText(article, 'p', note.note, 'reading-note-text');
  } else {
    createText(article, 'p', 'Section bookmark only.', 'reading-note-text');
  }
  createText(
    article,
    'p',
    `Updated ${formatDate(note.updatedAt)}`,
    'reading-note-meta'
  );

  const actions = document.createElement('div');
  actions.className = 'reading-note-actions';

  const open = document.createElement('a');
  open.className = 'btn';
  open.href = buildNoteHref(note);
  open.textContent = note.headingId ? 'Open section' : 'Open page';
  actions.appendChild(open);

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'btn secondary';
  edit.textContent = 'Edit';
  edit.addEventListener('click', () => {
    openDialog({
      model,
      route: note.route,
      sections: note.headingId && note.headingLabel
        ? [{id: note.headingId, label: note.headingLabel}]
        : [],
      existing: note,
      rerender
    });
  });
  actions.appendChild(edit);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn secondary';
  remove.textContent = 'Delete';
  remove.addEventListener('click', () => {
    const allowedKinds = (model.config.allowedKinds || []).map(item => item.id);
    removeNote(
      note.id,
      undefined,
      model.config.maximumItems,
      {
        maximumNoteLength: model.config.maximumNoteLength,
        allowedKinds
      }
    );
    rerender();
  });
  actions.appendChild(remove);

  article.appendChild(actions);
  return article;
};

const initialiseNotesCentre = async model => {
  const host = document.getElementById('readingNotesItems');
  const status = document.getElementById('readingNotesStatus');
  const search = document.getElementById('readingNotesSearch');
  const kind = document.getElementById('readingNotesKindFilter');
  const route = document.getElementById('readingNotesRouteFilter');
  const reset = document.getElementById('readingNotesReset');
  const exportButton = document.getElementById('readingNotesExport');
  const clearButton = document.getElementById('readingNotesClear');

  if (
    !host || !status || !search || !kind || !route ||
    !reset || !exportButton || !clearButton
  ) {
    return;
  }

  (model.config.allowedKinds || []).forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.label;
    kind.appendChild(option);
  });

  const render = () => {
    const allowedKinds = (model.config.allowedKinds || []).map(item => item.id);
    const notes = loadNotes(
      undefined,
      model.config.maximumItems,
      {
        maximumNoteLength: model.config.maximumNoteLength,
        allowedKinds
      }
    );

    const routeValues = [...new Map(
      notes.map(note => [
        routePath(note.route),
        displayTitle(note)
      ])
    ).entries()].sort((left, right) => left[1].localeCompare(right[1]));

    const selectedRoute = route.value;
    route.replaceChildren();
    const allRoute = document.createElement('option');
    allRoute.value = 'all';
    allRoute.textContent = 'All reading routes';
    route.appendChild(allRoute);
    routeValues.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      route.appendChild(option);
    });
    route.value = routeValues.some(([value]) => value === selectedRoute)
      ? selectedRoute
      : 'all';

    const filtered = filterNotes(notes, {
      query: search.value,
      kind: kind.value,
      route: route.value
    });
    const metrics = buildNotesMetrics(notes);
    const metricMap = {
      readingNotesTotal: metrics.total,
      readingNotesRoutes: metrics.routes,
      readingNotesBookmarks: metrics.sectionBookmarks,
      readingNotesWritten: metrics.writtenNotes
    };
    Object.entries(metricMap).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = String(value);
    });

    host.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('article');
      empty.className = 'card reading-note-empty';
      createText(empty, 'h2', notes.length ? 'No notes match' : 'No local reading notes');
      createText(
        empty,
        'p',
        notes.length
          ? 'Change the search, note kind or route filter.'
          : 'Open an eligible reading route and use “Add section note”.'
      );
      const link = document.createElement('a');
      link.className = 'btn';
      link.href = '/reading-workspace.html';
      link.textContent = 'Open Reading Workspace';
      empty.appendChild(link);
      host.appendChild(empty);
    } else {
      filtered.forEach(note =>
        host.appendChild(createNoteCard(note, model, render))
      );
    }

    status.textContent =
      `${filtered.length} local note or bookmark record${filtered.length === 1 ? '' : 's'} match.`;
    exportButton.disabled = notes.length === 0;
    clearButton.disabled = notes.length === 0;
  };

  [search, kind, route].forEach(control => {
    control.addEventListener(
      control === search ? 'input' : 'change',
      render
    );
  });

  reset.addEventListener('click', () => {
    search.value = '';
    kind.value = 'all';
    route.value = 'all';
    render();
    search.focus();
  });

  exportButton.addEventListener('click', () => {
    const allowedKinds = (model.config.allowedKinds || []).map(item => item.id);
    downloadJson(
      'omsaravanabhava-reading-notes.json',
      {
        schema: 'osb-reading-notes-v1',
        exportedAt: new Date().toISOString(),
        notes: loadNotes(
          undefined,
          model.config.maximumItems,
          {
            maximumNoteLength: model.config.maximumNoteLength,
            allowedKinds
          }
        )
      }
    );
  });

  clearButton.addEventListener('click', () => {
    if (
      !confirm(
        'Clear browser-local reading notes and section bookmarks? Reading progress, reading list, accessibility preferences and audio history will be preserved.'
      )
    ) {
      return;
    }
    clearNotes();
    render();
  });

  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) render();
  });
  window.addEventListener('osb:reading-notes-updated', render);
  render();
};

const mountReaderNoteButton = (model, detail = {}) => {
  const toolbar = document.getElementById('osb-reader-toolbar');
  if (!toolbar || toolbar.dataset.notesMounted === 'true') return false;

  const path = routePath(detail.path || globalThis.location?.pathname);
  const routeRecord =
    detail.routeRecord ||
    model.routeMap.get(path);
  if (!routeRecord || !model.routeMap.has(path)) return false;

  const actions = toolbar.querySelector('.osb-reader-actions');
  if (!actions) return false;

  const sections = collectSectionOptions(document);
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'btn secondary';
  add.textContent = 'Add section note';
  add.addEventListener('click', () => {
    openDialog({
      model,
      route: path,
      sections,
      rerender: null
    });
  });
  actions.appendChild(add);

  const centre = document.createElement('a');
  centre.className = 'btn secondary';
  centre.href = '/reading-notes.html';
  centre.textContent = 'Notes centre';
  actions.appendChild(centre);

  toolbar.dataset.notesMounted = 'true';
  return true;
};

export const initialiseReadingNotes = async () => {
  if (typeof document === 'undefined') return false;
  if (globalThis.__osbReadingNotesInitialised) return true;
  globalThis.__osbReadingNotesInitialised = true;

  try {
    const model = await loadNotesModel();

    if (document.getElementById('readingNotesItems')) {
      await initialiseNotesCentre(model);
    }

    document.addEventListener('osb:reader-ready', event => {
      mountReaderNoteButton(model, event.detail || {});
    });

    mountReaderNoteButton(model);
    return true;
  } catch (error) {
    console.warn('[OmSaravanaBhava] Reading notes unavailable', error);
    const status = document.getElementById('readingNotesStatus');
    if (status) {
      status.textContent = 'The local reading-note registries could not be loaded.';
    }
    return false;
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => initialiseReadingNotes(),
      {once: true}
    );
  } else {
    initialiseReadingNotes();
  }
}
