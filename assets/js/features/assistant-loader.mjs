import {loadJson} from '../core/data-loader.mjs';
export async function loadAssistantRecord(id){
  try {
    return await loadJson(`data/temples/extended/${encodeURIComponent(id)}.json`);
  } catch {
    return loadJson(`data/temples/${encodeURIComponent(id)}.json`);
  }
}
