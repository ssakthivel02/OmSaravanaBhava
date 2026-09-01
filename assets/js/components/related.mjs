import {escapeHtml} from '../utils/dom.mjs';
export function renderRelated(target, items=[]){
  target.innerHTML = items.map(item => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)} →</a>`).join('');
}
