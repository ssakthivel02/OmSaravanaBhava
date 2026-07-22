export const RELEASE = 246;

const byId = id => document.getElementById(id);
const create = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const storageAvailable = () => {
  try {
    const key = '__osb_support_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const installCorrectionBuilder = () => {
  const form = byId('correctionForm');
  const output = byId('correctionOutput');
  const copy = byId('copyCorrection');
  const status = byId('correctionStatus');
  if (!form || !output || !copy || !status) return;

  const build = () => {
    const values = Object.fromEntries(new FormData(form).entries());
    output.value = [
      'Om Saravana Bhava — Content Correction Request',
      '',
      `Page URL: ${values.pageUrl || location.href}`,
      `Issue type: ${values.issueType || 'Not selected'}`,
      `Tamil/English title: ${values.title || 'Not supplied'}`,
      '',
      'Current issue:',
      values.currentIssue || 'Not supplied',
      '',
      'Proposed correction:',
      values.proposedCorrection || 'Not supplied',
      '',
      'Source or evidence:',
      values.sourceEvidence || 'Not supplied',
      '',
      'Rights/permission note:',
      values.rightsNote || 'Not supplied',
      '',
      'Requested publication action:',
      values.requestedAction || 'Editorial review',
      '',
      'Important: This template was generated locally in the browser and was not automatically submitted.'
    ].join('\n');
    status.textContent = 'Correction template prepared locally. Review it before copying.';
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    build();
    output.focus();
  });
  copy.addEventListener('click', async () => {
    if (!output.value.trim()) build();
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = 'Correction template copied to the clipboard.';
    } catch {
      output.select();
      status.textContent = 'Clipboard access was unavailable. The template is selected for manual copy.';
    }
  });
};

const installDiagnostics = async () => {
  const container = byId('supportDiagnostics');
  const status = byId('supportDiagnosticStatus');
  if (!container || !status) return;
  const serviceWorkerSupported = 'serviceWorker' in navigator;
  let serviceWorkerState = 'not supported';
  if (serviceWorkerSupported) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      serviceWorkerState = registration
        ? registration.active?.state || 'registered'
        : 'not registered';
    } catch {
      serviceWorkerState = 'status unavailable';
    }
  }
  const details = [
    ['Connection', navigator.onLine ? 'online' : 'offline'],
    ['Service worker', serviceWorkerState],
    ['Browser-local storage', storageAvailable() ? 'available' : 'unavailable'],
    ['Current path', location.pathname],
    ['Language', navigator.language || 'unknown'],
    ['Platform release', String(RELEASE)]
  ];
  container.replaceChildren();
  details.forEach(([label, value]) => {
    const article = create('article', 'premium-card');
    article.append(
      create('span', 'premium-pill', label),
      create('h3', '', value)
    );
    container.appendChild(article);
  });
  status.textContent = 'Browser diagnostics completed locally. No diagnostic information was transmitted.';
};

const installCacheControls = () => {
  const clearRuntime = byId('clearRuntimeCaches');
  const reload = byId('reloadCurrentPage');
  const status = byId('supportActionStatus');
  if (reload) reload.addEventListener('click', () => location.reload());
  if (!clearRuntime || !status) return;
  clearRuntime.addEventListener('click', async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      registration?.active?.postMessage({type: 'CLEAR_RUNTIME_CACHES'});
      if ('caches' in globalThis) {
        const keys = await caches.keys();
        await Promise.all(keys
          .filter(key => /runtime|data/i.test(key))
          .map(key => caches.delete(key)));
      }
      status.textContent = 'Runtime and data caches cleared. Reload the page to fetch current content.';
    } catch {
      status.textContent = 'Cache clearing was unavailable in this browser. Use the Maintenance page for alternatives.';
    }
  });
};

const initialise = () => {
  installCorrectionBuilder();
  installDiagnostics();
  installCacheControls();
  document.documentElement.dataset.supportToolsRelease = String(RELEASE);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialise, {once: true});
} else {
  initialise();
}
