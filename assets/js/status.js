document.querySelectorAll('[data-status]').forEach(
 el=>el.textContent=el.dataset.status||'repository-data-required'
);