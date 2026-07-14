(() => {
  'use strict';

  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animateCount = (element, target) => {
    if (prefersReducedMotion) {
      element.textContent = String(target);
      return;
    }
    let value = 0;
    const increment = Math.max(1, Math.ceil(target / 35));
    const step = () => {
      value = Math.min(target, value + increment);
      element.textContent = String(value);
      if (value < target) requestAnimationFrame(step);
    };
    step();
  };

  const loadCount = async element => {
    const source = element.dataset.countSource;
    if (!source) return;
    try {
      const response = await fetch(source, {
        credentials: 'same-origin',
        headers: {'Accept': 'application/json'}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('Expected a JSON array');
      animateCount(element, payload.length);
    } catch (error) {
      console.error(`Unable to load count from ${source}`, error);
      element.textContent = 'Unavailable';
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const stage = document.querySelector('.home-stage');
    if (stage && !prefersReducedMotion) {
      stage.addEventListener('pointermove', event => {
        const bounds = stage.getBoundingClientRect();
        stage.style.setProperty('--home-x', `${event.clientX - bounds.left - bounds.width / 2}px`);
        stage.style.setProperty('--home-y', `${event.clientY - bounds.top - bounds.height / 2}px`);
      }, {passive: true});
    }
    document.querySelectorAll('[data-count-source]').forEach(loadCount);
  });
})();
