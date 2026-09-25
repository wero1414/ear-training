import { pick, rnd } from '../util.js';
import { CH, INVN, chordMidis } from '../theory/chords.js';
import { chordName } from '../labels.js';
import { gridUI } from '../ui/grid.js';
import { weighted } from './adaptive.js';
import { judge } from './trial.js';

export { play } from './chord.js';

export const prompt = 'Which inversion?';

export function make(trial, sp, lo, hi) {
  const q = pick(sp.chords);
  const invs = sp.invs.filter(i => i < CH[q].iv.length);
  const inv = weighted(invs, 'inv');
  const root = lo + rnd(Math.max(1, hi - lo - 16));
  Object.assign(trial, { midis: chordMidis(root, q, inv), ans: inv, root, q });
}

export const truth = t => INVN[t.ans] + '   ' + chordName(t.root, t.q);

export const statLabel = key => INVN[+key].replace(' position', '').replace(' inversion', '');

export function render(host, trial, sp) {
  gridUI(
    host,
    sp.invs.filter(i => i < 4).map(i => ({ v: i, b: ['root', '1st', '2nd', '3rd'][i], s: 'inversion' })),
    undefined,
    v => judge({ v }),
  );
}
