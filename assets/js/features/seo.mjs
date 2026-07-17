export function applySeo(record){
  if (!record?.seo) return;
  document.title = record.seo.title;
  let meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', record.seo.description);
}
