import { ALL12 } from './pitch.js';

// Scale intervals from the root. Display names are in the i18n tables under theory.scale.
export const SC = {
  ionian: { iv: [0, 2, 4, 5, 7, 9, 11] },
  aeolian: { iv: [0, 2, 3, 5, 7, 8, 10] },
  dorian: { iv: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { iv: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { iv: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { iv: [0, 2, 4, 5, 7, 9, 10] },
  locrian: { iv: [0, 1, 3, 5, 6, 8, 10] },
  harmMinor: { iv: [0, 2, 3, 5, 7, 8, 11] },
  melMinor: { iv: [0, 2, 3, 5, 7, 9, 11] },
  majPent: { iv: [0, 2, 4, 7, 9] },
  minPent: { iv: [0, 3, 5, 7, 10] },
  blues: { iv: [0, 3, 5, 6, 7, 10] },
  wholeTone: { iv: [0, 2, 4, 6, 8, 10] },
  halfWhole: { iv: [0, 1, 3, 4, 6, 7, 9, 10] },
};
export const DIA_MAJ = [0, 2, 4, 5, 7, 9, 11];
export const DIA_MIN = [0, 2, 3, 5, 7, 8, 10];

// Chord quality -> scale shown over it in the jam view.
export const CHSCALE = {
  maj: 'ionian',
  maj7: 'ionian',
  maj9: 'ionian',
  maj6: 'ionian',
  min: 'dorian',
  min7: 'dorian',
  min9: 'dorian',
  min6: 'dorian',
  mMaj7: 'melMinor',
  dom7: 'mixolydian',
  dom9: 'mixolydian',
  d7b9: 'halfWhole',
  sus4: 'mixolydian',
  sus2: 'ionian',
  dim: 'halfWhole',
  dim7: 'halfWhole',
  m7b5: 'locrian',
  aug: 'wholeTone',
};

// Degree labels, indexed by SEMITONE above the tonic (0-11), never by degree index
// (0-6, position in the scale). Indexing by degree index prints the flat-2 label where
// "2" belongs; that bug has shipped once. Convert with degreeToSemitone().
export const DEGREE_NUMERALS_BY_SEMITONE = [
  '1',
  '\u266d2',
  '2',
  '\u266d3',
  '3',
  '4',
  '\u266f4',
  '5',
  '\u266d6',
  '6',
  '\u266d7',
  '7',
];
export const DEGREE_SOLFEGE_BY_SEMITONE = ['Do', 'Ra', 'Re', 'Me', 'Mi', 'Fa', 'Fi', 'Sol', 'Le', 'La', 'Te', 'Ti'];

export const degreeToSemitone = (degree, scale) => scale[degree];

// The scale a degree drill's answers index into. In chromatic mode the answers are
// already semitones, and ALL12 is the identity mapping.
export const drillScale = (sp, minor) => (sp && sp.chrom ? ALL12 : minor ? DIA_MIN : DIA_MAJ);

export const degreeLabel = (semitone, naming) =>
  naming === 'solf' ? DEGREE_SOLFEGE_BY_SEMITONE[semitone] : DEGREE_NUMERALS_BY_SEMITONE[semitone];
