export async function loadJson(url){const r=await fetch(url);if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json()}
