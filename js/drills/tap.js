// Tap-back (labRhythm): hear a one-bar pattern, then tap it back after a count-in.
// Tap times are read from the audio clock, and grading removes the average offset
// (latency) before checking each tap (rhythm-core.gradeTaps).
import { t } from '../i18n/index.js';
import { el } from '../util.js';
import { ac } from '../audio/context.js';
import { hat } from '../audio/instruments.js';
import { atAudioTime } from '../audio/scheduler.js';
import { CELLS, gradeTaps, onsets, pattern } from './rhythm-core.js';
import { BPM, playPattern } from './rhythm.js';
import { judge, session } from './trial.js';

export function make(trial) {
  Object.assign(trial, { ans: pattern(2), bpm: BPM });
}

export function play(trial) {
  playPattern(trial.ans, trial.bpm);
}

const expectedSec = trial => onsets(trial.ans).map(o => (o * 60) / trial.bpm);

export function grade(trial, given) {
  trial.tapResult = gradeTaps(expectedSec(trial), given.taps);
  trial.tapCount = given.taps.length;
  return trial.tapResult.ok;
}

export const truth = tr => {
  const glyphs = tr.ans.map(c => CELLS[c].glyph).join('  ');
  const r = tr.tapResult;
  if (!r) return glyphs;
  if (r.offsetMs === null) return glyphs + '   ' + t('rhythm.count', { got: tr.tapCount, want: onsets(tr.ans).length });
  return glyphs + '   ' + t('rhythm.result', { ms: r.worstMs });
};

export function render(host, trial) {
  host.innerHTML =
    '<div class="row" style="margin-top:12px"><button class="ghost" id="tapStart">' +
    t('rhythm.start') +
    '</button></div><button class="tappad" id="tapPad" disabled>' +
    t('rhythm.pad') +
    '</button><div class="hint" id="tapInfo"></div>';
  el('tapStart').onclick = () => record(trial);
}

// Count-in, then collect taps until half a beat after the bar; grading happens then.
function record(trial) {
  if (session.trial !== trial || trial.done) return;
  const spb = 60 / trial.bpm,
    down = ac.currentTime + 0.1 + 4 * spb,
    taps = [];
  for (let i = 0; i < 4; i++) hat(0.1 + i * spb, i ? 0.6 : 1);
  el('tapStart').disabled = true;
  el('tapInfo').textContent = t('rhythm.countIn');
  const pad = el('tapPad');
  pad.disabled = false;
  pad.onpointerdown = () => taps.push(ac.currentTime - down);
  atAudioTime(down + 4 * spb + spb / 2, () => {
    pad.disabled = true;
    pad.onpointerdown = null;
    if (session.trial === trial && !trial.done) judge({ taps });
  });
}
