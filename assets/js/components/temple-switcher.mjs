import {escapeHtml} from '../utils/dom.mjs';
export function renderTempleSwitcher(target, items, activeId){
  target.innerHTML = items.map(item =>
    `<a class="${item.id===activeId?'active':''}" href="temple-detail.html?id=${encodeURIComponent(item.id)}">${item.order}. ${escapeHtml(item.name)}</a>`
  ).join('');
}
