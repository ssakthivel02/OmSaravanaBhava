(() => {
  'use strict';

  const normalise = value => String(value || '').trim().toLocaleLowerCase();

  const createText = (parent, tag, text, className) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  };

  const makeItem = item => {
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.search = normalise([
      item.titleTa, item.titleEn, item.description, item.status, item.path
    ].join(' '));

    if (item.status) createText(article, 'span', item.status, 'pill');
    createText(
      article,
      'h3',
      item.titleTa ? `${item.titleTa} · ${item.titleEn}` : item.titleEn
    );
    createText(article, 'p', item.description);

    const link = document.createElement('a');
    link.className = 'btn secondary';
    link.href = item.path;
    link.textContent = 'Open module';
    article.appendChild(link);
    return article;
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const host = document.getElementById('exploreSections');
    const status = document.getElementById('exploreStatus');
    const search = document.getElementById('exploreSearch');
    const audience = document.getElementById('exploreAudience');
    const reset = document.getElementById('exploreReset');
    if (!host || !status || !search || !audience || !reset) return;

    try {
      const response = await fetch('data/navigation-sections.json', {
        cache: 'default',
        credentials: 'same-origin',
        headers: {'Accept': 'application/json'}
      });
      if (!response.ok) throw new Error(`Navigation data HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.sections)) throw new Error('Navigation sections are missing');

      host.replaceChildren();

      const sectionNodes = payload.sections.map(section => {
        const container = document.createElement('section');
        container.className = 'card explore-section';
        container.dataset.audiences = (section.audiences || []).join(' ');
        container.dataset.search = normalise(
          [section.titleTa, section.titleEn, section.summary].join(' ')
        );

        createText(
          container,
          'h2',
          section.titleTa ? `${section.titleTa} · ${section.titleEn}` : section.titleEn,
          'section-title'
        );
        createText(container, 'p', section.summary);

        const grid = document.createElement('div');
        grid.className = 'grid';
        const itemNodes = (section.items || []).map(makeItem);
        itemNodes.forEach(item => grid.appendChild(item));
        container.appendChild(grid);
        host.appendChild(container);
        return {container, itemNodes};
      });

      const apply = () => {
        const term = normalise(search.value);
        const selectedAudience = audience.value;
        let visibleItems = 0;
        let visibleSections = 0;

        sectionNodes.forEach(({container, itemNodes}) => {
          const audienceMatch = selectedAudience === 'all' ||
            container.dataset.audiences.split(/\s+/).includes(selectedAudience);
          let sectionItems = 0;

          itemNodes.forEach(item => {
            const itemMatch = !term ||
              item.dataset.search.includes(term) ||
              container.dataset.search.includes(term);
            item.hidden = !(audienceMatch && itemMatch);
            if (!item.hidden) sectionItems += 1;
          });

          container.hidden = sectionItems === 0;
          if (!container.hidden) {
            visibleSections += 1;
            visibleItems += sectionItems;
          }
        });

        status.textContent = `${visibleItems} module${visibleItems === 1 ? '' : 's'} across ${visibleSections} section${visibleSections === 1 ? '' : 's'}.`;
      };

      search.addEventListener('input', apply);
      audience.addEventListener('change', apply);
      reset.addEventListener('click', () => {
        search.value = '';
        audience.value = 'all';
        apply();
        search.focus();
      });

      host.setAttribute('aria-busy', 'false');
      apply();
    } catch (error) {
      console.error('[OmSaravanaBhava] Explore navigation failed', error);
      host.replaceChildren();
      const fallback = document.createElement('section');
      fallback.className = 'card';
      createText(fallback, 'h2', 'Navigation data is temporarily unavailable');
      const paragraph = createText(fallback, 'p', 'Use the complete site directory to continue.');
      const link = document.createElement('a');
      link.className = 'btn secondary';
      link.href = 'site-directory.html';
      link.textContent = 'Open site directory';
      paragraph.after(link);
      host.appendChild(fallback);
      host.setAttribute('aria-busy', 'false');
      status.textContent = 'Structured navigation could not be loaded.';
    }
  });
})();
