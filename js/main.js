import { el } from './util.js';
import { droneOff } from './audio/instruments.js';
import { session, stopTimer } from './drills/trial.js';
import { jamStop } from './jam/engine.js';
import { paintTop } from './ui/hud.js';
import { paintStats } from './ui/stats.js';
import { showMap } from './ui/stages.js';
import { showPractice } from './ui/practice.js';
import { showJam } from './ui/jam-view.js';
import { showRef } from './ui/reference.js';
import { bindSettings, chips, octSelects, syncSettings } from './ui/settings.js';
import { bindShortcuts } from './ui/shortcuts.js';

const TABS = ['map', 'practice', 'jam', 'ref'];

export let view = 'map';

// Switching tabs abandons any trial, run, drone or jam in progress.
export function go(v) {
  view = v;
  session.trial = null;
  session.run = null;
  stopTimer();
  droneOff();
  jamStop();
  TABS.forEach(x => el('nav-' + x).setAttribute('aria-selected', String(x === v)));
  if (v === 'map') showMap();
  else if (v === 'practice') showPractice();
  else if (v === 'jam') showJam();
  else showRef();
  paintStats();
}

bindSettings();
TABS.forEach(v => (el('nav-' + v).onclick = () => go(v)));
bindShortcuts();

octSelects();
chips();
syncSettings();
paintTop();
go('map');
