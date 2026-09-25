import { pick, rnd } from '../util.js';
import { CH, chordMidis } from '../theory/chords.js';
import { t } from '../i18n/index.js';
import { chordName } from '../labels.js';
import { playStack } from '../audio/instruments.js';
import { gridUI } from '../ui/grid.js';
import { weighted } from './adaptive.js';
import { judge } from './trial.js';

export function make(trial, sp, lo, hi) {
  const q = weighted(sp.chords, 'chord');
  const root = lo + rnd(Math.max(1, hi - lo - 16));
  const inv = sp.invs && sp.invs.length ? pick(sp.invs.filter(i => i < CH[q].iv.length)) : 0;
  Object.assign(trial, { midis: chordMidis(root, q, inv), ans: q, root, inv });
}

export function play(trial, t, d) {
  playStack(trial.midis, t, Math.max(d, 1.6), trial.timbre, trial.arp);
}

export const truth = tr =>
  t(tr.inv ? 'truth.chordInv' : 'truth.chord', {
    symbol: chordName(tr.root, tr.ans),
    name: t('theory.chord.' + tr.ans),
    inv: t('theory.inversion')[tr.inv],
  });

export const statLabel = key => (CH[key] ? CH[key].s : key);

export function render(host, trial, sp) {
  gridUI(
    host,
    sp.chords.map(q => ({ v: q, b: CH[q].s, s: t('theory.chord.' + q) })),
    undefined,
    v => judge({ v }),
  );
}
