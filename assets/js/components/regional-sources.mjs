import {escapeHtml} from '../utils/dom.mjs';
export function renderRegionalSources(target, items=[]){
  target.innerHTML = items.map(item => `<article class="regional-source-item">
    <strong>${escapeHtml(item.authority)}</strong>
    <p>${escapeHtml(item.title)}</p>
    <p>Status: ${escapeHtml(item.verification_status)} · Checked: ${escapeHtml(item.last_checked)}</p>
    <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Open official source</a>
  </article>`).join('');
}
