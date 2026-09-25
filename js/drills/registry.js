// Drill kind -> module. Each kind exports:
//   make(trial, sp, lo, hi)    fills in the answer and what to play (lo/hi: MIDI range)
//   play(trial, t, d)          t: start offset after the masking noise, d: note length
//   render(host, trial, sp)    builds the answer widget
//   truth(trial)               the reveal text after grading
// and optionally grade(trial, given), statKey(trial), statLabel(key), slotLabel(value, trial).
import { eq } from '../util.js';
import * as note from './note.js';
import * as interval from './interval.js';
import * as chord from './chord.js';
import * as inversion from './inversion.js';
import * as degree from './degree.js';
import * as melody from './melody.js';
import * as progression from './progression.js';
import * as cadence from './cadence.js';
import * as scale from './scale.js';
import * as rhythm from './rhythm.js';
import * as tap from './tap.js';

export const KINDS = {
  note,
  interval,
  chord,
  inv: inversion,
  degree,
  melody,
  prog: progression,
  cadence,
  scale,
  rhythm,
  tap,
};

// Kinds that exist only while their Experimental flag is on.
export const FLAGGED_KINDS = { rhythm: 'labRhythm', tap: 'labRhythm' };
export const kindEnabled = (k, S) => !FLAGGED_KINDS[k] || !!S[FLAGGED_KINDS[k]];

export const grade = (trial, given) =>
  KINDS[trial.kind].grade ? KINDS[trial.kind].grade(trial, given) : eq(trial.ans, given.v);

export const statKey = trial =>
  KINDS[trial.kind].statKey ? KINDS[trial.kind].statKey(trial) : Array.isArray(trial.ans) ? 'seq' : trial.ans;

export const truthOf = trial => (KINDS[trial.kind] ? KINDS[trial.kind].truth(trial) : '');

export const statLabel = (b, key) => (KINDS[b] && KINDS[b].statLabel ? KINDS[b].statLabel(key) : String(key));
