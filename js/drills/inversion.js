import { pick, rnd } from '../util.js';
import { CH, chordMidis } from '../theory/chords.js';
import { t } from '../i18n/index.js';
import { chordName } from '../labels.js';
import { gridUI } from '../ui/grid.js';
import { weighted } from './adaptive.js';
import { judge } from './trial.js';

export { play } from './chord.js';

export function make(trial, sp, lo, hi) {
  const q = pick(sp.chords);
  const invs = sp.invs.filter(i => i < CH[q].iv.length);
  const inv = weighted(invs, 'inv');
  const root = lo + rnd(Math.max(1, hi - lo - 16));
  Object.assign(trial, { midis: chordMidis(root, q, inv), ans: inv, root, q });
}

export const truth = tr => t('truth.inv', { inv: t('theory.inversion')[tr.ans], symbol: chordName(tr.root, tr.q) });

export const statLabel = key => t('theory.inversionShort')[+key];

export function render(host, trial, sp) {
  gridUI(
    host,
    sp.invs.filter(i => i < 4).map(i => ({ v: i, b: t('theory.inversionShort')[i], s: t('theory.inversionWord') })),
    undefined,
    v => judge({ v }),
  );
}
