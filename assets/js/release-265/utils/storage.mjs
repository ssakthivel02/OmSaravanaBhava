const KEY='osb-265-state';export const read=()=>JSON.parse(localStorage.getItem(KEY)||'{}');export const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
