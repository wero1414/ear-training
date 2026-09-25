import { S } from '../state/store.js';
import { ALL12 } from '../theory/pitch.js';
import {
  DEGREE_NUMERALS_BY_SEMITONE,
  DEGREE_SOLFEGE_BY_SEMITONE,
  degreeToSemitone,
  drillScale,
} from '../theory/scales.js';
import { degLabel, degText, fullName, nn } from '../labels.js';
import { keyContext, playNote } from '../audio/instruments.js';
import { gridUI } from '../ui/grid.js';
import { guard, keyFor, weighted } from './adaptive.js';
import { judge } from './trial.js';

export const prompt = 'Which scale degree?';

// The answer is a degree index into the drill scale (a semitone in chromatic mode).
// Stats are keyed by semitone above the tonic, so the same function is one item across
// major, minor and chromatic drills.
// 30% of targets are an octave up: the skill is function, not register.
export function make(trial, sp) {
  const K = keyFor(sp);
  const degs = sp.chrom ? ALL12 : sp.degrees;
  const scale = drillScale(sp, K.minor);
  let d,
    g = 0;
  do d = weighted(degs, 'degree', x => degreeToSemitone(x, scale));
  while (degs.length > 1 && d === guard.last && g++ < 6);
  guard.last = d;
  const semi = degreeToSemitone(d, scale);
  Object.assign(trial, { key: K, ans: d, midis: [60 + K.pc + semi + (Math.random() < 0.3 ? 12 : 0)] });
}

export function play(trial, t, d) {
  const off = keyContext(trial.key.pc, 0, trial.key.minor);
  playNote(trial.midis[0], off + 0.25, Math.max(d, 1.3), trial.timbre);
}

export const truth = t =>
  degText(t.ans, t.sp, t.key.minor) +
  '  of  ' +
  nn(t.key.pc) +
  (t.key.minor ? ' minor' : ' major') +
  '   (' +
  fullName(t.midis[0]) +
  ')';

export const statKey = t => degreeToSemitone(t.ans, drillScale(t.sp, t.key.minor));

export const statLabel = key => degLabel(+key);

export function render(host, trial, sp) {
  const degs = sp.chrom ? ALL12 : sp.degrees;
  const scale = drillScale(sp, trial.key.minor);
  const solf = S.naming === 'solf';
  gridUI(
    host,
    degs.map(d => {
      const semi = degreeToSemitone(d, scale);
      return {
        v: d,
        b: solf ? DEGREE_SOLFEGE_BY_SEMITONE[semi] : DEGREE_NUMERALS_BY_SEMITONE[semi],
        s: solf ? DEGREE_NUMERALS_BY_SEMITONE[semi] : DEGREE_SOLFEGE_BY_SEMITONE[semi],
      };
    }),
    'tight',
    v => judge({ v }),
  );
}
