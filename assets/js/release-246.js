(() => {
  const button = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  if (button && nav) {
    button.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        nav.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
      }
    });
  }
  const header = document.querySelector('[data-header]');
  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, {passive:true});
})();