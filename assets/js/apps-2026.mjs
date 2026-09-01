export const RELEASE = 246;

const byId = id => document.getElementById(id);
let deferredInstallPrompt = null;

const setStatus = message => {
  const status = byId('installStatus');
  if (status) status.textContent = message;
};

addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const button = byId('installWebApp');
  if (button) {
    button.hidden = false;
    button.disabled = false;
  }
  setStatus('This browser is ready to install the Om Saravana Bhava web app.');
});

addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const button = byId('installWebApp');
  if (button) button.hidden = true;
  setStatus('The web app was installed successfully.');
});

const initialise = async () => {
  const button = byId('installWebApp');
  if (button) {
    button.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        setStatus('Use your browser menu and choose Install app or Add to Home Screen. The wording varies by browser.');
        return;
      }
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      setStatus(choice.outcome === 'accepted'
        ? 'Installation accepted. Follow the browser confirmation.'
        : 'Installation was not completed. You can try again from the browser menu.');
      deferredInstallPrompt = null;
    });
  }

  const serviceWorker = byId('appServiceWorkerState');
  if (serviceWorker) {
    if (!('serviceWorker' in navigator)) {
      serviceWorker.textContent = 'Not supported by this browser';
    } else {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        serviceWorker.textContent = registration
          ? registration.active?.state || 'Registered'
          : 'Loads after the site is opened online';
      } catch {
        serviceWorker.textContent = 'Status unavailable';
      }
    }
  }
  document.documentElement.dataset.appsRelease = String(RELEASE);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialise, {once: true});
} else {
  initialise();
}
