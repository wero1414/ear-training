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
export const PROG_BORROW = [
  [0, 7, 3, 0],
  [0, 9, 7, 0],
  [0, 8, 0, 4],
  [0, 3, 8, 0],
  [0, 10, 7, 0],
];

export const CAD = [
  { n: 'authentic  V\u2013I', s: [4, 0] },
  { n: 'plagal  IV\u2013I', s: [3, 0] },
  { n: 'half  \u2026\u2013V', s: [1, 4] },
  { n: 'deceptive  V\u2013vi', s: [4, 5] },
];

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

// Jam presets. Each chord is [semitone from key, quality, bars].
export const JAMP = [
  {
    n: 'Pop loop  I V vi IV',
    q: 'maj',
    c: [
      [0, 'maj', 1],
      [7, 'maj', 1],
      [9, 'min', 1],
      [5, 'maj', 1],
    ],
  },
  {
    n: 'ii V I  (jazz)',
    q: 'maj',
    c: [
      [2, 'min7', 1],
      [7, 'dom7', 1],
      [0, 'maj7', 2],
    ],
  },
  {
    n: '12-bar blues',
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
    n: 'Minor loop  i \u266dVI \u266dIII \u266dVII',
    q: 'min',
    c: [
      [0, 'min', 1],
      [8, 'maj', 1],
      [3, 'maj', 1],
      [10, 'maj', 1],
    ],
  },
  {
    n: 'Dorian vamp  i IV',
    q: 'min',
    c: [
      [0, 'min7', 2],
      [5, 'dom7', 2],
    ],
  },
  {
    n: 'Turnaround  I vi ii V',
    q: 'maj',
    c: [
      [0, 'maj7', 1],
      [9, 'min7', 1],
      [2, 'min7', 1],
      [7, 'dom7', 1],
    ],
  },
  {
    n: 'Lydian pad  I II',
    q: 'maj',
    c: [
      [0, 'maj7', 2],
      [2, 'maj', 2],
    ],
  },
  {
    n: 'Andalusian  i \u266dVII \u266dVI V',
    q: 'min',
    c: [
      [0, 'min', 1],
      [10, 'maj', 1],
      [8, 'maj', 1],
      [7, 'maj', 1],
    ],
  },
  { n: 'Modal drone  i', q: 'min', c: [[0, 'min7', 4]] },
];
