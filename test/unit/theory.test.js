import { describe, it, expect } from 'vitest';
import { midiToFreq, noteName, pcName, pitchClass } from '../../js/theory/pitch.js';
import { chordMidis } from '../../js/theory/chords.js';
import { DIA_MAJ, DIA_MIN, degreeLabel, degreeToSemitone, drillScale } from '../../js/theory/scales.js';
import { keyContextChords } from '../../js/theory/harmony.js';

describe('pitch', () => {
  it('wraps negative and large values into 0-11', () => {
    expect(pitchClass(-3)).toBe(9);
    expect(pitchClass(-12)).toBe(0);
    expect(pitchClass(14)).toBe(2);
  });

  it('names MIDI 60 as C4 and uses Si in fixed-do', () => {
    expect(noteName(60, 'sharp')).toBe('C4');
    expect(noteName(70, 'flat')).toBe('Bb4');
    expect(pcName(11, 'solf')).toBe('Si');
  });

  it('tunes to the configured A4', () => {
    expect(midiToFreq(69, 440)).toBe(440);
    expect(midiToFreq(69, 432)).toBe(432);
    expect(midiToFreq(81, 440)).toBeCloseTo(880, 9);
    expect(midiToFreq(60, 440)).toBeCloseTo(261.6256, 4);
  });
});

describe('chords', () => {
  it('inverts by moving the lowest tones up an octave', () => {
    expect(chordMidis(60, 'maj', 0)).toEqual([60, 64, 67]);
    expect(chordMidis(60, 'maj', 1)).toEqual([64, 67, 72]);
    expect(chordMidis(60, 'dom7', 3)).toEqual([70, 72, 76, 79]);
  });
});

describe('degrees', () => {
  // The shipped bug: a degree index used as a semitone labels the second degree flat-2.
  it('labels degree index 1 of a major scale as 2, not flat-2', () => {
    expect(degreeToSemitone(1, DIA_MAJ)).toBe(2);
    expect(degreeLabel(degreeToSemitone(1, DIA_MAJ), 'sharp')).toBe('2');
    expect(degreeLabel(degreeToSemitone(1, DIA_MAJ), 'solf')).toBe('Re');
  });

  it('labels the minor third as flat-3', () => {
    expect(degreeLabel(degreeToSemitone(2, DIA_MIN), 'sharp')).toBe('\u266d3');
    expect(degreeLabel(degreeToSemitone(2, DIA_MIN), 'solf')).toBe('Me');
  });

  it('treats chromatic-mode answers as semitones', () => {
    const scale = drillScale({ chrom: true }, false);
    for (let s = 0; s < 12; s++) expect(degreeToSemitone(s, scale)).toBe(s);
    expect(drillScale({ chrom: false }, true)).toBe(DIA_MIN);
    expect(drillScale(undefined, false)).toBe(DIA_MAJ);
  });
});

describe('harmony', () => {
  it('uses a major dominant for the minor key context', () => {
    expect(keyContextChords(true)).toEqual([
      [0, 'min'],
      [5, 'min'],
      [7, 'maj'],
      [0, 'min'],
    ]);
    expect(keyContextChords(false).map(c => c[1])).toEqual(['maj', 'maj', 'maj', 'maj']);
  });
});
