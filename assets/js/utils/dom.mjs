export const qs = (selector, root=document) => root.querySelector(selector);
export const qsa = (selector, root=document) => [...root.querySelectorAll(selector)];
export function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}
