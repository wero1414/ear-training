import { rnd } from '../util.js';
import { t } from '../i18n/index.js';
import { SC } from '../theory/scales.js';
import { nn } from '../labels.js';
import { playNote } from '../audio/instruments.js';
import { gridUI } from '../ui/grid.js';
import { weighted } from './adaptive.js';
import { judge } from './trial.js';

export function make(trial, sp, lo, hi) {
  const m = weighted(sp.scales, 'scale');
  const root = lo + rnd(Math.max(1, hi - lo - 12));
  Object.assign(trial, { ans: m, root, midis: [root] });
}

export function play(trial) {
  const iv = SC[trial.ans].iv;
  [...iv, 12].forEach((x, i) => playNote(trial.root + x, i * 0.27, 0.5, trial.timbre));
}

const name = m => t('theory.scale.' + m);

export const truth = tr => t('truth.scale', { root: nn(tr.root % 12), name: name(tr.ans).name });

export const statLabel = key => (SC[key] ? name(key).short : key);

export function render(host, trial, sp) {
  gridUI(
    host,
    sp.scales.map(m => ({ v: m, b: name(m).short, s: name(m).name })),
    undefined,
    v => judge({ v }),
  );
}
