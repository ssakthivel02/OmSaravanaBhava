const state = {
  temples: [],
  filtered: [],
  activeTemple: null
};
export function setTemples(items){ state.temples = [...items]; state.filtered = [...items]; }
export function setFiltered(items){ state.filtered = [...items]; }
export function setActiveTemple(item){ state.activeTemple = item; }
export function getState(){ return state; }
