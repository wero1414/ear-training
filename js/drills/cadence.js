import { chordMidis } from '../theory/chords.js';
import { CAD, ROM } from '../theory/harmony.js';
import { playNote, playStack } from '../audio/instruments.js';
import { gridUI } from '../ui/grid.js';
import { keyFor, weighted } from './adaptive.js';
import { judge } from './trial.js';

export const prompt = 'Which cadence?';

export function make(trial, sp) {
  const K = keyFor(sp);
  K.minor = false;
  const i = weighted([0, 1, 2, 3], 'cadence');
  Object.assign(trial, { key: K, ans: i, cad: CAD[i] });
}

export function play(trial) {
  const r = 48 + trial.key.pc;
  playStack(chordMidis(r, 'maj', 0), 0, 0.7, 'rhodes', false, 0.5);
  trial.cad.s.forEach((ri, i) => {
    const R = ROM[ri];
    playStack(chordMidis(r + R.s, R.q, 0), 1.0 + i * 0.95, 1.2, 'rhodes', false, 0.65);
    playNote(r - 12 + R.s, 1.0 + i * 0.95, 1.1, 'bass', 0.7);
  });
}

export const truth = t => CAD[t.ans].n;

export const statLabel = key => (CAD[+key] ? CAD[+key].n.split('  ')[0] : key);

export function render(host) {
  gridUI(
    host,
    CAD.map((c, i) => ({ v: i, b: c.n.split('  ')[0], s: c.n.split('  ')[1] || '' })),
    undefined,
    v => judge({ v }),
  );
}
