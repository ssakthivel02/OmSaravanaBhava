export function showToast(message){
  const el = document.getElementById('te-toast') || document.querySelector('.te-toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.__teToast);
  window.__teToast = setTimeout(() => el.classList.remove('show'), 2500);
}
