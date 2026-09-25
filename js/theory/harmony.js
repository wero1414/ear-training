// Roman numerals: `s` is the root's semitone offset from the tonic, `q` the chord quality.
export const ROM = [
  { r: 'I', s: 0, q: 'maj' },
  { r: 'ii', s: 2, q: 'min' },
  { r: 'iii', s: 4, q: 'min' },
  { r: 'IV', s: 5, q: 'maj' },
  { r: 'V', s: 7, q: 'maj' },
  { r: 'vi', s: 9, q: 'min' },
  { r: 'vii\u00b0', s: 11, q: 'dim' },
  { r: '\u266dVII', s: 10, q: 'maj' },
  { r: 'iv', s: 5, q: 'min' },
  { r: '\u266dVI', s: 8, q: 'maj' },
  { r: '\u266dIII', s: 3, q: 'maj' },
  // Minor-key numerals (relative to the minor tonic) and two modal colours.
  { r: 'i', s: 0, q: 'min' },
  { r: 'ii\u00b0', s: 2, q: 'dim' },
  { r: 'III', s: 3, q: 'maj' },
  { r: 'v', s: 7, q: 'min' },
  { r: 'VI', s: 8, q: 'maj' },
  { r: 'VII', s: 10, q: 'maj' },
  { r: 'II', s: 2, q: 'maj' },
  { r: '\u266dII', s: 1, q: 'maj' },
];

// Progressions are lists of ROM indices.
export const PROG_BASIC = [
  [0, 4, 5, 3],
  [0, 3, 4, 0],
  [0, 5, 3, 4],
  [5, 3, 0, 4],
  [0, 2, 3, 4],
  [0, 4, 3, 0],
  [5, 1, 4, 0],
  [0, 3, 1, 4],
];
export const PROG_25 = [
  [1, 4, 0],
  [1, 4, 0, 0],
  [0, 5, 1, 4],
  [2, 5, 1, 4],
];
// Minor key, including the Dorian (i IV) and Phrygian (i bII) vamps.
export const PROG_MINOR = [
  [11, 8, 4, 11],
  [11, 15, 13, 16],
  [11, 16, 15, 4],
  [11, 8, 16, 13],
  [11, 12, 4, 11],
  [11, 3, 11, 3],
  [11, 18, 11, 18],
];
// Major-tonic modes: Mixolydian (I bVII IV) and Lydian (I II).
export const PROG_MODAL = [
  [0, 7, 3, 0],
  [0, 17, 0, 17],
];
export const PROG_BORROW = [
  [0, 7, 3, 0],
  [0, 9, 7, 0],
  [0, 8, 0, 4],
  [0, 3, 8, 0],
  [0, 10, 7, 0],
];

// Cadences as ROM indices. Names are in the i18n tables under theory.cadence.
export const CAD = [{ s: [4, 0] }, { s: [3, 0] }, { s: [1, 4] }, { s: [4, 5] }];

// A degree has no function outside a key, so every functional drill is preceded by a
// cadence. Minor keeps a major dominant. Entries are [semitone from tonic, quality].
export const keyContextChords = minor =>
  minor
    ? [
        [0, 'min'],
        [5, 'min'],
        [7, 'maj'],
        [0, 'min'],
      ]
    : [
        [0, 'maj'],
        [5, 'maj'],
        [7, 'maj'],
        [0, 'maj'],
      ];

// Jam presets. `id` names the exported MIDI file; display names are in the i18n tables
// under jam.presets. Each chord is [semitone from key, quality, bars].
export const JAMP = [
  {
    id: 'pop-loop-i-v-vi-iv',
    q: 'maj',
    c: [
      [0, 'maj', 1],
      [7, 'maj', 1],
      [9, 'min', 1],
      [5, 'maj', 1],
    ],
  },
  {
    id: 'ii-v-i-jazz-',
    q: 'maj',
    c: [
      [2, 'min7', 1],
      [7, 'dom7', 1],
      [0, 'maj7', 2],
    ],
  },
  {
    id: '12-bar-blues',
    q: 'maj',
    c: [
      [0, 'dom7', 4],
      [5, 'dom7', 2],
      [0, 'dom7', 2],
      [7, 'dom7', 1],
      [5, 'dom7', 1],
      [0, 'dom7', 1],
      [7, 'dom7', 1],
    ],
  },
  {
    id: 'minor-loop-i-vi-iii-vii',
    q: 'min',
    c: [
      [0, 'min', 1],
      [8, 'maj', 1],
      [3, 'maj', 1],
      [10, 'maj', 1],
    ],
  },
  {
    id: 'dorian-vamp-i-iv',
    q: 'min',
    c: [
      [0, 'min7', 2],
      [5, 'dom7', 2],
    ],
  },
  {
    id: 'turnaround-i-vi-ii-v',
    q: 'maj',
    c: [
      [0, 'maj7', 1],
      [9, 'min7', 1],
      [2, 'min7', 1],
      [7, 'dom7', 1],
    ],
  },
  {
    id: 'lydian-pad-i-ii',
    q: 'maj',
    c: [
      [0, 'maj7', 2],
      [2, 'maj', 2],
    ],
  },
  {
    id: 'andalusian-i-vii-vi-v',
    q: 'min',
    c: [
      [0, 'min', 1],
      [10, 'maj', 1],
      [8, 'maj', 1],
      [7, 'maj', 1],
    ],
  },
  { id: 'modal-drone-i', q: 'min', c: [[0, 'min7', 4]] },
];
