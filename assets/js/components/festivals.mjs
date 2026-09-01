import {escapeHtml} from '../utils/dom.mjs';
export function renderFestivals(target, items=[]){
  target.innerHTML = items.map(item => `<article><strong>${escapeHtml(item.name)}</strong><p>Status: ${escapeHtml(item.status.replaceAll('_',' '))}</p></article>`).join('');
}
