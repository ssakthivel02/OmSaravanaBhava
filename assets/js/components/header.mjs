import {qs} from '../utils/dom.mjs';
export function initHeader(){
  const button = qs('.te-menu');
  const nav = qs('.te-nav');
  button?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
}
