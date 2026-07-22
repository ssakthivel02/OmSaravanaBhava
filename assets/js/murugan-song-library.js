(() => {
  'use strict';

  const state = {collections: []};
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const labels = {
    original_tamil: 'Original Tamil',
    easy_reading_tamil: 'Easy-reading Tamil',
    transliteration: 'Transliteration',
    meaning: 'Meaning',
    audio: 'Audio / Read aloud',
    source: 'Source record'
  };

  const renderStats = collections => {
    const published = collections.filter(item => item.status === 'published-source-linked').length;
    const partial = collections.filter(item => item.status === 'partial-reviewed').length;
    const registers = collections.filter(item => item.status === 'source-register').length;
    const stats = [
      [collections.length, 'Governed collections'],
      [published, 'Published full-song libraries'],
      [partial, 'Bounded reviewed extracts'],
      [registers, 'Source registers awaiting text']
    ];
    byId('songStats').innerHTML = stats.map(([value, label]) =>
      `<article class="song-stat"><strong>${value}</strong><span>${escapeHtml(label)}</span></article>`
    ).join('');
  };

  const card = item => {
    const formats = (item.availableFormats || []).map(format =>
      `<span class="song-format">✓ ${escapeHtml(labels[format] || format)}</span>`
    ).join('');
    return `<article class="song-card">
      <div class="song-meta">
        <span class="song-pill">${escapeHtml(item.category)}</span>
        <span class="song-pill song-state">${escapeHtml(item.statusLabel)}</span>
      </div>
      <h3 lang="ta">${escapeHtml(item.titleTa)}</h3>
      <p class="song-en">${escapeHtml(item.titleEn)}</p>
      <p><small>${escapeHtml(item.author)}</small></p>
      <p class="song-summary">${escapeHtml(item.summary)}</p>
      <div class="song-formats" aria-label="Available formats">${formats || '<span class="song-format">Source review pending</span>'}</div>
      <a href="${escapeHtml(item.route)}">Open governed record</a>
    </article>`;
  };

  const render = () => {
    const query = (byId('songQuery').value || '').trim().toLocaleLowerCase();
    const category = byId('songCategory').value;
    const status = byId('songStatus').value;
    const filtered = state.collections.filter(item => {
      const haystack = [item.titleTa, item.titleEn, item.author, item.category, item.summary, item.statusLabel]
        .join(' ').toLocaleLowerCase();
      return (!query || haystack.includes(query)) &&
        (!category || item.category === category) &&
        (!status || item.status === status);
    });

    byId('songCount').textContent = `${filtered.length} of ${state.collections.length} governed collections shown.`;
    byId('songGrid').innerHTML = filtered.length
      ? filtered.map(card).join('')
      : '<article class="song-panel song-empty"><h3>No governed collection matched this filter.</h3><p>Clear the filters or use the complete site directory.</p></article>';
  };

  const populateSelect = (id, values, defaultLabel) => {
    const select = byId(id);
    select.innerHTML = `<option value="">${escapeHtml(defaultLabel)}</option>` +
      [...new Set(values)].sort((a, b) => a.localeCompare(b)).map(value =>
        `<option value="${escapeHtml(value)}">${escapeHtml(value.replaceAll('-', ' '))}</option>`
      ).join('');
  };

  const load = async () => {
    try {
      const response = await fetch('data/murugan-song-library.json', {
        cache: 'default', credentials: 'same-origin', headers: {'Accept': 'application/json'}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.collections = Array.isArray(data.collections) ? data.collections : [];
      populateSelect('songCategory', state.collections.map(item => item.category), 'All categories');
      populateSelect('songStatus', state.collections.map(item => item.status), 'All publication states');
      renderStats(state.collections);
      render();
    } catch (error) {
      console.error(error);
      byId('songCount').textContent = 'The governed collection registry could not be loaded.';
      byId('songGrid').innerHTML = '<article class="song-panel song-empty" role="alert">Open Thiruppugazh, Slokas or the Site Directory using the links above.</article>';
    }
  };

  ['songQuery', 'songCategory', 'songStatus'].forEach(id => {
    byId(id)?.addEventListener(id === 'songQuery' ? 'input' : 'change', render);
  });
  byId('songClear')?.addEventListener('click', () => {
    byId('songQuery').value = '';
    byId('songCategory').value = '';
    byId('songStatus').value = '';
    render();
    byId('songQuery').focus();
  });

  load();
})();
