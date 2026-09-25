// Intervals in semitones from the root. `s` is the chord symbol suffix, `n` the name.
export const CH = {
  maj: { iv: [0, 4, 7], s: 'maj', n: 'major' },
  min: { iv: [0, 3, 7], s: 'min', n: 'minor' },
  dim: { iv: [0, 3, 6], s: 'dim', n: 'diminished' },
  aug: { iv: [0, 4, 8], s: 'aug', n: 'augmented' },
  sus4: { iv: [0, 5, 7], s: 'sus4', n: 'suspended 4' },
  sus2: { iv: [0, 2, 7], s: 'sus2', n: 'suspended 2' },
  maj7: { iv: [0, 4, 7, 11], s: 'maj7', n: 'major 7' },
  dom7: { iv: [0, 4, 7, 10], s: '7', n: 'dominant 7' },
  min7: { iv: [0, 3, 7, 10], s: 'm7', n: 'minor 7' },
  m7b5: { iv: [0, 3, 6, 10], s: 'm7\u266d5', n: 'half-diminished' },
  dim7: { iv: [0, 3, 6, 9], s: '\u00b07', n: 'diminished 7' },
  mMaj7: { iv: [0, 3, 7, 11], s: 'mMaj7', n: 'minor-major 7' },
  maj6: { iv: [0, 4, 7, 9], s: '6', n: 'major 6' },
  min6: { iv: [0, 3, 7, 9], s: 'm6', n: 'minor 6' },
  dom9: { iv: [0, 4, 7, 10, 14], s: '9', n: 'dominant 9' },
  maj9: { iv: [0, 4, 7, 11, 14], s: 'maj9', n: 'major 9' },
  min9: { iv: [0, 3, 7, 10, 14], s: 'm9', n: 'minor 9' },
  d7b9: { iv: [0, 4, 7, 10, 13], s: '7\u266d9', n: 'dominant 7\u266d9' },
};
export const INVN = ['root position', '1st inversion', '2nd inversion', '3rd inversion'];

// Inversion n moves the lowest n chord tones up an octave.
export function chordMidis(root, q, inv) {
  const iv = CH[q].iv.slice();
  for (let i = 0; i < (inv || 0); i++) iv.push(iv.shift() + 12);
  return iv.map(x => root + x);
}
