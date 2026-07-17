import {escapeHtml} from '../utils/dom.mjs';
export function renderPuranam(target, section){
  target.innerHTML = `<div class="editorial-block"><strong>Status: ${escapeHtml(section.status.replaceAll('_',' '))}</strong><p>${escapeHtml(section.summary)}</p><p>${escapeHtml(section.editorial_rule)}</p></div>`;
}
