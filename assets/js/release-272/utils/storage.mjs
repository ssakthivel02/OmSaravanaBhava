const KEY='osb-272-state';export const read=()=>JSON.parse(localStorage.getItem(KEY)||'{}');export const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
