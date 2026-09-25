// Jam tab: preset, key and tempo controls, the bar strip, and the chord-tone keyboard.
import { S, sv } from '../state/store.js';
import { el } from '../util.js';
import { t } from '../i18n/index.js';
import { ALL12 } from '../theory/pitch.js';
import { CH } from '../theory/chords.js';
import { CHSCALE, SC } from '../theory/scales.js';
import { JAMP } from '../theory/harmony.js';
import { nn } from '../labels.js';
import { pickTimbre, playNote } from '../audio/instruments.js';
import { jam, jamBars, jamStart, jamStop } from '../jam/engine.js';
import { buildMidi } from '../jam/midi-export.js';
import { keyboard } from './keyboard.js';

// Chord tones solid, the rest of the chord's scale outlined.
export function highlightBar(i) {
  document.querySelectorAll('.bar').forEach((x, j) => x.classList.toggle('on', j === i));
  const b = jam.bars[i];
  if (!b) return;
  const scaleKey = CHSCALE[b.q] || 'ionian';
  const chordRootPc = (S.jamKey + b.s) % 12;
  const sc = SC[scaleKey].iv.map(x => (chordRootPc + x) % 12);
  const ct = CH[b.q].iv.map(x => (chordRootPc + x) % 12);
  const now = el('jamNow');
  if (now)
    now.innerHTML = t('jam.now', {
      chord: nn(chordRootPc) + CH[b.q].s,
      root: nn(chordRootPc),
      scale: t('theory.scale.' + scaleKey).name,
      notes: sc.map(p => nn(p)).join('  '),
      tones: ct.map(p => nn(p)).join(' '),
    });
  document.querySelectorAll('#jamKb .k').forEach(k => {
    const pc = +k.dataset.pc;
    k.classList.toggle('ct', ct.includes(pc));
    k.classList.toggle('sc', !ct.includes(pc) && sc.includes(pc));
  });
}

export function showJam() {
  el('setBox').hidden = true;
  const h =
    '<div class="stage"><div class="row">' +
    '<button class="play" id="jamBtn">' +
    t('jam.play') +
    '</button>' +
    '<select id="jamPreset">' +
    JAMP.map(
      (x, i) =>
        '<option value="' + i + '"' + (i === S.jamPreset ? ' selected' : '') + '>' + t('jam.presets')[i] + '</option>',
    ).join('') +
    '</select>' +
    '<select id="jamKey">' +
    ALL12.map(i => '<option value="' + i + '"' + (i === S.jamKey ? ' selected' : '') + '>' + nn(i) + '</option>').join(
      '',
    ) +
    '</select>' +
    '</div><div class="row" style="margin-top:9px">' +
    '<span class="hint">' +
    t('jam.tempo') +
    '</span><input type="range" id="jamBpm" min="50" max="180" step="1" value="' +
    S.jamBpm +
    '" style="max-width:180px">' +
    '<span class="val" id="bpmVal">' +
    t('jam.bpm', { n: S.jamBpm }) +
    '</span>' +
    '<label class="hint"><input type="checkbox" id="jamDrums"' +
    (S.jamDrums ? ' checked' : '') +
    '> ' +
    t('jam.drums') +
    '</label>' +
    '<label class="hint"><input type="checkbox" id="jamBass"' +
    (S.jamBass ? ' checked' : '') +
    '> ' +
    t('jam.bass') +
    '</label>' +
    '<button class="mini" id="jamMidi">' +
    t('jam.exportMidi') +
    '</button></div>' +
    '<div class="bars" id="jamBars"></div>' +
    '<div class="now" id="jamNow">' +
    t('jam.help') +
    '</div>' +
    '<div id="jamKb"></div></div>';
  el('view').innerHTML = h;
  jam.bars = jamBars();
  el('jamBars').innerHTML = jam.bars
    .map(b => '<div class="bar">' + nn((S.jamKey + b.s) % 12) + CH[b.q].s + '<em>' + t('jam.oneBar') + '</em></div>')
    .join('');
  keyboard(el('jamKb'), null, (pc, oc) => playNote(48 + oc * 12 + pc, 0, 1.4, pickTimbre()), { octaves: 2 });
  el('jamBtn').onclick = () => (jam.on ? jamStop() : jamStart());
  el('jamPreset').onchange = e => {
    S.jamPreset = +e.target.value;
    sv();
    const was = jam.on;
    jamStop();
    showJam();
    if (was) jamStart();
  };
  el('jamKey').onchange = e => {
    S.jamKey = +e.target.value;
    sv();
    const was = jam.on;
    jamStop();
    showJam();
    if (was) jamStart();
  };
  el('jamBpm').oninput = e => {
    S.jamBpm = +e.target.value;
    el('bpmVal').textContent = t('jam.bpm', { n: S.jamBpm });
    sv();
  };
  el('jamDrums').onchange = e => {
    S.jamDrums = e.target.checked;
    sv();
  };
  el('jamBass').onchange = e => {
    S.jamBass = e.target.checked;
    sv();
  };
  el('jamMidi').onclick = exportMidi;
}

function exportMidi() {
  const bytes = buildMidi(jamBars(), S.jamKey, S.jamBpm);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
  a.download = JAMP[S.jamPreset].id + '-' + nn(S.jamKey).replace('#', 's') + '.mid';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
