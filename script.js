(function () {
  'use strict';

  var DATA_CACHE = {};
  var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getMain() {
    return $('main') || document.body;
  }

  function dataUrl(name) {
    return 'data/' + name + '.json';
  }

  function loadJSON(name) {
    if (DATA_CACHE[name]) return Promise.resolve(DATA_CACHE[name]);
    return fetch(dataUrl(name), { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('Unable to load ' + name);
        return res.json();
      })
      .then(function (data) {
        DATA_CACHE[name] = data;
        return data;
      })
      .catch(function (error) {
        console.warn('[OSB] JSON load skipped:', error.message);
        return [];
      });
  }

  function section(titleTa, titleEn, intro) {
    var wrap = el('section', 'osb-dynamic section');
    wrap.innerHTML = '<div class="osb-section-head">' +
      '<p class="kicker tamil">' + escapeHTML(titleTa) + '</p>' +
      '<h2>' + escapeHTML(titleEn) + '</h2>' +
      (intro ? '<p class="muted">' + escapeHTML(intro) + '</p>' : '') +
      '</div>';
    return wrap;
  }

  function renderTemples(data, target, limit) {
    var list = limit ? data.slice(0, limit) : data;
    var grid = el('div', 'osb-card-grid');
    list.forEach(function (t) {
      var card = el('article', 'osb-data-card');
      card.innerHTML = '<div class="osb-card-top">' +
        '<span class="num">' + escapeHTML(String(t.order).padStart(2, '0')) + '</span>' +
        '<button class="osb-fav" data-fav="temple:' + escapeHTML(t.id) + '" aria-label="Save favourite">♡</button>' +
        '</div>' +
        '<h3 class="tamil">' + escapeHTML(t.nameTa) + '</h3>' +
        '<h4>' + escapeHTML(t.nameEn) + '</h4>' +
        '<p>' + escapeHTML(t.short) + '</p>' +
        '<p class="muted small">📍 ' + escapeHTML(t.location) + ', ' + escapeHTML(t.district) + '</p>' +
        '<p class="muted small">🕒 ' + escapeHTML(t.openingHours) + '</p>' +
        '<div class="osb-tags">' + (t.festivals || []).map(function (f) { return '<span>' + escapeHTML(f) + '</span>'; }).join('') + '</div>' +
        '<a class="btn secondary osb-mini-btn" target="_blank" rel="noopener" href="' + escapeHTML(t.mapLink) + '">View Map</a>';
      grid.appendChild(card);
    });
    target.appendChild(grid);
    hydrateFavourites(target);
  }

  function renderFestivals(data, target) {
    var grid = el('div', 'osb-card-grid');
    data.forEach(function (f) {
      var card = el('article', 'osb-data-card');
      card.innerHTML = '<h3 class="tamil">' + escapeHTML(f.nameTa) + '</h3>' +
        '<h4>' + escapeHTML(f.nameEn) + '</h4>' +
        '<p class="muted small">🗓 ' + escapeHTML(f.month) + '</p>' +
        '<p>' + escapeHTML(f.description) + '</p>' +
        '<div class="osb-tags">' + (f.rituals || []).map(function (r) { return '<span>' + escapeHTML(r) + '</span>'; }).join('') + '</div>';
      grid.appendChild(card);
    });
    target.appendChild(grid);
  }

  function renderSlokas(data, target) {
    var grid = el('div', 'osb-card-grid');
    data.forEach(function (s) {
      var card = el('article', 'osb-data-card');
      card.innerHTML = '<div class="osb-card-top"><span class="osb-chip">' + escapeHTML(s.category) + '</span>' +
        '<button class="osb-fav" data-fav="sloka:' + escapeHTML(s.id) + '" aria-label="Save favourite">♡</button></div>' +
        '<h3 class="tamil">' + escapeHTML(s.titleTa) + '</h3>' +
        '<h4>' + escapeHTML(s.titleEn) + '</h4>' +
        '<p class="muted small">Author: ' + escapeHTML(s.author) + '</p>' +
        '<p>' + escapeHTML(s.meaning) + '</p>' +
        '<div class="osb-tags">' + (s.benefits || []).map(function (b) { return '<span>' + escapeHTML(b) + '</span>'; }).join('') + '</div>';
      grid.appendChild(card);
    });
    target.appendChild(grid);
    hydrateFavourites(target);
  }

  function renderGallery(data, target) {
    var grid = el('div', 'osb-gallery-grid');
    data.forEach(function (g, i) {
      var card = el('article', 'osb-gallery-card');
      card.innerHTML = '<span class="osb-chip">' + escapeHTML(g.category) + '</span>' +
        '<h3>' + escapeHTML(g.title) + '</h3>' +
        '<p>' + escapeHTML(g.description) + '</p>';
      card.style.setProperty('--osb-accent-index', i + 1);
      grid.appendChild(card);
    });
    target.appendChild(grid);
  }

  function addSearch(sectionEl, placeholder, callback) {
    var input = el('input', 'searchbox osb-search');
    input.type = 'search';
    input.placeholder = placeholder;
    input.setAttribute('aria-label', placeholder);
    sectionEl.appendChild(input);
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { callback(input.value.trim().toLowerCase()); }, 180);
    });
  }

  function getFavourites() {
    try { return JSON.parse(localStorage.getItem('osb_favourites') || '[]'); }
    catch (e) { return []; }
  }

  function setFavourites(list) {
    try { localStorage.setItem('osb_favourites', JSON.stringify(list)); } catch (e) {}
  }

  function hydrateFavourites(root) {
    var favourites = getFavourites();
    root.querySelectorAll('[data-fav]').forEach(function (btn) {
      var id = btn.getAttribute('data-fav');
      btn.textContent = favourites.indexOf(id) >= 0 ? '❤️' : '♡';
      btn.addEventListener('click', function () {
        var current = getFavourites();
        var index = current.indexOf(id);
        if (index >= 0) current.splice(index, 1);
        else current.push(id);
        setFavourites(current);
        btn.textContent = current.indexOf(id) >= 0 ? '❤️' : '♡';
      });
    });
  }

  function initIndex() {
    var main = getMain();
    var today = $('#today');
    if (today) {
      today.textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    Promise.all([loadJSON('temples'), loadJSON('daily_quotes'), loadJSON('panchangam')]).then(function (all) {
      var temples = all[0], quotes = all[1], panchangam = all[2];
      var quote = quotes[new Date().getDate() % Math.max(quotes.length, 1)] || {};
      var s = section('தினசரி தரிசனம்', 'Daily Divine Content', 'A safe static data layer loaded from JSON files.');
      var p = panchangam[0] || {};
      s.innerHTML += '<div class="osb-card-grid osb-card-grid-2">' +
        '<article class="osb-data-card"><h3>Today\'s Panchangam</h3><p class="muted small">' + escapeHTML(p.location || 'Chennai') + '</p><p>Sunrise: ' + escapeHTML(p.sunrise || '-') + ' · Sunset: ' + escapeHTML(p.sunset || '-') + '</p><p class="muted">' + escapeHTML(p.note || '') + '</p></article>' +
        '<article class="osb-data-card"><h3 class="tamil">' + escapeHTML(quote.quoteTa || 'ஓம் சரவண பவ') + '</h3><p>' + escapeHTML(quote.quoteEn || 'Om Saravana Bhava') + '</p><p class="muted small">Theme: ' + escapeHTML(quote.theme || 'Devotion') + '</p></article>' +
        '</div>';
      renderTemples(temples, s, 3);
      main.appendChild(s);
    });
  }

  function initTemples() {
    loadJSON('temples').then(function (data) {
      var s = section('ஆறு படைவீடுகள்', 'Dynamic Arupadai Veedu Directory', 'Search and explore the six sacred abodes.');
      addSearch(s, 'Search temples by name, district or festival...', function (q) {
        var existing = s.querySelector('.osb-card-grid');
        if (existing) existing.remove();
        renderTemples(data.filter(function (t) {
          return !q || JSON.stringify(t).toLowerCase().indexOf(q) >= 0;
        }), s);
      });
      renderTemples(data, s);
      getMain().appendChild(s);
    });
  }

  function initFestivals() {
    loadJSON('festivals').then(function (data) {
      var s = section('திருவிழாக்கள்', 'Dynamic Festival Guide', 'Murugan festivals, meanings and rituals.');
      renderFestivals(data, s);
      getMain().appendChild(s);
    });
  }

  function initSlokas() {
    loadJSON('slokas').then(function (data) {
      var s = section('பக்திப் பாடல்கள்', 'Dynamic Slokas & Mantras', 'Search devotional texts, meanings and benefits.');
      addSearch(s, 'Search slokas, mantras or benefits...', function (q) {
        var existing = s.querySelector('.osb-card-grid');
        if (existing) existing.remove();
        renderSlokas(data.filter(function (item) {
          return !q || JSON.stringify(item).toLowerCase().indexOf(q) >= 0;
        }), s);
      });
      renderSlokas(data, s);
      getMain().appendChild(s);
    });
  }

  function initGallery() {
    loadJSON('gallery').then(function (data) {
      var s = section('தரிசன காட்சிகள்', 'Dynamic Spiritual Gallery', 'A lightweight gallery layer that does not require heavy images yet.');
      renderGallery(data, s);
      getMain().appendChild(s);
    });
  }

  function initAIGuide() {
    var input = document.getElementById('aiInput');
    var out = document.getElementById('aiOut');
    var btn = document.getElementById('aiBtn');
    if (input && out && btn) {
      btn.addEventListener('click', function () {
        var q = escapeHTML(input.value || '');
        out.innerHTML = '<strong>Om Saravana Bhava Guide:</strong> This static guide can help with temples, slokas and festivals. You asked: ' + q;
      });
    }
  }

  function initBackToTop() {
    var btn = el('button', 'osb-backtop', '↑');
    btn.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(btn);
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    window.addEventListener('scroll', function () {
      btn.classList.toggle('visible', window.scrollY > 450);
    }, { passive: true });
  }

  function init() {
    initAIGuide();
    initBackToTop();
    if (PAGE === '' || PAGE === 'index.html') initIndex();
    else if (PAGE === 'temples.html') initTemples();
    else if (PAGE === 'festivals.html') initFestivals();
    else if (PAGE === 'slokas.html') initSlokas();
    else if (PAGE === 'gallery.html') initGallery();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
