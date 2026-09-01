import {escapeHtml} from '../utils/dom.mjs';
export function buildLocalAnswer(record, question=''){
  const topics = [
    `Temple: ${record.name_ta} · ${record.name}`,
    `District: ${record.district}`,
    `Group: ${record.group}`,
    `Devotional theme: ${record.theme}`,
    `Publication status: ${record.publication?.label || record.editorial?.label || 'Review required'}`
  ];
  const missing = [
    'Official timings',
    'Verified contact details',
    'Travel distances',
    'Temple-specific festival schedules',
    'Detailed historical claims'
  ];
  return `<strong>Local record response</strong>
    <p>Question reviewed: ${escapeHtml(question || 'No question entered')}</p>
    <ul>${topics.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    <strong>Information not confirmed in the current record</strong>
    <ul>${missing.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}
