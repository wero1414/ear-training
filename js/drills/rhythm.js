// Rhythmic dictation (labRhythm): hear a count-in and a one-bar pattern, write it as
// one cell per beat.
import { hat, playNote } from '../audio/instruments.js';
import { seqUI } from '../ui/sequence.js';
import { CELLS, onsets, pattern } from './rhythm-core.js';
import { judge, session } from './trial.js';

export const BPM = 80;

// Four count-in clicks (the first accented), then the pattern on a short marimba note.
// Returns the offset of the pattern's downbeat from now, in seconds.
export function playPattern(cells, bpm = BPM, when = 0) {
  const spb = 60 / bpm;
  for (let i = 0; i < 4; i++) hat(when + i * spb, i ? 0.6 : 1);
  const down = when + 4 * spb;
  for (const o of onsets(cells)) playNote(84, down + o * spb, 0.12, 'marimba', 0.8);
  return down;
}

export function make(trial) {
  Object.assign(trial, { ans: pattern(2), bpm: BPM });
}

export function play(trial) {
  playPattern(trial.ans, trial.bpm);
}

export const slotLabel = v => CELLS[v].glyph;

export const truth = tr => tr.ans.map(slotLabel).join('  ');

export function render(host, trial) {
  seqUI(
    host,
    Object.keys(CELLS).map(c => ({ v: c, b: CELLS[c].glyph })),
    trial.ans.length,
    'tight',
    {
      current: () => session.trial,
      label: slotLabel,
      submit: v => judge({ v }),
      hear: t => playPattern(t.seq, t.bpm),
    },
  );
}
