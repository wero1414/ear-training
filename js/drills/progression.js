import { pick } from '../util.js';
import { t } from '../i18n/index.js';
import { chordMidis } from '../theory/chords.js';
import { ROM } from '../theory/harmony.js';
import { nn } from '../labels.js';
import { playNote, playStack } from '../audio/instruments.js';
import { seqUI } from '../ui/sequence.js';
import { keyFor } from './adaptive.js';
import { judge, session } from './trial.js';

// Progressions are major-key only; the answer is a list of ROM indices.
export function make(trial, sp) {
  const K = keyFor(sp);
  K.minor = false;
  const prog = pick(sp.progs);
  Object.assign(trial, { key: K, ans: prog.slice(), prog });
}

// Tonic chord, a gap, then the progression with alternating inversions over a root bass.
export function play(trial) {
  const r = 48 + trial.key.pc;
  playStack(chordMidis(r, 'maj', 0), 0, 0.7, 'rhodes', false, 0.5);
  trial.prog.forEach((ri, i) => {
    const R = ROM[ri];
    playStack(chordMidis(r + R.s, R.q, i % 2 ? 1 : 0), 1.1 + i * 0.95, 1.1, 'rhodes', false, 0.62);
    playNote(r - 12 + R.s, 1.1 + i * 0.95, 1.0, 'bass', 0.7);
  });
}

export const truth = tr => t('truth.prog', { seq: tr.ans.map(i => ROM[i].r).join(' \u2013 '), key: nn(tr.key.pc) });

export const slotLabel = v => ROM[v].r;

export function render(host, trial) {
  const opts = [...new Set([].concat(...trial.sp.progs))].sort((a, b) => a - b);
  seqUI(
    host,
    opts.map(i => ({ v: i, b: ROM[i].r })),
    trial.ans.length,
    'tight',
    {
      current: () => session.trial,
      label: slotLabel,
      submit: v => judge({ v }),
      hear: t => {
        const r = 48 + t.key.pc;
        t.seq.forEach((ri, i) =>
          playStack(chordMidis(r + ROM[ri].s, ROM[ri].q, 0), i * 0.85, 1.0, 'rhodes', false, 0.6),
        );
      },
    },
  );
}
