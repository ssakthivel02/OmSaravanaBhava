import {escapeHtml} from '../utils/dom.mjs';
export function renderRegionalPending(target, items=[]){
  target.innerHTML = items.map(item => `<div class="regional-pending-item"><strong>${escapeHtml(item.field.replaceAll('_',' '))}</strong><span>${escapeHtml(item.status.replaceAll('_',' '))}</span></div>`).join('');
}
