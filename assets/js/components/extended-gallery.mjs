import {escapeHtml} from '../utils/dom.mjs';
export function renderGalleryCategories(target, items=[]){
  target.innerHTML = items.map(item => `<div class="category-card"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.status.replaceAll('_',' '))}</span></div>`).join('');
}
