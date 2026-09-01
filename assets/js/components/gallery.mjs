import {escapeHtml} from '../utils/dom.mjs';
export function renderGallery(target, items=[]){
  target.innerHTML = items.map(item => `<figure><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}"><figcaption>${escapeHtml(item.caption)}</figcaption></figure>`).join('');
}
