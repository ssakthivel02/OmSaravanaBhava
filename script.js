/* Om Saravana Bhava - Safe Static GitHub Pages Engine v1.1 */
(function () {
  'use strict';

  const OmApp = (window.OmApp = window.OmApp || {});

  OmApp.escapeHTML = function (value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  OmApp.loadJSON = async function (path) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } catch (error) {
      console.warn('[OmApp] JSON unavailable:', path, error.message);
      return [];
    }
  };

  function setTodayDate() {
    const todayTargets = document.querySelectorAll('#today, [data-date="today"]');
    const todayText = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    todayTargets.forEach((el) => { el.textContent = todayText; });
  }

  function enhanceMobileNav() {
    const nav = document.querySelector('.nav-inner');
    const links = document.querySelector('.nav-links');
    if (!nav || !links || document.getElementById('menuToggle')) return;

    const btn = document.createElement('button');
    btn.id = 'menuToggle';
    btn.className = 'menu-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    btn.textContent = '☰';
    nav.appendChild(btn);

    btn.addEventListener('click', function () {
      const open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '×' : '☰';
    });
  }

  function createCard(item, type) {
    const titleTa = item.nameTa || item.titleTa || '';
    const titleEn = item.nameEn || item.titleEn || '';
    const summary = item.summary || item.description || item.shortDescription || '';
    const location = item.location ? `<p class="muted small">📍 ${OmApp.escapeHTML(item.location)}${item.district ? ', ' + OmApp.escapeHTML(item.district) : ''}</p>` : '';
    const tags = Array.isArray(item.highlights)
      ? `<div class="mini-tags">${item.highlights.map((tag) => `<span>${OmApp.escapeHTML(tag)}</span>`).join('')}</div>`
      : '';
    const map = item.mapLink ? `<a class="btn small-btn" target="_blank" rel="noopener noreferrer" href="${OmApp.escapeHTML(item.mapLink)}">View Map</a>` : '';
    return `
      <article class="card dynamic-card" data-type="${OmApp.escapeHTML(type)}" data-search="${OmApp.escapeHTML((titleTa + ' ' + titleEn + ' ' + summary + ' ' + (item.location || '')).toLowerCase())}">
        ${titleTa ? `<h3 class="tamil">${OmApp.escapeHTML(titleTa)}</h3>` : ''}
        ${titleEn ? `<h2>${OmApp.escapeHTML(titleEn)}</h2>` : ''}
        ${location}
        <p>${OmApp.escapeHTML(summary)}</p>
        ${tags}
        ${map}
      </article>`;
  }

  function renderList(container, data, type) {
    if (!container || !Array.isArray(data) || data.length === 0) return;
    container.innerHTML = data.map((item) => createCard(item, type)).join('');
  }

  function addSearch(container) {
    if (!container || container.dataset.searchReady === 'true') return;
    container.dataset.searchReady = 'true';
    const input = document.createElement('input');
    input.className = 'searchbox page-search';
    input.type = 'search';
    input.placeholder = 'Search this page...';
    input.setAttribute('aria-label', 'Search this page');
    container.parentNode.insertBefore(input, container);
    input.addEventListener('input', function () {
      const q = input.value.trim().toLowerCase();
      container.querySelectorAll('.dynamic-card').forEach((card) => {
        card.hidden = q && !card.dataset.search.includes(q);
      });
    });
  }

  async function hydratePage() {
    const path = window.location.pathname.toLowerCase();

    const templesContainers = document.querySelectorAll('#temples-full-container, #temples-data-container, [data-omapp="temples"]');
    const festivalsContainers = document.querySelectorAll('#festivals-full-container, [data-omapp="festivals"]');
    const slokasContainers = document.querySelectorAll('#slokas-full-container, [data-omapp="slokas"]');

    if (path.includes('temples') && templesContainers.length) {
      const data = await OmApp.loadJSON('data/temples.json');
      templesContainers.forEach((c) => { renderList(c, data, 'temple'); addSearch(c); });
    }

    if (path.includes('festivals') && festivalsContainers.length) {
      const data = await OmApp.loadJSON('data/festivals.json');
      festivalsContainers.forEach((c) => { renderList(c, data, 'festival'); addSearch(c); });
    }

    if (path.includes('slokas') && slokasContainers.length) {
      const data = await OmApp.loadJSON('data/slokas.json');
      slokasContainers.forEach((c) => { renderList(c, data, 'sloka'); addSearch(c); });
    }

    if ((path === '/' || path.includes('index')) && templesContainers.length) {
      const data = await OmApp.loadJSON('data/temples.json');
      templesContainers.forEach((c) => renderList(c, data.slice(0, 3), 'temple'));
    }

    const panchangam = document.getElementById('panchangam-data') || document.querySelector('[data-omapp="panchangam"]');
    if (panchangam) {
      const data = await OmApp.loadJSON('data/panchangam.json');
      if (data[0]) {
        const p = data[0];
        panchangam.innerHTML = `
          <div class="card dynamic-card">
            <h3>${OmApp.escapeHTML(p.location)}</h3>
            <p><strong>Sunrise:</strong> ${OmApp.escapeHTML(p.sunrise)} | <strong>Sunset:</strong> ${OmApp.escapeHTML(p.sunset)}</p>
            <p><strong>Tithi:</strong> ${OmApp.escapeHTML(p.tithi)} | <strong>Nakshatra:</strong> ${OmApp.escapeHTML(p.nakshatra)}</p>
            <p><strong>Rahu Kalam:</strong> ${OmApp.escapeHTML(p.rahuKalam)}</p>
            <p><strong>Festival:</strong> ${OmApp.escapeHTML(p.festival)}</p>
          </div>`;
      }
    }
  }

  function safeAIBox() {
    const input = document.getElementById('aiInput');
    const out = document.getElementById('aiOut');
    const btn = document.getElementById('aiBtn');
    if (input && out && btn) {
      btn.addEventListener('click', function () {
        out.textContent = 'Demo guide: This static page is ready. Future AI backend can answer: ' + input.value;
      });
    }
  }

  function init() {
    setTodayDate();
    enhanceMobileNav();
    safeAIBox();
    hydratePage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
