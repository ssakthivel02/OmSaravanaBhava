import {escapeHtml} from '../utils/dom.mjs';
export function renderExperienceFestivals(target, records=[]){
  target.innerHTML = records.map((item,index) => `
    <article class="festival-row">
      <span class="festival-number">${index+1}</span>
      <div><strong>${escapeHtml(item.festival)}</strong><p>${escapeHtml(item.temple_name)} · ${escapeHtml(item.note)}</p></div>
      <span class="festival-status">${escapeHtml(item.status.replaceAll('_',' '))}</span>
    </article>`).join('');
}
