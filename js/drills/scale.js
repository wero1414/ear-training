import { rnd } from '../util.js';
import { SC } from '../theory/scales.js';
import { nn } from '../labels.js';
import { playNote } from '../audio/instruments.js';
import { gridUI } from '../ui/grid.js';
import { weighted } from './adaptive.js';
import { judge } from './trial.js';

export const prompt = 'Which scale?';

export function make(trial, sp, lo, hi) {
  const m = weighted(sp.scales, 'scale');
  const root = lo + rnd(Math.max(1, hi - lo - 12));
  Object.assign(trial, { ans: m, root, midis: [root] });
}

export function play(trial) {
  const iv = SC[trial.ans].iv;
  [...iv, 12].forEach((x, i) => playNote(trial.root + x, i * 0.27, 0.5, trial.timbre));
}

export const truth = t => nn(t.root % 12) + ' ' + SC[t.ans].n;

export const statLabel = key => (SC[key] ? SC[key].n.split(' ')[0] : key);

export function render(host, trial, sp) {
  gridUI(
    host,
    sp.scales.map(m => ({ v: m, b: SC[m].n.split(' ')[0], s: SC[m].n })),
    undefined,
    v => judge({ v }),
  );
}
