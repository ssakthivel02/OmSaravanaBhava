import {escapeHtml} from '../utils/dom.mjs';
export function renderProfile(target, items=[]){
  target.innerHTML = items.map(item => `<div class="info-card"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div>`).join('');
}
