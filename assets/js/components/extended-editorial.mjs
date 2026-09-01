import {escapeHtml} from '../utils/dom.mjs';
export function renderEditorial(target, fields=[]){
  target.innerHTML = fields.map(item => `<div class="status-item"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.status.replaceAll('_',' '))}</span></div>`).join('');
}
