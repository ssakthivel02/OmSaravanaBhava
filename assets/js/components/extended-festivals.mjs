import {escapeHtml} from '../utils/dom.mjs';
export function renderFestivalTimeline(target, items=[]){
  target.innerHTML = items.map((item,index) => `<article class="timeline-item"><span class="timeline-marker">${index+1}</span><div><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.note)}</p><small>${escapeHtml(item.status.replaceAll('_',' '))}</small></div></article>`).join('');
}
