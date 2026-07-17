export function filterTemples(items, {query='', district='', group=''}){
  const needle = query.trim().toLowerCase();
  return items.filter(item => {
    const text = [item.name,item.name_ta,item.district,item.theme].join(' ').toLowerCase();
    return (!needle || text.includes(needle))
      && (!district || item.district === district)
      && (!group || item.group === group);
  });
}
