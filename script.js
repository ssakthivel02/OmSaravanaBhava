/* Om Saravana Bhava - Static Verified Batch 04 */
(function () {
  'use strict';

  const DATA_FILES = {
    temples: 'data/temples.json',
    festivals: 'data/festivals.json',
    slokas: 'data/slokas.json',
    gallery: 'data/gallery.json',
    daily: 'data/daily_quotes.json',
    panchangam: 'data/panchangam.json',
    timeline: 'data/timeline.json',
    learning: 'data/learning_paths.json'
  };

  const cache = new Map();

  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function loadJSON(path) {
    if (cache.has(path)) return cache.get(path);
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      cache.set(path, data);
      return data;
    } catch (error) {
      console.warn('[OmSaravanaBhava] Failed to load', path, error);
      return Array.isArray(path) ? [] : null;
    }
  }

  function getText(item, keys) {
    for (const key of keys) {
      if (item && item[key]) return item[key];
    }
    return '';
  }

  function card(title, subtitle, body, meta) {
    return `
      <article class="osb-card">
        <div class="osb-card-body">
          ${meta ? `<p class="eyebrow">${escapeHTML(meta)}</p>` : ''}
          <h3>${escapeHTML(title)}</h3>
          ${subtitle ? `<p class="card-subtitle">${escapeHTML(subtitle)}</p>` : ''}
          ${body ? `<p>${escapeHTML(body)}</p>` : ''}
        </div>
      </article>
    `;
  }

  function renderList(container, items, mapper) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;
    if (!items || !items.length) {
      el.innerHTML = '<div class="empty-state">Content is loading or not available yet.</div>';
      return;
    }
    el.innerHTML = items.map(mapper).join('');
  }

  function searchableText(item) {
    return Object.values(item || {})
      .flatMap(value => Array.isArray(value) ? value : [value])
      .filter(value => typeof value === 'string' || typeof value === 'number')
      .join(' ')
      .toLowerCase();
  }

  async function initSearchPage() {
    const input = document.getElementById('global-search-input');
    const results = document.getElementById('global-search-results');
    const status = document.getElementById('search-status');
    if (!input || !results) return;

    const [temples, festivals, slokas, gallery] = await Promise.all([
      loadJSON(DATA_FILES.temples),
      loadJSON(DATA_FILES.festivals),
      loadJSON(DATA_FILES.slokas),
      loadJSON(DATA_FILES.gallery)
    ]);

    const index = [];
    (Array.isArray(temples) ? temples : []).forEach(item => index.push({ type: 'Temple', item }));
    (Array.isArray(festivals) ? festivals : []).forEach(item => index.push({ type: 'Festival', item }));
    (Array.isArray(slokas) ? slokas : []).forEach(item => index.push({ type: 'Sloka', item }));
    (Array.isArray(gallery) ? gallery : []).forEach(item => index.push({ type: 'Gallery', item }));

    function performSearch() {
      const query = input.value.trim().toLowerCase();
      if (query.length < 2) {
        results.innerHTML = '';
        if (status) status.textContent = 'Type at least two letters.';
        return;
      }
      const matches = index.filter(row => searchableText(row.item).includes(query)).slice(0, 24);
      if (status) status.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'} found.`;
      renderList(results, matches, row => {
        const item = row.item;
        const title = getText(item, ['name', 'nameEn', 'title', 'titleEn', 'festival', 'temple']) || row.type;
        const subtitle = getText(item, ['nameTa', 'titleTa', 'location', 'category', 'month']);
        const body = getText(item, ['description', 'summary', 'meaning', 'history', 'reflection']);
        return card(title, subtitle, body, row.type);
      });
    }

    input.addEventListener('input', performSearch);
  }

  async function initPanchangamPage() {
    const el = document.getElementById('panchangam-container');
    if (!el) return;
    const data = await loadJSON(DATA_FILES.panchangam);
    if (!data) {
      el.innerHTML = '<div class="empty-state">Daily reflection is not available yet.</div>';
      return;
    }
    el.innerHTML = `
      <article class="daily-panel">
        <p class="eyebrow">${escapeHTML(data.dateLabel || 'Today')}</p>
        <h2 lang="ta">${escapeHTML(data.mantra || 'ஓம் சரவண பவ')}</h2>
        <h3>${escapeHTML(data.mantraEn || 'Om Saravana Bhava')}</h3>
        <p>${escapeHTML(data.reflection || '')}</p>
        <div class="practice-box"><strong>Practice:</strong> ${escapeHTML(data.practice || '')}</div>
        <p class="small-note">${escapeHTML(data.note || '')}</p>
      </article>
    `;
  }

  async function initTimelinePage() {
    const data = await loadJSON(DATA_FILES.timeline);
    renderList('timeline-container', Array.isArray(data) ? data : [], item => `
      <article class="timeline-item">
        <span class="timeline-dot"></span>
        <div>
          <p class="eyebrow">${escapeHTML(item.period)}</p>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.description)}</p>
          <div class="tag-row">${(item.tags || []).map(tag => `<span>${escapeHTML(tag)}</span>`).join('')}</div>
        </div>
      </article>
    `);
  }

  async function initLearningPage() {
    const data = await loadJSON(DATA_FILES.learning);
    renderList('learning-container', Array.isArray(data) ? data : [], item => `
      <article class="osb-card learning-card">
        <div class="osb-card-body">
          <p class="eyebrow">${escapeHTML(item.level)}</p>
          <h3>${escapeHTML(item.title)}</h3>
          <ol>${(item.steps || []).map(step => `<li>${escapeHTML(step)}</li>`).join('')}</ol>
          <p><strong>Outcome:</strong> ${escapeHTML(item.outcome)}</p>
        </div>
      </article>
    `);
  }

  async function enhanceExistingPages() {
    const dailyQuoteTarget = document.getElementById('daily-quote') || document.querySelector('[data-daily-quote]');
    if (dailyQuoteTarget) {
      const quotes = await loadJSON(DATA_FILES.daily);
      if (Array.isArray(quotes) && quotes.length) {
        const quote = quotes[new Date().getDate() % quotes.length];
        dailyQuoteTarget.textContent = getText(quote, ['quote', 'text', 'content', 'title']) || 'Om Saravana Bhava';
      }
    }
  }

  function addUtilityControls() {
    if (!document.querySelector('.back-to-top')) {
      const button = document.createElement('button');
      button.className = 'back-to-top';
      button.type = 'button';
      button.setAttribute('aria-label', 'Back to top');
      button.textContent = '↑';
      button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      document.body.appendChild(button);
      window.addEventListener('scroll', () => button.classList.toggle('visible', window.scrollY > 500), { passive: true });
    }
  }

  async function init() {
    addUtilityControls();
    await enhanceExistingPages();
    await Promise.all([
      initSearchPage(),
      initPanchangamPage(),
      initTimelinePage(),
      initLearningPage()
    ]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.OmSaravanaBhava = { loadJSON, escapeHTML };
})();
