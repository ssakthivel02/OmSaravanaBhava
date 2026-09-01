export const metrics=items=>({total:items.length,published:items.filter(x=>x.status==='published').length,review:items.filter(x=>x.status==='review_required').length});
