export const RELEASE = 218;
export const STYLESHEET_PATH = '/assets/css/print-support.css';
export const TOOLBAR_ID = 'osb-print-toolbar';
export const HEADER_ID = 'osb-print-header';

export const EXCLUDED_PATHS = new Set([
  '/404.html',
  '/offline.html'
]);

export const normalisePath = value => {
  const path = String(value ?? '').trim();
  if (!path) return '/';
  try {
    return new URL(path, 'https://omsaravanabhava.org/').pathname || '/';
  } catch {
    return '/';
  }
};

export const shouldOfferPrint = (
  path,
  bodyDataset = {},
  hasMain = true
) => {
  const route = normalisePath(path);
  return Boolean(hasMain) &&
    bodyDataset?.printDisabled !== 'true' &&
    !EXCLUDED_PATHS.has(route);
};

export const normaliseCanonical = (
  href,
  origin = 'https://omsaravanabhava.org'
) => {
  const value = String(href ?? '').trim();
  if (!value) return '';
  try {
    const url = new URL(value, `${origin.replace(/\/$/, '')}/`);
    return url.origin === new URL(origin).origin ? url.href : '';
  } catch {
    return '';
  }
};

export const buildPrintMetadata = ({
  title = '',
  canonical = '',
  language = 'ta'
} = {}) => ({
  title: String(title).trim() || 'Om Saravana Bhava',
  canonical: normaliseCanonical(canonical),
  language: String(language).trim() || 'ta',
  platform: 'Om Saravana Bhava',
  note: 'Browser-generated print or PDF copy. Source status and publication boundaries remain unchanged.'
});

export const ensurePrintStylesheet = (
  documentRef = globalThis.document,
  path = STYLESHEET_PATH
) => {
  if (!documentRef?.head || !documentRef.createElement) return null;
  const existing = documentRef.getElementById?.('osb-print-support-css');
  if (existing) return existing;
  const link = documentRef.createElement('link');
  link.id = 'osb-print-support-css';
  link.rel = 'stylesheet';
  link.href = path;
  documentRef.head.appendChild(link);
  return link;
};

const createText = (documentRef, parent, tag, text, className) => {
  const element = documentRef.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
};

export const ensurePrintHeader = (documentRef = globalThis.document) => {
  if (!documentRef?.body || !documentRef.createElement) return null;
  const existing = documentRef.getElementById?.(HEADER_ID);
  if (existing) return existing;

  const canonical = documentRef.querySelector?.('link[rel="canonical"]')?.href || '';
  const metadata = buildPrintMetadata({
    title: documentRef.title,
    canonical,
    language: documentRef.documentElement?.lang
  });

  const header = documentRef.createElement('header');
  header.id = HEADER_ID;
  header.className = 'osb-print-header';
  header.setAttribute('aria-hidden', 'true');
  createText(documentRef, header, 'strong', metadata.platform);
  createText(documentRef, header, 'span', metadata.title);
  if (metadata.canonical) {
    createText(documentRef, header, 'span', metadata.canonical, 'osb-print-canonical');
  }
  createText(documentRef, header, 'small', metadata.note);
  documentRef.body.prepend(header);
  return header;
};

export const requestPrint = (windowRef = globalThis.window) => {
  if (typeof windowRef?.print !== 'function') return false;
  windowRef.print();
  return true;
};

export const createPrintToolbar = (
  documentRef = globalThis.document,
  windowRef = globalThis.window
) => {
  if (!documentRef?.createElement) return null;
  const existing = documentRef.getElementById?.(TOOLBAR_ID);
  if (existing) return existing;

  const main = documentRef.querySelector?.('main');
  const path = windowRef?.location?.pathname || '/';
  if (!shouldOfferPrint(path, documentRef.body?.dataset, Boolean(main))) return null;

  const toolbar = documentRef.createElement('aside');
  toolbar.id = TOOLBAR_ID;
  toolbar.className = 'osb-print-toolbar';
  toolbar.setAttribute('aria-label', 'Print and PDF tools');
  toolbar.setAttribute('data-print-exclude', 'true');

  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = 'btn secondary';
  button.textContent = 'Print / Save PDF';
  button.addEventListener('click', () => requestPrint(windowRef));
  toolbar.appendChild(button);

  const help = documentRef.createElement('a');
  help.className = 'osb-print-help';
  help.href = '/print-pdf.html';
  help.textContent = 'Print guidance';
  toolbar.appendChild(help);

  const breadcrumb = main.querySelector?.('nav[aria-label="Breadcrumb"]');
  if (breadcrumb?.after) breadcrumb.after(toolbar);
  else main.prepend(toolbar);
  return toolbar;
};

export const initialisePrintSupport = (
  documentRef = globalThis.document,
  windowRef = globalThis.window
) => {
  if (!documentRef) return false;
  ensurePrintStylesheet(documentRef);
  ensurePrintHeader(documentRef);
  createPrintToolbar(documentRef, windowRef);
  return true;
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => initialisePrintSupport(),
      {once: true}
    );
  } else {
    initialisePrintSupport();
  }
}
