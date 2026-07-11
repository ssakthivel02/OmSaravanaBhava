document.querySelectorAll('[data-status]').forEach(
 element=>element.textContent=element.dataset.status||'repository-evidence-required'
);