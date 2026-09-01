export function readList(key){
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
export function writeList(key, list){
  localStorage.setItem(key, JSON.stringify([...new Set(list)]));
}
