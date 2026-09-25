import { el } from './util.js';
import { applyStatic, loadStrings, setLang } from './i18n/index.js';
import { S } from './state/store.js';
import { droneOff } from './audio/instruments.js';
import { abandon } from './drills/trial.js';
import { jamStop } from './jam/engine.js';
import { paintTop } from './ui/hud.js';
import { paintStats } from './ui/stats.js';
import { showMap } from './ui/stages.js';
import { showPractice } from './ui/practice.js';
import { showJam } from './ui/jam-view.js';
import { showRef } from './ui/reference.js';
import { bindSettings, chips, octSelects, syncSettings } from './ui/settings.js';
import { bindShortcuts } from './ui/shortcuts.js';
import { registerWorker } from './ui/update.js';

const TABS = ['map', 'practice', 'jam', 'ref'];

export let view = 'map';

// Switching tabs abandons any trial, run, drone or jam in progress.
export function go(v) {
  view = v;
  abandon();
  droneOff();
  jamStop();
  TABS.forEach(x => el('nav-' + x).setAttribute('aria-selected', String(x === v)));
  if (v === 'map') showMap();
  else if (v === 'practice') showPractice();
  else if (v === 'jam') showJam();
  else showRef();
  paintStats();
}

function boot() {
  setLang(S.lang);
  applyStatic();
  bindSettings();
  TABS.forEach(v => (el('nav-' + v).onclick = () => go(v)));
  bindShortcuts();

  octSelects();
  chips();
  syncSettings();
  paintTop();
  go('map');
  registerWorker();
}

// The page stays hidden (css/app.css) until data-ready is set, so the markup's
// placeholder text never flashes before the strings are applied.
loadStrings()
  .then(boot)
  .finally(() => (document.documentElement.dataset.ready = ''));
