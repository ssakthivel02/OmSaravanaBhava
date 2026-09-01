export function filterRegional(items,{query='',district='',setting=''}){
  const needle=query.trim().toLowerCase();
  return items.filter(item=>{
    const text=[item.name,item.name_ta,item.district,item.official_temple_id].join(' ').toLowerCase();
    return (!needle||text.includes(needle))&&(!district||item.district===district)&&(!setting||item.setting===setting);
  });
}
