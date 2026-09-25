import { pick } from '../util.js';
import { t } from '../i18n/index.js';
import { DIA_MAJ, DIA_MIN, degreeToSemitone } from '../theory/scales.js';
import { degLabel, nn } from '../labels.js';
import { keyContext, playNote } from '../audio/instruments.js';
import { seqUI } from '../ui/sequence.js';
import { keyFor } from './adaptive.js';
import { phrase } from './phrase.js';
import { S } from '../state/store.js';
import { judge, session } from './trial.js';

// The original generator, kept until the phrase grammar leaves the Experimental panel.
function walk(len) {
  const seq = [0];
  for (let i = 1; i < len; i++) {
    const prev = seq[i - 1];
    const step = pick([-2, -1, -1, 1, 1, 2, 3, -3, 4, -4]);
    let v = Math.max(0, Math.min(6, prev + step));
    if (v === prev) v = (prev + 1) % 7;
    seq.push(v);
  }
  return seq;
}

// The answer is the list of degree indices into trial.scale, which is always diatonic:
// "Chromatic degrees" applies to the degree drill only, so labels here must not go
// through drillScale().
export function make(trial, sp) {
  const K = keyFor(sp);
  const scale = K.minor ? DIA_MIN : DIA_MAJ;
  const len = sp.melLen || 4;
  const seq = S.labMelody ? phrase(len) : walk(len);
  Object.assign(trial, { key: K, ans: seq, midis: seq.map(d => 60 + K.pc + scale[d]), scale });
}

export function play(trial) {
  const off = keyContext(trial.key.pc, 0, trial.key.minor);
  trial.midis.forEach((m, i) => playNote(m, off + 0.3 + i * 0.55, 0.8, trial.timbre));
}

export const slotLabel = (v, trial) => degLabel(degreeToSemitone(v, trial.scale));

export const truth = tr =>
  t('truth.melody', {
    seq: tr.ans.map(d => slotLabel(d, tr)).join(' '),
    key: nn(tr.key.pc) + (tr.key.minor ? t('truth.minorKeySuffix') : ''),
  });

export function render(host, trial) {
  const degs = [0, 1, 2, 3, 4, 5, 6];
  seqUI(
    host,
    degs.map(d => ({ v: d, b: slotLabel(d, trial) })),
    trial.ans.length,
    'tight',
    {
      current: () => session.trial,
      label: v => slotLabel(v, session.trial),
      submit: v => judge({ v }),
      hear: t => t.seq.forEach((d, i) => playNote(60 + t.key.pc + t.scale[d], i * 0.5, 0.7, t.timbre)),
    },
  );
}
