export const NAMES = {
  sharp: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  flat: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
  solf: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
};
export const IVL = [
  'unison',
  'minor 2nd',
  'major 2nd',
  'minor 3rd',
  'major 3rd',
  'perfect 4th',
  'tritone',
  'perfect 5th',
  'minor 6th',
  'major 6th',
  'minor 7th',
  'major 7th',
  'octave',
];
export const IVS = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
export const WHITE = [0, 2, 4, 5, 7, 9, 11];
export const BLACK = [1, 3, 6, 8, 10];
export const ALL12 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const ALLIVL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const pitchClass = x => ((x % 12) + 12) % 12;
export const pcName = (pc, naming) => NAMES[naming][pitchClass(pc)];
export const noteName = (midi, naming) => pcName(midi % 12, naming) + (Math.floor(midi / 12) - 1);
export const midiToFreq = (midi, a4) => a4 * Math.pow(2, (midi - 69) / 12);
