export function updateMetrics(items, saved){
  const districts = new Set(items.map(item => item.district));
  document.getElementById('metric-total').textContent = items.length;
  document.getElementById('metric-districts').textContent = districts.size;
  document.getElementById('metric-saved').textContent = saved.length;
  document.getElementById('metric-review').textContent = items.filter(item => item.publication_status !== 'published').length;
}
