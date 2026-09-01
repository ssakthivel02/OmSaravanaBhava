import {escapeHtml} from '../utils/dom.mjs';
export function renderFacts(target, facts=[]){
  target.innerHTML = facts.map(item => `<div class="detail-fact"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div>`).join('');
}
