import { pick, rnd } from '../util.js';
import { IVL, IVS } from '../theory/pitch.js';
import { fullName } from '../labels.js';
import { playNote } from '../audio/instruments.js';
import { gridUI } from '../ui/grid.js';
import { guard, weighted } from './adaptive.js';
import { judge } from './trial.js';

export const prompt = 'Which interval?';

export function make(trial, sp, lo, hi) {
  const list = sp.ivls;
  let size,
    g = 0;
  do size = weighted(list, 'interval');
  while (list.length > 1 && size === guard.last && g++ < 8);
  guard.last = size;
  const dir = sp.dir === 'random' ? pick(['asc', 'desc', 'harm']) : sp.dir;
  const root = lo + rnd(Math.max(1, hi - lo - size + 1));
  Object.assign(trial, { midis: dir === 'desc' ? [root + size, root] : [root, root + size], ans: size, dir });
}

export function play(trial, t, d) {
  if (trial.dir === 'harm') {
    playNote(trial.midis[0], t, d * 1.35, trial.timbre, 0.85);
    playNote(trial.midis[1], t, d * 1.35, trial.timbre, 0.85);
  } else {
    playNote(trial.midis[0], t, d, trial.timbre);
    playNote(trial.midis[1], t + d * 0.6, d, trial.timbre);
  }
}

export const truth = t => IVL[t.ans] + '   ' + fullName(t.midis[0]) + ' \u2192 ' + fullName(t.midis[1]);

export const statLabel = key => IVS[+key];

export function render(host, trial, sp) {
  gridUI(
    host,
    sp.ivls.map(i => ({ v: i, b: IVS[i], s: IVL[i] })),
    undefined,
    v => judge({ v }),
  );
}
