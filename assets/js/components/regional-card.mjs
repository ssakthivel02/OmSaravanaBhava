import {escapeHtml} from '../utils/dom.mjs';
export function regionalCard(item){
  return `<article class="regional-card">
    <div class="regional-card-visual"><span class="regional-card-symbol" aria-hidden="true">வேல்</span></div>
    <div class="regional-card-content">
      <p class="te-eyebrow">${escapeHtml(item.setting)}</p>
      <h3>${escapeHtml(item.name)}</h3>
      <div class="regional-card-ta">${escapeHtml(item.name_ta)}</div>
      <div class="regional-card-meta">
        <span>${escapeHtml(item.district)}</span>
        <span>${escapeHtml(item.official_temple_id)}</span>
        <span>${escapeHtml(item.source_status)} source</span>
      </div>
      <p>${item.review_field_count} enrichment fields remain under review.</p>
      <a href="${escapeHtml(item.href)}">Open source-aware record →</a>
    </div>
  </article>`;
}
