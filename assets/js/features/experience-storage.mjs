const KEY = 'osb-249c-itinerary-v1';
export function readItinerary(){
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}
export function writeItinerary(items){
  localStorage.setItem(KEY, JSON.stringify([...new Set(items)]));
}
export function clearItinerary(){
  localStorage.removeItem(KEY);
}
