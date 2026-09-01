export function initExperienceTabs(){
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      const panel = document.getElementById(item.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
  }));
}
