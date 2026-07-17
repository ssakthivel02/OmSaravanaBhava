import {escapeHtml} from '../utils/dom.mjs';
export function renderAvailable(target, temples, itinerary){
  target.innerHTML = temples.map(item => `
    <article class="planner-item">
      <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.name_ta)} · ${escapeHtml(item.district)}</span></div>
      <button type="button" data-add="${escapeHtml(item.id)}" ${itinerary.includes(item.id)?'disabled':''}>${itinerary.includes(item.id)?'Added':'Add'}</button>
    </article>`).join('');
}
export function renderItinerary(target, temples, itinerary){
  if (!itinerary.length){
    target.innerHTML = '<div class="itinerary-empty">No temples added yet.</div>';
    return;
  }
  target.innerHTML = itinerary.map((id,index) => {
    const item = temples.find(t => t.id === id);
    return `<article class="planner-item">
      <div><strong>${index+1}. ${escapeHtml(item?.name || id)}</strong><span>${escapeHtml(item?.name_ta || '')} · ${escapeHtml(item?.district || '')}</span></div>
      <button type="button" data-remove="${escapeHtml(id)}">Remove</button>
    </article>`;
  }).join('');
}
