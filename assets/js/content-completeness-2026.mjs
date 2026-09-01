export const RELEASE = 246;

const byId = id => document.getElementById(id);
const create = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const labels = {
  original_tamil: 'Original Tamil',
  easy_reading_tamil: 'Easy-reading Tamil',
  transliteration: 'Transliteration',
  meaning: 'Meaning',
  audio: 'Audio / read aloud',
  source: 'Source record'
};

const fetchJson = async path => {
  const response = await fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {'Accept': 'application/json'}
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};

const metric = (value, label) => {
  const article = create('article', 'premium-metric');
  article.append(create('strong', '', String(value)), create('span', '', label));
  return article;
};

const collectionCard = item => {
  const article = create('article', 'premium-card');
  article.setAttribute('data-spotlight', '');
  const pills = create('div', 'premium-pills');
  pills.append(
    create('span', 'premium-pill', item.publicationStatus || 'status pending'),
    create('span', 'premium-pill', `${item.completionPercent || 0}% format coverage`)
  );
  const available = create('div', 'premium-pills');
  (item.availableFormats || []).forEach(format => {
    available.appendChild(create('span', 'premium-pill', `✓ ${labels[format] || format}`));
  });
  const missing = create('div', 'premium-pills');
  (item.missingFormats || []).forEach(format => {
    missing.appendChild(create('span', 'premium-pill', `○ ${labels[format] || format}`));
  });
  const link = create('a', 'premium-button secondary', 'Open collection');
  link.href = item.route || 'murugan-song-library.html';
  article.append(
    pills,
    create('h3', '', item.titleTa ? `${item.titleTa} · ${item.titleEn || ''}` : item.titleEn || item.id),
    create('p', '', item.statusLabel || item.nextEvidenceTask || ''),
    create('h4', '', 'Available'),
    available,
    create('h4', '', 'Still required'),
    missing,
    create('p', '', item.nextEvidenceTask || ''),
    link
  );
  return article;
};

const humanise = value => String(value || '').replaceAll('-', ' ');

const triageCard = item => {
  const article = create('article', 'premium-card');
  article.setAttribute('data-spotlight', '');
  const pills = create('div', 'premium-pills');
  pills.appendChild(create('span', 'premium-pill', humanise(item.triageStatus || 'source required')));
  if (item.classification) {
    pills.appendChild(create('span', 'premium-pill', item.classification));
  }
  const title = item.titleTa
    ? `${item.titleTa} · ${item.titleEn || ''}`
    : item.titleEn || item.slug;
  article.append(
    pills,
    create('h3', '', title),
    create('p', '', item.publicationDecision || 'No public publication decision recorded.'),
    create('h4', '', 'Next evidence action'),
    create('p', '', item.nextAction || 'Human source review required.')
  );
  const credits = item.verifiedCredits || {};
  const creditText = Object.entries(credits)
    .map(([key, value]) => `${humanise(key)}: ${value}`)
    .join(' · ');
  if (creditText) {
    article.append(create('p', '', `Verified metadata: ${creditText}`));
  } else if (item.candidateAttribution) {
    article.append(create('p', '', `Candidate attribution: ${item.candidateAttribution}`));
  }
  const evidence = Array.isArray(item.evidence) ? item.evidence : [];
  if (evidence.length) {
    const source = evidence[0];
    const link = create('a', 'premium-button secondary', 'Open external evidence');
    link.href = source.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    article.append(link);
  }
  return article;
};

const initialise = async () => {
  const metrics = byId('completenessMetrics');
  const grid = byId('completenessGrid');
  const status = byId('completenessStatus');
  const query = byId('completenessQuery');
  const missingFormat = byId('missingFormat');
  const clear = byId('completenessClear');
  const queue = byId('researchQueue');
  const triageGrid = byId('popularSongTriage');
  const triageStatus = byId('triageStatus');
  if (!metrics || !grid || !status || !query || !missingFormat || !clear || !queue || !triageGrid || !triageStatus) return;
  try {
    const [data, triage] = await Promise.all([
      fetchJson('/data/content-completeness.json'),
      fetchJson('/data/research-intake/popular-song-triage-2026-07-22.json')
    ]);
    const collections = Array.isArray(data.collections) ? data.collections : [];
    const triageRecords = Array.isArray(triage.records) ? triage.records : [];
    const metadataOnly = triageRecords.filter(item =>
      String(item.triageStatus || '').includes('metadata-only') ||
      String(item.triageStatus || '').includes('rights-withheld')
    ).length;
    metrics.replaceChildren(
      metric(data.governedCollections || 0, 'Governed collections'),
      metric(data.canonicalFullSongRecords || 0, 'Canonical full-song records'),
      metric(triageRecords.length, 'Popular/research titles triaged'),
      metric(metadataOnly, 'Metadata-only or rights-withheld titles')
    );
    Object.entries(labels).forEach(([value, label]) => missingFormat.add(new Option(label, value)));
    const state = {query: '', missing: 'All'};
    const render = () => {
      const needle = state.query.trim().toLocaleLowerCase();
      const filtered = collections.filter(item => {
        const text = [item.id, item.titleTa, item.titleEn, item.statusLabel, item.publicationStatus]
          .filter(Boolean).join(' ').toLocaleLowerCase();
        return (!needle || text.includes(needle)) &&
          (state.missing === 'All' || (item.missingFormats || []).includes(state.missing));
      });
      grid.replaceChildren();
      if (!filtered.length) {
        grid.appendChild(create('article', 'premium-card', 'No collection matched this gap filter.'));
      } else {
        filtered.forEach(item => grid.appendChild(collectionCard(item)));
      }
      status.textContent = `${filtered.length} of ${collections.length} governed collections shown. No completeness claim is made for missing fields.`;
    };
    query.addEventListener('input', event => {
      state.query = event.target.value;
      render();
    });
    missingFormat.addEventListener('change', event => {
      state.missing = event.target.value;
      render();
    });
    clear.addEventListener('click', () => {
      state.query = '';
      state.missing = 'All';
      query.value = '';
      missingFormat.value = 'All';
      render();
      query.focus();
    });

    triageGrid.replaceChildren();
    triageRecords.forEach(item => triageGrid.appendChild(triageCard(item)));
    triageStatus.textContent = `${triageRecords.length} requested or attachment-derived titles classified. Protected lyrics and recordings remain unpublished.`;

    queue.replaceChildren();
    (data.priorityResearchTasks || []).forEach(item => {
      const article = create('article', 'premium-card');
      article.append(
        create('span', 'premium-pill', `Priority ${item.priority}`),
        create('h3', '', item.workstream),
        create('p', '', item.scope),
        create('p', '', item.publicationRule)
      );
      queue.appendChild(article);
    });
    render();
    document.documentElement.dataset.contentCompletenessRelease = String(RELEASE);
  } catch (error) {
    console.error(error);
    status.textContent = 'Content completeness evidence is still being generated. No unreviewed text has been published.';
    triageStatus.textContent = 'Popular-song triage evidence is temporarily unavailable.';
    grid.innerHTML = '<article class="premium-card" role="alert">Completeness data is temporarily unavailable.</article>';
    triageGrid.innerHTML = '<article class="premium-card" role="alert">Research triage data is temporarily unavailable.</article>';
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialise, {once: true});
} else {
  initialise();
}
