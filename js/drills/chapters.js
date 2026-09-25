import { WHITE, ALL12, ALLIVL } from '../theory/pitch.js';
import { SC } from '../theory/scales.js';
import { PROG_25, PROG_BASIC, PROG_BORROW } from '../theory/harmony.js';

// The stage ladder. k: drill kinds, n: questions per run, limit: seconds per answer.
// Titles are in the i18n tables under chapters[c].title and chapters[c].stages[s].
export const CHAPTERS = [
  {
    st: [
      { k: ['note'], pcs: [0, 6], oct: [4, 4], n: 12 },
      { k: ['note'], pcs: [0, 4, 8], oct: [4, 4], n: 14 },
      { k: ['note'], pcs: [0, 3, 6, 9], oct: [4, 4], n: 16 },
      { k: ['note'], pcs: WHITE, oct: [4, 4], n: 18 },
      { k: ['note'], pcs: ALL12, oct: [4, 4], n: 20, limit: 12 },
      { k: ['note'], pcs: ALL12, oct: [3, 5], n: 20, limit: 10 },
      { k: ['note'], pcs: ALL12, oct: [2, 6], n: 20, limit: 9, timbre: 'mixed' },
      { k: ['note'], pcs: ALL12, oct: [3, 5], reqOct: true, n: 18, limit: 12 },
    ],
  },
  {
    st: [
      { k: ['interval'], ivls: [5, 7, 12], dir: 'asc', oct: [3, 5], n: 14 },
      { k: ['interval'], ivls: [3, 4, 8, 9], dir: 'asc', oct: [3, 5], n: 16 },
      { k: ['interval'], ivls: [1, 2, 10, 11], dir: 'asc', oct: [3, 5], n: 16 },
      { k: ['interval'], ivls: ALLIVL, dir: 'asc', oct: [3, 5], n: 20, limit: 10 },
      { k: ['interval'], ivls: ALLIVL, dir: 'random', oct: [3, 5], n: 20, limit: 10 },
      { k: ['interval'], ivls: ALLIVL, dir: 'harm', oct: [3, 5], n: 18, limit: 10 },
    ],
  },
  {
    st: [
      { k: ['chord'], chords: ['maj', 'min'], oct: [3, 4], n: 14 },
      { k: ['chord'], chords: ['maj', 'min', 'dim', 'aug'], oct: [3, 4], n: 16 },
      { k: ['chord'], chords: ['maj', 'min', 'sus4', 'sus2'], oct: [3, 4], n: 16 },
      { k: ['inv'], chords: ['maj', 'min'], invs: [0, 1, 2], oct: [3, 4], n: 16 },
      { k: ['chord'], chords: ['maj7', 'dom7', 'min7'], oct: [3, 4], n: 18 },
      {
        k: ['chord'],
        chords: ['maj7', 'dom7', 'min7', 'm7b5', 'dim7', 'mMaj7', 'min6'],
        oct: [3, 4],
        n: 20,
        limit: 12,
      },
      { k: ['chord'], chords: ['dom7', 'dom9', 'maj7', 'maj9', 'min7', 'min9', 'd7b9'], oct: [3, 4], n: 20, limit: 12 },
      { k: ['inv'], chords: ['dom7', 'maj7', 'min7'], invs: [0, 1, 2, 3], oct: [3, 4], n: 20, limit: 12 },
      {
        k: ['chord'],
        chords: ['maj', 'min', 'dim', 'aug', 'maj7', 'dom7', 'min7', 'm7b5'],
        arp: 1,
        oct: [3, 4],
        n: 20,
        limit: 10,
      },
    ],
  },
  {
    st: [
      { k: ['degree'], degrees: [0, 2, 4], n: 14 },
      { k: ['degree'], degrees: [0, 1, 2, 4, 5], n: 16 },
      { k: ['degree'], degrees: [0, 1, 2, 3, 4, 5, 6], n: 20, limit: 10 },
      { k: ['degree'], degrees: [0, 1, 2, 3, 4, 5, 6], keyMode: 'random', n: 20, limit: 10 },
      { k: ['degree'], degrees: [0, 1, 2, 3, 4, 5, 6], keyQual: 'min', keyMode: 'random', n: 20, limit: 10 },
      { k: ['cadence'], n: 14 },
      { k: ['prog'], progs: PROG_25, n: 12, limit: 0 },
      { k: ['prog'], progs: PROG_BASIC, n: 12 },
      { k: ['prog'], progs: PROG_BORROW, n: 12 },
      { k: ['melody'], melLen: 3, n: 12 },
      { k: ['melody'], melLen: 5, n: 12 },
      { k: ['melody'], melLen: 5, keyMode: 'random', n: 12 },
    ],
  },
  {
    st: [
      { k: ['scale'], scales: ['ionian', 'aeolian'], n: 12 },
      { k: ['scale'], scales: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian'], n: 18, limit: 12 },
      { k: ['scale'], scales: ['majPent', 'minPent', 'blues', 'ionian'], n: 14 },
      { k: ['scale'], scales: ['aeolian', 'harmMinor', 'melMinor', 'dorian'], n: 16, limit: 12 },
      { k: ['scale'], scales: Object.keys(SC), n: 20, limit: 14 },
    ],
  },
  {
    st: [
      { k: ['note', 'interval'], pcs: ALL12, ivls: ALLIVL, dir: 'random', oct: [3, 5], n: 24, limit: 9 },
      {
        k: ['chord', 'degree'],
        chords: ['maj', 'min', 'dim', 'maj7', 'dom7', 'min7'],
        degrees: [0, 1, 2, 3, 4, 5, 6],
        n: 24,
        limit: 12,
      },
      {
        k: ['note', 'interval', 'chord', 'degree', 'scale'],
        pcs: ALL12,
        ivls: ALLIVL,
        dir: 'random',
        chords: ['maj', 'min', 'maj7', 'dom7', 'min7', 'm7b5'],
        degrees: [0, 1, 2, 3, 4, 5, 6],
        scales: ['ionian', 'dorian', 'mixolydian', 'aeolian'],
        oct: [3, 5],
        n: 30,
        limit: 12,
        timbre: 'mixed',
      },
    ],
  },
];
