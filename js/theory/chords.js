// Intervals in semitones from the root. `s` is the chord symbol suffix (notation, not
// translated); display names are in the i18n tables under theory.chord.
export const CH = {
  maj: { iv: [0, 4, 7], s: 'maj' },
  min: { iv: [0, 3, 7], s: 'min' },
  dim: { iv: [0, 3, 6], s: 'dim' },
  aug: { iv: [0, 4, 8], s: 'aug' },
  sus4: { iv: [0, 5, 7], s: 'sus4' },
  sus2: { iv: [0, 2, 7], s: 'sus2' },
  maj7: { iv: [0, 4, 7, 11], s: 'maj7' },
  dom7: { iv: [0, 4, 7, 10], s: '7' },
  min7: { iv: [0, 3, 7, 10], s: 'm7' },
  m7b5: { iv: [0, 3, 6, 10], s: 'm7\u266d5' },
  dim7: { iv: [0, 3, 6, 9], s: '\u00b07' },
  mMaj7: { iv: [0, 3, 7, 11], s: 'mMaj7' },
  maj6: { iv: [0, 4, 7, 9], s: '6' },
  min6: { iv: [0, 3, 7, 9], s: 'm6' },
  dom9: { iv: [0, 4, 7, 10, 14], s: '9' },
  maj9: { iv: [0, 4, 7, 11, 14], s: 'maj9' },
  min9: { iv: [0, 3, 7, 10, 14], s: 'm9' },
  d7b9: { iv: [0, 4, 7, 10, 13], s: '7\u266d9' },
};

// Inversion n moves the lowest n chord tones up an octave.
export function chordMidis(root, q, inv) {
  const iv = CH[q].iv.slice();
  for (let i = 0; i < (inv || 0); i++) iv.push(iv.shift() + 12);
  return iv.map(x => root + x);
}
