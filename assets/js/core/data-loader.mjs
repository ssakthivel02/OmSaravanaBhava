export async function loadJson(url) {
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  return response.json();
}
