import {escapeHtml} from '../utils/dom.mjs';
export function renderExperienceGallery(target, record){
  if (!record){ target.innerHTML = '<p>No gallery record available.</p>'; return; }
  target.innerHTML = record.categories.map(item => `
    <article class="gallery-card">
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.label)} for ${escapeHtml(record.temple_name)}">
      <div>
        <h3>${escapeHtml(item.label)}</h3>
        <p>${escapeHtml(record.temple_name_ta)} · ${escapeHtml(record.temple_name)}</p>
        <span>${escapeHtml(item.status.replaceAll('_',' '))}</span>
      </div>
    </article>`).join('');
}
