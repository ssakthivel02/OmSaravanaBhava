window.OSB = {};

OSB.RELEASE = '153';

OSB.byId = id => document.getElementById(id);

OSB.escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

OSB.slug = value => encodeURIComponent(String(value ?? '').trim());

OSB.load = async path => {
  const response = await fetch(path, {
    cache: 'default',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error(`Unable to load ${path}: HTTP ${response.status}`);
  return response.json();
};

OSB.render = (id, markup) => {
  const container = OSB.byId(id);
  if (!container) return;
  container.innerHTML = markup;
  container.setAttribute('aria-busy', 'false');
};

OSB.templeCard = temple => {
  const state = temple.publicationStatus === 'published-source-linked'
    ? 'Source linked'
    : 'Directory review';
  return `<article class="card temple-card" data-type="${OSB.escape(temple.type)}">
    <span class="pill">${OSB.escape(temple.type)}</span>
    <span class="pill">${state}</span>
    <h3>${OSB.escape(temple.nameTa)}</h3>
    <p>${OSB.escape(temple.nameEn)}</p>
    <a class="btn secondary" href="temples/${OSB.slug(temple.id)}.html">Open temple</a>
  </article>`;
};

OSB.slokaCard = sloka => {
  const state = sloka.publicationStatus === 'partial-reviewed'
    ? 'Reviewed extract'
    : 'Published';
  return `<article class="card">
    <span class="pill">${OSB.escape(sloka.category)}</span>
    <span class="pill">${state}</span>
    <h3>${OSB.escape(sloka.titleTa)}</h3>
    <p>${OSB.escape(sloka.meaningTa || sloka.meaningEn)}</p>
    <a class="btn" href="slokas/${OSB.slug(sloka.id)}.html">Read sloka</a>
  </article>`;
};


OSB.thiruppugazhCard = song => `<article class="card thiruppugazh-card" data-venue="${OSB.escape(song.venueEn)}">
  <span class="pill">திருப்புகழ் ${OSB.escape(song.number)}</span>
  <span class="pill">${OSB.escape(song.venueTa)}</span>
  <h3>${OSB.escape(song.titleTa)}</h3>
  <p>${OSB.escape(song.titleEn)}</p>
  <p>${OSB.escape(song.summaryEn)}</p>
  <a class="btn" href="${OSB.escape(song.route)}">Read song</a>
</article>`;

OSB.thiruppugazh = () => OSB.safe(async () => {
  const songs = await OSB.load('data/thiruppugazh.json');
  const input = OSB.byId('tgq');
  const venue = OSB.byId('tgVenue');
  const reset = OSB.byId('tgReset');
  const count = OSB.byId('tgCount');

  const renderSongs = () => {
    const query = (input?.value || '').trim().toLocaleLowerCase();
    const selectedVenue = venue?.value || 'All';
    const filtered = songs.filter(song => {
      const venueMatch = selectedVenue === 'All' || song.venueEn === selectedVenue;
      const haystack = [
        song.number, song.titleTa, song.titleEn, song.venueTa, song.venueEn,
        song.meterTa, song.summaryEn, song.textTa
      ].join(' ').toLocaleLowerCase();
      return venueMatch && (!query || haystack.includes(query));
    });
    OSB.render(
      'thiruppugazhGrid',
      filtered.length
        ? filtered.map(OSB.thiruppugazhCard).join('')
        : '<div class="card">No verified published song matched this filter.</div>'
    );
    if (count) count.textContent = `${filtered.length} of ${songs.length} verified songs shown.`;
  };

  input?.addEventListener('input', renderSongs);
  venue?.addEventListener('change', renderSongs);
  reset?.addEventListener('click', () => {
    if (input) input.value = '';
    if (venue) venue.value = 'All';
    renderSongs();
    input?.focus();
  });
  renderSongs();
});

OSB.festivalCard = festival => `<article class="card">
  <span class="pill">${OSB.escape(festival.month)}</span>
  <h3>${OSB.escape(festival.nameTa)}</h3>
  <p>${OSB.escape(festival.summary)}</p>
  <a class="btn" href="festivals/${OSB.slug(festival.id)}.html">Open festival</a>
</article>`;

OSB.clearBusyStates = () => {
  document.querySelectorAll('[aria-busy="true"]').forEach(element => {
    element.setAttribute('aria-busy', 'false');
  });
};

OSB.safe = async task => {
  try {
    await task();
  } catch (error) {
    console.error(error);
    OSB.clearBusyStates();
    const main = document.querySelector('main,.wrap,#detail,#reader');
    if (main && !document.getElementById('osb-content-error')) {
      main.insertAdjacentHTML(
        'beforeend',
        '<div id="osb-content-error" class="card" role="alert">Content could not be loaded. Check your connection and try again.</div>'
      );
    }
  }
};

OSB.home = () => OSB.safe(async () => {
  const [temples, slokas, festivals] = await Promise.all([
    OSB.load('data/temples.json'),
    OSB.load('data/slokas.json'),
    OSB.load('data/festivals.json')
  ]);
  const publishedTemples = temples.filter(item => item.publicationStatus === 'published-source-linked');
  OSB.render('templeGrid', publishedTemples.slice(0, 6).map(OSB.templeCard).join(''));
  OSB.render('dailySloka', OSB.slokaCard(slokas[0]));
  OSB.render('festivalGrid', festivals.map(OSB.festivalCard).join(''));
  const countdown = OSB.byId('countdown');
  if (countdown) {
    countdown.textContent = 'Next major festival: confirm the exact date using an authoritative Panchangam or temple calendar';
  }
});

OSB.temples = () => OSB.safe(async () => {
  const temples = await OSB.load('data/temples.json');
  OSB.render('templeGrid', temples.map(OSB.templeCard).join(''));

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.type = 'button';
    button.setAttribute('aria-pressed', button.dataset.filter === 'All' ? 'true' : 'false');
    button.addEventListener('click', () => {
      const selected = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(filter => {
        filter.setAttribute('aria-pressed', filter.dataset.filter === selected ? 'true' : 'false');
      });
      document.querySelectorAll('.temple-card').forEach(card => {
        card.hidden = selected !== 'All' && card.dataset.type !== selected;
      });
    });
  });
});

