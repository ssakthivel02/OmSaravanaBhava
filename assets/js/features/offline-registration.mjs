export function registerOfflineWorker(){
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('temple-experience-sw.js').catch(error => {
    console.warn('Temple experience service worker registration failed', error);
  });
}
