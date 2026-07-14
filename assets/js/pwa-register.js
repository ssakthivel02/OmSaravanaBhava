(() => {
  import('/assets/js/accessibility-preferences.mjs')
    .then(module => module.applyStoredPreferences())
    .catch(error => console.warn('[OmSaravanaBhava] Accessibility preferences unavailable', error));

  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;

  const showUpdateNotice = registration => {
    if (document.getElementById('osb-pwa-update')) return;
    const notice = document.createElement('div');
    notice.id = 'osb-pwa-update';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:1000;max-width:680px;margin:auto;padding:14px 16px;border:1px solid #edc383;border-radius:16px;background:#fffaf3;color:#2e160f;box-shadow:0 16px 44px rgba(104,45,18,.18);display:flex;gap:12px;align-items:center;justify-content:space-between';
    notice.innerHTML = '<span>A newer version of Om Saravana Bhava is ready.</span><button type="button" class="btn">Update</button>';
    notice.querySelector('button').addEventListener('click', () => {
      registration.waiting?.postMessage({type: 'SKIP_WAITING'});
    });
    document.body.appendChild(notice);
  };

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {scope: '/'});

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateNotice(registration);
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotice(registration);
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        location.reload();
      });

      registration.update().catch(() => {});
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  });
})();
