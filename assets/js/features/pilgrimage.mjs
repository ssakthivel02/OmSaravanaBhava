import {readList, writeList} from '../utils/storage.mjs';
import {CONFIG} from '../core/config.mjs';
export function getSavedTemples(){ return readList(CONFIG.storageKey); }
export function toggleSavedTemple(id){
  const current = getSavedTemples();
  const exists = current.includes(id);
  const next = exists ? current.filter(item => item !== id) : [...current,id];
  writeList(CONFIG.storageKey, next);
  return {saved: !exists, list: next};
}
