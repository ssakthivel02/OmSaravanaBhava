(() => {
  'use strict';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  const statusLabel = item => {
    if (item.playMode === 'device-tts') return 'Tamil read-aloud available';
    if (item.textStatus.includes('uploaded')) return 'Uploaded source identified';
    if (item.textStatus.includes('source-linked')) return 'Source-linked text available';
    return 'Source review required';
  };

  const renderCard = item => {
    const playable = item.playMode === 'device-tts' && item.speechText;
    const route = item.textRoute
      ? `<a class="btn secondary" href="${escapeHtml(item.textRoute)}">Open verified text</a>`
      : '';
    const playButton = playable
      ? `<button type="button" class="btn" data-audio-play="${escapeHtml(item.id)}">▶ Tamil read-aloud</button>
         <button type="button" class="btn secondary" data-audio-stop>Stop</button>`
      : '';
    return `<article class="card audio-catalog-card" id="audio-${escapeHtml(item.id)}"
      data-category="${escapeHtml(item.category)}"
      data-status="${escapeHtml(item.playMode)}">
      <span class="pill">${escapeHtml(item.category)}</span>
      <span class="pill">${escapeHtml(statusLabel(item))}</span>
      <h2 lang="ta">${escapeHtml(item.titleTa)}</h2>
      <h3>${escapeHtml(item.titleEn)}</h3>
      <p>${escapeHtml(item.summaryEn)}</p>
      <p class="audio-rights-note"><strong>Recording:</strong> no third-party MP3 is bundled; an owned or explicitly licensed recording is required.</p>
      <div class="audio-card-actions">${playButton}${route}</div>
      <p class="audio-card-status" role="status" aria-live="polite"></p>
    </article>`;
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('audioCatalogGrid');
    const search = document.getElementById('audioSearch');
    const category = document.getElementById('audioCategory');
    const availability = document.getElementById('audioAvailability');
    const count = document.getElementById('audioCount');
    const reset = document.getElementById('audioReset');

    if (!grid) return;

    try {
      const response = await fetch('data/audio-catalog.json', { cache: 'default' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const items = await response.json();

      const render = () => {
        const query = (search?.value || '').trim().toLocaleLowerCase();
        const selectedCategory = category?.value || 'All';
        const selectedAvailability = availability?.value || 'All';

        const filtered = items.filter(item => {
          const haystack = [
            item.titleTa, item.titleEn, item.category, item.summaryEn
          ].join(' ').toLocaleLowerCase();
          const queryMatch = !query || haystack.includes(query);
          const categoryMatch = selectedCategory === 'All' || item.category === selectedCategory;
          const availabilityMatch =
            selectedAvailability === 'All'
            || (selectedAvailability === 'playable' && item.playMode === 'device-tts')
            || (selectedAvailability === 'review' && item.playMode !== 'device-tts');
          return queryMatch && categoryMatch && availabilityMatch;
        });

        grid.innerHTML = filtered.length
          ? filtered.map(renderCard).join('')
          : '<div class="card">No audio-library record matched this filter.</div>';
        grid.setAttribute('aria-busy', 'false');
        if (count) count.textContent = `${filtered.length} of ${items.length} requested works shown.`;

        grid.querySelectorAll('[data-audio-play]').forEach(button => {
          button.addEventListener('click', () => {
            const item = items.find(entry => entry.id === button.dataset.audioPlay);
            const card = button.closest('.audio-catalog-card');
            const status = card?.querySelector('.audio-card-status');
            window.OSBSpeech?.speakText(item?.speechText || '', status);
          });
        });
        grid.querySelectorAll('[data-audio-stop]').forEach(button => {
          button.addEventListener('click', () => window.OSBSpeech?.stop());
        });

        const requestedTrack = new URLSearchParams(location.search).get('track');
        if (requestedTrack) {
          requestAnimationFrame(() => {
            document.getElementById(`audio-${requestedTrack}`)?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          });
        }
      };

      search?.addEventListener('input', render);
      category?.addEventListener('change', render);
      availability?.addEventListener('change', render);
      reset?.addEventListener('click', () => {
        if (search) search.value = '';
        if (category) category.value = 'All';
        if (availability) availability.value = 'All';
        render();
        search?.focus();
      });
      render();
    } catch (error) {
      console.error('Audio catalogue failed to load:', error);
      grid.innerHTML = '<div class="card" role="alert">The audio catalogue could not be loaded.</div>';
      grid.setAttribute('aria-busy', 'false');
    }
  });
})();