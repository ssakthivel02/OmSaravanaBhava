import {escapeHtml} from '../utils/dom.mjs';
export function templeCard(record, saved=false){
  return `<article class="temple-card">
    <img src="${escapeHtml(record.image)}" alt="Devotional illustration representing ${escapeHtml(record.name)} Murugan Temple">
    <div class="temple-card-content">
      <span class="te-eyebrow">${escapeHtml(record.group)}</span>
      <h3>${escapeHtml(record.name)}</h3>
      <div class="temple-card-ta">${escapeHtml(record.name_ta)}</div>
      <div class="temple-card-meta">
        <span class="temple-chip">${escapeHtml(record.district)}</span>
        <span class="temple-chip">${escapeHtml(record.publication_status.replaceAll('_',' '))}</span>
      </div>
      <div class="temple-card-actions">
        <a href="${escapeHtml(record.href)}">Open guide</a>
        <button type="button" data-save-temple="${escapeHtml(record.id)}">${saved ? 'Saved' : 'Save'}</button>
      </div>
    </div>
  </article>`;
}
