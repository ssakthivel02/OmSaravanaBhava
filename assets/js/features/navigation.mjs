export function relativeTemple(items, activeId, direction){
  const index = items.findIndex(item => item.id === activeId);
  const next = (index + direction + items.length) % items.length;
  return items[next];
}
