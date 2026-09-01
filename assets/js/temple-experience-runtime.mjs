import {loadJson} from './core/data-loader.mjs';
import {initHeader} from './components/header.mjs';
import {initExperienceTabs} from './components/experience-tabs.mjs';
import {renderExperienceGallery} from './components/experience-gallery.mjs';
import {renderExperienceFestivals} from './components/experience-festivals.mjs';
import {renderAvailable, renderItinerary} from './components/experience-planner.mjs';
import {buildLocalAnswer} from './components/experience-assistant.mjs';
import {readItinerary, writeItinerary, clearItinerary} from './features/experience-storage.mjs';
import {registerOfflineWorker} from './features/offline-registration.mjs';
import {applyLazyLoading} from './features/performance.mjs';
import {loadAssistantRecord} from './features/assistant-loader.mjs';
import {showToast} from './utils/toast.mjs';

initHeader();
initExperienceTabs();
registerOfflineWorker();

const galleryTemple = document.getElementById('gallery-temple');
const assistantTemple = document.getElementById('assistant-temple');
const festivalStatus = document.getElementById('festival-status');
const galleryViewer = document.getElementById('gallery-viewer');
const festivalViewer = document.getElementById('festival-viewer');
const available = document.getElementById('planner-available');
const itineraryTarget = document.getElementById('planner-itinerary');

let templeIndex = [];
let galleryRecords = [];
let festivalRecords = [];
let itinerary = readItinerary();

function populateTempleSelectors(){
  const options = templeIndex.map(item => `<option value="${item.id}">${item.order}. ${item.name}</option>`).join('');
  galleryTemple.innerHTML = options;
  assistantTemple.innerHTML = options;
}

function renderGallery(){
  renderExperienceGallery(galleryViewer, galleryRecords.find(item => item.temple_id === galleryTemple.value));
  applyLazyLoading();
}

function renderFestivals(){
  const status = festivalStatus.value;
  const filtered = festivalRecords.filter(item => !status || item.status === status);
  renderExperienceFestivals(festivalViewer, filtered);
}

function renderPlanner(){
  renderAvailable(available, templeIndex, itinerary);
  renderItinerary(itineraryTarget, templeIndex, itinerary);

  available.querySelectorAll('[data-add]').forEach(button => {
    button.addEventListener('click', () => {
      itinerary = [...itinerary, button.dataset.add];
      writeItinerary(itinerary);
      renderPlanner();
      showToast('Temple added to itinerary.');
    });
  });

  itineraryTarget.querySelectorAll('[data-remove]').forEach(button => {
    button.addEventListener('click', () => {
      itinerary = itinerary.filter(id => id !== button.dataset.remove);
      writeItinerary(itinerary);
      renderPlanner();
      showToast('Temple removed from itinerary.');
    });
  });
}

Promise.all([
  loadJson('data/temples/index.json'),
  loadJson('data/manifests/experience-gallery.json'),
  loadJson('data/manifests/experience-festivals.json')
]).then(([index, gallery, festivals]) => {
  templeIndex = index.records || [];
  galleryRecords = gallery.records || [];
  festivalRecords = festivals.records || [];
  populateTempleSelectors();
  renderGallery();
  renderFestivals();
  renderPlanner();
}).catch(error => {
  console.error(error);
  galleryViewer.innerHTML = '<p>Temple experience data could not be loaded.</p>';
});

galleryTemple.addEventListener('change', renderGallery);
festivalStatus.addEventListener('change', renderFestivals);

document.getElementById('clear-itinerary').addEventListener('click', () => {
  itinerary = [];
  clearItinerary();
  renderPlanner();
  showToast('Itinerary cleared.');
});

document.getElementById('assistant-submit').addEventListener('click', async () => {
  const answer = document.getElementById('assistant-answer');
  const question = document.getElementById('assistant-question').value.trim();
  answer.textContent = 'Reviewing published local temple data…';
  try {
    const record = await loadAssistantRecord(assistantTemple.value);
    answer.innerHTML = buildLocalAnswer(record, question);
  } catch (error) {
    console.error(error);
    answer.textContent = 'The local temple record could not be loaded.';
  }
});
