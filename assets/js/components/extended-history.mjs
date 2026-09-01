import {escapeHtml} from '../utils/dom.mjs';
export function renderHistory(target, section){
  target.innerHTML = `<div class="editorial-block"><strong>Status: ${escapeHtml(section.status.replaceAll('_',' '))}</strong><p>${escapeHtml(section.summary)}</p></div>`;
}
