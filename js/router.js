// Batch 06A router helper
window.OmRouter = { getParam(name){ return new URLSearchParams(location.search).get(name); } };
