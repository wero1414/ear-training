// Reference tab: a playable keyboard and a sustained drone.
import { S } from '../state/store.js';
import { el } from '../util.js';
import { t } from '../i18n/index.js';
import { fullName } from '../labels.js';
import { droneActive, droneOff, droneOn, freqOf, pickTimbre, playNote } from '../audio/instruments.js';
import { keyboard } from './keyboard.js';

export function showRef() {
  el('setBox').hidden = true;
  el('view').innerHTML =
    '<div class="stage">' +
    '<p style="color:var(--dim);font-size:13.5px">' +
    t('ref.intro', { oct: S.octLow }) +
    '</p>' +
    '<div id="answers"></div><div class="octrow" id="refrow" style="margin-top:14px"></div></div>';
  keyboard(el('answers'), null, pc => playNote((S.octLow + 1) * 12 + pc, 0, +S.dur, pickTimbre()));
  const row = el('refrow'),
    sel = document.createElement('select');
  for (let m = 36; m <= 84; m++) sel.appendChild(new Option(fullName(m), m));
  sel.value = 60;
  const btn = document.createElement('button');
  btn.className = 'ghost';
  btn.textContent = t(droneActive() ? 'ref.stopDrone' : 'ref.holdDrone');
  const hz = document.createElement('span');
  hz.className = 'hint';
  const upd = () => (hz.textContent = freqOf(+sel.value).toFixed(2) + ' Hz');
  sel.onchange = () => {
    upd();
    if (droneActive()) droneOn(+sel.value);
  };
  btn.onclick = () => {
    if (droneActive()) {
      droneOff();
      btn.textContent = t('ref.holdDrone');
    } else {
      droneOn(+sel.value);
      btn.textContent = t('ref.stopDrone');
    }
  };
  upd();
  row.append(sel, btn, hz);
}
