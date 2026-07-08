/* Om Saravana Bhava - Batch 06A Dynamic Content Engine */
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
    learning: 'data/learning_paths.json',
    templeDetails: 'data/temple_details.json',
    festivalDetails: 'data/festival_details.json',
    slokaDetails: 'data/sloka_details.json',
    searchIndex: 'data/search_index.json'
  };

  const cache = new Map();
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
    }[char]));
  }

  function slug(value) {
    return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
      console.warn('[OmSaravanaBhava] Data load failed:', path, error);
      return [];
    }
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function getText(item, keys) {
    for (const key of keys) if (item && item[key]) return item[key];
    return '';
  }

  function tagRow(items) {
    return (items || []).map(item => `<span class="tag">${escapeHTML(item)}</span>`).join('');
  }

  function buttonLink(url, label, extra = '') {
    return `<a class="btn ${extra}" href="${escapeHTML(url)}">${escapeHTML(label)}</a>`;
  }

  function mapLink(url, label = 'Open Map') {
    return url ? `<a class="btn" href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(label)}</a>` : '';
  }

  function makeCard({ title, subtitle, body, meta, url, tags, actionLabel }) {
    return `<article class="card osb-card dynamic-card">
      <div class="osb-card-body">
        ${meta ? `<p class="eyebrow">${escapeHTML(meta)}</p>` : ''}
        <h3>${escapeHTML(title)}</h3>
        ${subtitle ? `<h4>${escapeHTML(subtitle)}</h4>` : ''}
        ${body ? `<p>${escapeHTML(body)}</p>` : ''}
        ${tags && tags.length ? `<div class="tags tag-row">${tagRow(tags)}</div>` : ''}
        ${url ? buttonLink(url, actionLabel || 'Read More', 'btn-secondary') : ''}
      </div>
    </article>`;
  }

  function renderEmpty(container, message = 'Content is loading or not available yet.') {
    if (!container) return;
    container.innerHTML = `<div class="empty-state">${escapeHTML(message)}</div>`;
  }

  function renderList(container, items, mapper) {
    const el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return;
    if (!Array.isArray(items) || !items.length) return renderEmpty(el);
    el.innerHTML = items.map(mapper).join('');
  }

  function normalizeTemple(item, index = 0) {
    const id = item.id || slug(item.nameEn || item.name || item.title || `temple-${index + 1}`);
    return { ...item, id };
  }

  function normalizeFestival(item, index = 0) {
    const id = item.id || slug(item.nameEn || item.name || item.title || `festival-${index + 1}`);
    return { ...item, id };
  }

  function normalizeSloka(item, index = 0) {
    const id = item.id || slug(item.titleEn || item.title || item.nameEn || `sloka-${index + 1}`);
    return { ...item, id };
  }

  function templeCard(item, index) {
    const t = normalizeTemple(item, index);
    const title = t.nameTa || t.name || t.nameEn || 'Murugan Temple';
    const subtitle = [t.nameEn, t.subtitle, t.location].filter(Boolean).join(' · ');
    return makeCard({
      title,
      subtitle,
      body: t.summary || t.history || t.description,
      meta: t.category || (t.order ? `Temple ${t.order}` : 'Temple'),
      tags: t.highlights || t.festivals || [],
      url: `temple-details.html?id=${encodeURIComponent(t.id)}`,
      actionLabel: 'View Temple'
    });
  }

  function festivalCard(item, index) {
    const f = normalizeFestival(item, index);
    return makeCard({
      title: f.nameTa || f.titleTa || f.nameEn || f.title || 'Festival',
      subtitle: [f.nameEn || f.titleEn, f.month].filter(Boolean).join(' · '),
      body: f.summary || f.description || f.meaning,
      meta: 'Festival',
      tags: f.rituals || f.tags || [],
      url: `festival-details.html?id=${encodeURIComponent(f.id)}`,
      actionLabel: 'View Festival'
    });
  }

  function slokaCard(item, index) {
    const s = normalizeSloka(item, index);
    return makeCard({
      title: s.titleTa || s.nameTa || s.titleEn || s.title || 'Sloka',
      subtitle: [s.titleEn || s.nameEn, s.category].filter(Boolean).join(' · '),
      body: s.summary || s.meaning || s.description,
      meta: 'Sloka',
      tags: s.benefits || s.tags || [],
      url: `sloka-details.html?id=${encodeURIComponent(s.id)}`,
      actionLabel: 'View Meaning'
    });
  }

  function galleryCard(item) {
    return makeCard({
      title: item.title || item.name || 'Gallery',
      subtitle: item.location || item.category || '',
      body: item.summary || item.description || 'Devotional visual collection.',
      meta: 'Gallery',
      tags: item.tags || []
    });
  }

  async function initMainLists() {
    const home = $('#home-temples');
    if (home) {
      const data = await loadJSON(DATA_FILES.temples);
      renderList(home, (Array.isArray(data) ? data : []).slice(0, 3), templeCard);
    }

    const templesList = $('#temples-list');
    if (templesList) {
      const data = await loadJSON(DATA_FILES.temples);
      const render = list => renderList(templesList, list, templeCard);
      render(data);
      const input = $('#temple-search');
      if (input) input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        if (!query) return render(data);
        render((Array.isArray(data) ? data : []).filter(t => JSON.stringify(t).toLowerCase().includes(query)));
      });
    }

    const festivalsList = $('#festivals-list');
    if (festivalsList) {
      const data = await loadJSON(DATA_FILES.festivals);
      renderList(festivalsList, data, festivalCard);
    }

    const slokasList = $('#slokas-list');
    if (slokasList) {
      const data = await loadJSON(DATA_FILES.slokas);
      renderList(slokasList, data, slokaCard);
    }

    const galleryList = $('#gallery-list');
    if (galleryList) {
      const data = await loadJSON(DATA_FILES.gallery);
      renderList(galleryList, data, galleryCard);
    }
  }

  function detailHero(title, subtitle, meta) {
    return `<section class="detail-hero card">
      ${meta ? `<p class="eyebrow">${escapeHTML(meta)}</p>` : ''}
      <h1>${escapeHTML(title)}</h1>
      ${subtitle ? `<p class="lead">${escapeHTML(subtitle)}</p>` : ''}
    </section>`;
  }

  function detailSection(title, content) {
    if (!content) return '';
    return `<section class="detail-section card"><h2>${escapeHTML(title)}</h2>${content}</section>`;
  }

  function listHTML(items) {
    return (items || []).length ? `<ul class="detail-list">${items.map(x => `<li>${escapeHTML(x)}</li>`).join('')}</ul>` : '';
  }

  async function initTempleDetail() {
    const container = $('#detail-container');
    if (!container || document.body.dataset.page !== 'temple-detail') return;
    const id = getParam('id') || 'palani';
    const details = await loadJSON(DATA_FILES.templeDetails);
    const item = (Array.isArray(details) ? details : []).find(x => x.id === id) || details[0];
    if (!item) return renderEmpty(container, 'Temple detail is not available.');
    document.title = `${item.nameEn} | Om Saravana Bhava`;
    container.innerHTML = `
      ${detailHero(item.nameTa || item.nameEn, `${item.nameEn} · ${item.location}`, item.category)}
      <div class="detail-grid">
        ${detailSection('History', `<p>${escapeHTML(item.history || item.summary)}</p>`)}
        ${detailSection('Spiritual Meaning', `<p>${escapeHTML(item.spiritualMeaning)}</p>`)}
        ${detailSection('Festivals', listHTML(item.festivals))}
        ${detailSection('Daily Practice', listHTML(item.practices))}
        ${detailSection('Quick Facts', listHTML(item.quickFacts))}
        ${detailSection('Visit', `<p>${escapeHTML(item.location)}</p>${mapLink(item.map)}`)}
      </div>
      <p class="breadcrumb-line"><a href="temples.html">← Back to Temples</a></p>`;
  }

  async function initFestivalDetail() {
    const container = $('#detail-container');
    if (!container || document.body.dataset.page !== 'festival-detail') return;
    const id = getParam('id') || 'thai-poosam';
    const details = await loadJSON(DATA_FILES.festivalDetails);
    const item = (Array.isArray(details) ? details : []).find(x => x.id === id) || details[0];
    if (!item) return renderEmpty(container, 'Festival detail is not available.');
    document.title = `${item.nameEn} | Om Saravana Bhava`;
    container.innerHTML = `
      ${detailHero(item.nameTa || item.nameEn, `${item.nameEn} · ${item.month}`, 'Festival')}
      <div class="detail-grid">
        ${detailSection('Overview', `<p>${escapeHTML(item.summary)}</p>`)}
        ${detailSection('Meaning', `<p>${escapeHTML(item.meaning)}</p>`)}
        ${detailSection('Common Devotional Practices', listHTML(item.rituals))}
        ${detailSection('Associated Temples', listHTML(item.temples))}
        ${detailSection('Note', `<p>${escapeHTML(item.notes)}</p>`)}
      </div>
      <p class="breadcrumb-line"><a href="festivals.html">← Back to Festivals</a></p>`;
  }

  async function initSlokaDetail() {
    const container = $('#detail-container');
    if (!container || document.body.dataset.page !== 'sloka-detail') return;
    const id = getParam('id') || 'om-saravana-bhava';
    const details = await loadJSON(DATA_FILES.slokaDetails);
    const item = (Array.isArray(details) ? details : []).find(x => x.id === id) || details[0];
    if (!item) return renderEmpty(container, 'Sloka detail is not available.');
    document.title = `${item.titleEn} | Om Saravana Bhava`;
    container.innerHTML = `
      ${detailHero(item.titleTa || item.titleEn, `${item.titleEn} · ${item.category}`, 'Sloka')}
      <div class="detail-grid">
        ${detailSection('Text', `<p class="sloka-text" lang="ta">${escapeHTML(item.textTa)}</p>`)}
        ${detailSection('Transliteration', `<p>${escapeHTML(item.transliteration)}</p>`)}
        ${detailSection('Meaning', `<p>${escapeHTML(item.meaning)}</p>`)}
        ${detailSection('Benefits', listHTML(item.benefits))}
        ${detailSection('Practice', `<p>${escapeHTML(item.practice)}</p>`)}
      </div>
      <p class="breadcrumb-line"><a href="slokas.html">← Back to Slokas</a></p>`;
  }

  function searchableText(item) {
    return Object.values(item || {})
      .flatMap(value => Array.isArray(value) ? value : [value])
      .filter(value => ['string', 'number'].includes(typeof value))
      .join(' ')
      .toLowerCase();
  }

  async function initSearchPage() {
    const input = $('#global-search-input');
    const results = $('#global-search-results');
    const status = $('#search-status');
    if (!input || !results) return;

    let index = await loadJSON(DATA_FILES.searchIndex);
    if (!Array.isArray(index) || !index.length) {
      const [temples, festivals, slokas, gallery] = await Promise.all([
        loadJSON(DATA_FILES.temples), loadJSON(DATA_FILES.festivals), loadJSON(DATA_FILES.slokas), loadJSON(DATA_FILES.gallery)
      ]);
      index = [];
      (Array.isArray(temples) ? temples : []).forEach((item, i) => index.push({ type: 'Temple', item: normalizeTemple(item, i), url: `temple-details.html?id=${normalizeTemple(item, i).id}` }));
      (Array.isArray(festivals) ? festivals : []).forEach((item, i) => index.push({ type: 'Festival', item: normalizeFestival(item, i), url: `festival-details.html?id=${normalizeFestival(item, i).id}` }));
      (Array.isArray(slokas) ? slokas : []).forEach((item, i) => index.push({ type: 'Sloka', item: normalizeSloka(item, i), url: `sloka-details.html?id=${normalizeSloka(item, i).id}` }));
      (Array.isArray(gallery) ? gallery : []).forEach(item => index.push({ type: 'Gallery', item, url: 'gallery.html' }));
    }

    function performSearch() {
      const query = input.value.trim().toLowerCase();
      if (query.length < 2) {
        results.innerHTML = '';
        if (status) status.textContent = 'Type at least two letters.';
        return;
      }
      const matches = index.filter(row => searchableText(row).includes(query) || searchableText(row.item).includes(query)).slice(0, 30);
      if (status) status.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'} found.`;
      renderList(results, matches, row => makeCard({
        title: row.title || getText(row.item, ['nameEn', 'titleEn', 'title', 'name']) || row.type,
        subtitle: row.titleTa || getText(row.item, ['nameTa', 'titleTa', 'location', 'category', 'month']),
        body: row.summary || getText(row.item, ['summary', 'description', 'meaning', 'history']),
        meta: row.type,
        url: row.url,
        actionLabel: 'Open'
      }));
    }
    input.addEventListener('input', performSearch);
    const q = getParam('q');
    if (q) { input.value = q; performSearch(); }
  }

  async function initBatch04Pages() {
    const panchangam = $('#panchangam-container');
    if (panchangam) {
      const data = await loadJSON(DATA_FILES.panchangam);
      if (data && !Array.isArray(data)) {
        panchangam.innerHTML = `<article class="daily-panel card"><p class="eyebrow">${escapeHTML(data.dateLabel || 'Today')}</p><h2 lang="ta">${escapeHTML(data.mantra || 'ஓம் சரவணபவ')}</h2><h3>${escapeHTML(data.mantraEn || 'Om Saravana Bhava')}</h3><p>${escapeHTML(data.reflection || '')}</p><div class="practice-box"><strong>Practice:</strong> ${escapeHTML(data.practice || '')}</div><p class="small-note">${escapeHTML(data.note || '')}</p></article>`;
      }
    }
    const timeline = $('#timeline-container');
    if (timeline) {
      const data = await loadJSON(DATA_FILES.timeline);
      renderList(timeline, data, item => `<article class="timeline-item card"><p class="eyebrow">${escapeHTML(item.period)}</p><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p><div class="tags">${tagRow(item.tags)}</div></article>`);
    }
    const learning = $('#learning-container');
    if (learning) {
      const data = await loadJSON(DATA_FILES.learning);
      renderList(learning, data, item => `<article class="card learning-card"><p class="eyebrow">${escapeHTML(item.level)}</p><h3>${escapeHTML(item.title)}</h3><ol>${(item.steps || []).map(step => `<li>${escapeHTML(step)}</li>`).join('')}</ol><p><strong>Outcome:</strong> ${escapeHTML(item.outcome)}</p></article>`);
    }
  }

  async function enhanceGlobal() {
    const menu = $('.menu-toggle');
    const nav = $('.main-nav') || $('.nav');
    if (menu && nav) menu.addEventListener('click', () => nav.classList.toggle('open'));

    const date = $('#today-date');
    if (date) date.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const quoteTarget = $('#daily-quote') || $('[data-daily-quote]');
    if (quoteTarget) {
      const quotes = await loadJSON(DATA_FILES.daily);
      const quote = Array.isArray(quotes) && quotes.length ? quotes[new Date().getDate() % quotes.length] : null;
      if (quote) quoteTarget.textContent = quote.quoteTa && quote.quoteEn ? `${quote.quoteTa} — ${quote.quoteEn}` : (quote.quote || quote.text || quote.content || 'Om Saravana Bhava');
    }

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

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  async function init() {
    await enhanceGlobal();
    await Promise.all([
      initMainLists(), initSearchPage(), initTempleDetail(), initFestivalDetail(), initSlokaDetail(), initBatch04Pages()
    ]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.OmSaravanaBhava = { loadJSON, escapeHTML, slug };
})();