OSB.slokas = () => OSB.safe(async () => {
  const slokas = await OSB.load('data/slokas.json');
  OSB.render(
    'slokaGrid',
    slokas.filter(item => item.publicationStatus !== 'draft').map(OSB.slokaCard).join('')
  );
});

OSB.search = () => OSB.safe(async () => {
  const params = new URLSearchParams(location.search);
  const submitted = params.has('q');
  const query = (params.get('q') || '').trim();
  const input = OSB.byId('q');
  if (input) input.value = query;

  const [temples, slokas, festivals, literature, thiruppugazh, audioCatalog] = await Promise.all([
    OSB.load('data/temples.json'),
    OSB.load('data/slokas.json'),
    OSB.load('data/festivals.json'),
    OSB.load('data/literature.json'),
    OSB.load('data/thiruppugazh.json'),
    OSB.load('data/audio-catalog.json')
  ]);

  const records = [
    ...temples
      .filter(item => item.publicationStatus === 'published-source-linked')
      .map(item => ({
        kind: 'Temple',
        title: `${item.nameTa} ${item.nameEn}`,
        summary: `${item.summary} ${item.place}`,
        searchText: [item.nameTa, item.nameEn, item.summary, item.place, ...(item.tags || [])].join(' '),
        url: `temples/${OSB.slug(item.id)}.html`
      })),
    ...slokas
      .filter(item => item.publicationStatus !== 'draft')
      .map(item => ({
        kind: 'Sloka',
        title: `${item.titleTa} ${item.titleEn}`,
        summary: item.meaningEn,
        searchText: [item.titleTa, item.titleEn, item.textTa, item.meaningTa, item.meaningEn].join(' '),
        url: `slokas/${OSB.slug(item.id)}.html`
      })),
    ...festivals.map(item => ({
      kind: 'Festival',
      title: `${item.nameTa} ${item.nameEn}`,
      summary: item.summary,
      searchText: [item.nameTa, item.nameEn, item.summary, ...(item.tags || [])].join(' '),
      url: `festivals/${OSB.slug(item.id)}.html`
    })),
    ...literature
      .filter(item => item.publicationStatus === 'published-source-linked')
      .map(item => ({
        kind: 'Literature',
        title: `${item.titleTa} ${item.titleEn}`,
        summary: item.summary,
        searchText: [item.titleTa, item.titleEn, item.author, item.genre, item.summary].join(' '),
        url: `literature/${OSB.slug(item.id)}.html`
      })),
    ...thiruppugazh
      .filter(item => item.publicationStatus === 'published-source-linked')
      .map(item => ({
        kind: 'Thiruppugazh',
        title: `${item.number} ${item.titleTa} ${item.titleEn}`,
        summary: `${item.venueTa} · ${item.summaryEn}`,
        searchText: [
          item.number, item.titleTa, item.titleEn, item.venueTa, item.venueEn,
          item.meterTa, item.summaryEn, item.textTa
        ].join(' '),
        url: item.route
      })),
    ...audioCatalog.map(item => ({
      kind: 'Audio',
      title: `${item.titleTa} ${item.titleEn}`,
      summary: item.summaryEn,
      searchText: [item.titleTa, item.titleEn, item.category, item.summaryEn].join(' '),
      url: `audio-library.html?track=${encodeURIComponent(item.id)}`
    }))
  ];

  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const results = terms.length
    ? records.filter(item => terms.every(term => item.searchText.toLocaleLowerCase().includes(term)))
    : records.slice(0, 12);

  const resultMarkup = results.length
    ? `<p><strong>${results.length}</strong> published result${results.length === 1 ? '' : 's'} found.</p>` +
      results.map(item => `<article class="card result">
        <span class="pill">${OSB.escape(item.kind)}</span>
        <h3>${OSB.escape(item.title)}</h3>
        <p>${OSB.escape(item.summary)}</p>
        <a class="btn" href="${item.url}">Open</a>
      </article>`).join('')
    : '<div class="card">No published source-linked result matched. Try Palani, Thiruchendur, Muththaiththaru, Vel, Sashti or Thirumurugatruppadai.</div>';

  OSB.render('results', resultMarkup);
  const resultsRegion = OSB.byId('results');
  if (submitted && resultsRegion) resultsRegion.focus();
});

OSB.festivals = () => OSB.safe(async () => {
  const festivals = await OSB.load('data/festivals.json');
  OSB.render('festivalGrid', festivals.map(OSB.festivalCard).join(''));
});

OSB.canonicalUrl = () =>
  document.querySelector('link[rel="canonical"]')?.href || location.href;

OSB.announce = message => {
  const existing = document.getElementById('osb-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'osb-toast';
  toast.className = 'osb-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

OSB.storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Preferences remain functional for the current page when storage is unavailable.
    }
  }
};

OSB.restorePrefs = () => {
  const dark = OSB.storage.get('osb-dark') === '1';
  const large = OSB.storage.get('osb-text-large') === '1';

  document.body.classList.toggle('dark', dark);
  document.body.style.fontSize = large ? '18px' : '';

  const darkButton = document.querySelector('[data-dark]');
  if (darkButton) {
    darkButton.type = 'button';
    darkButton.setAttribute('aria-pressed', dark ? 'true' : 'false');
    darkButton.setAttribute('aria-label', dark ? 'Disable dark mode' : 'Enable dark mode');
  }

  const textButton = document.querySelector('[data-text]');
  if (textButton) {
    textButton.type = 'button';
    textButton.setAttribute('aria-pressed', large ? 'true' : 'false');
    textButton.setAttribute('aria-label', large ? 'Reset text size' : 'Increase text size');
  }

  const shareButton = document.querySelector('[data-share]');
  if (shareButton) {
    shareButton.type = 'button';
    shareButton.setAttribute('aria-label', 'Share this page');
  }
};

OSB.markCurrentNavigation = () => {
  const currentPath = location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('.links a').forEach(link => {
    const linkPath = new URL(link.href, location.href).pathname.replace(/\/index\.html$/, '/');
    if (linkPath === currentPath) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
};

document.addEventListener('click', event => {
  const darkButton = event.target.closest('[data-dark]');
  if (darkButton) {
    document.body.classList.toggle('dark');
    const active = document.body.classList.contains('dark');
    darkButton.setAttribute('aria-pressed', active ? 'true' : 'false');
    darkButton.setAttribute('aria-label', active ? 'Disable dark mode' : 'Enable dark mode');
    OSB.storage.set('osb-dark', active ? '1' : '0');
  }

  const textButton = event.target.closest('[data-text]');
  if (textButton) {
    const active = document.body.style.fontSize === '18px';
    const next = !active;
    document.body.style.fontSize = next ? '18px' : '';
    textButton.setAttribute('aria-pressed', next ? 'true' : 'false');
    textButton.setAttribute('aria-label', next ? 'Reset text size' : 'Increase text size');
    OSB.storage.set('osb-text-large', next ? '1' : '0');
  }

  const shareButton = event.target.closest('[data-share]');
  if (shareButton) {
    const url = OSB.canonicalUrl();
    if (navigator.share) {
      navigator.share({title: document.title, url})
        .then(() => OSB.announce('Shared successfully'))
        .catch(error => {
          if (error?.name !== 'AbortError') console.error('Share failed', error);
        });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => OSB.announce('Link copied to clipboard'))
        .catch(error => {
          console.error('Clipboard write failed', error);
          OSB.announce('Unable to copy link');
        });
    } else {
      OSB.announce('Sharing is not supported in this browser');
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  OSB.restorePrefs();
  OSB.markCurrentNavigation();
  const moduleName = document.body.dataset.module;
  if (OSB[moduleName]) OSB[moduleName]();
});
