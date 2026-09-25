// Theory naming bound to the user's current naming setting.
import { S } from './state/store.js';
import { pcName, noteName } from './theory/pitch.js';
import { CH } from './theory/chords.js';
import { degreeLabel, degreeToSemitone, drillScale } from './theory/scales.js';

export const nn = pc => pcName(pc, S.naming);
export const fullName = m => noteName(m, S.naming);
export const degLabel = semitone => degreeLabel(semitone, S.degNaming);
export const degText = (d, sp, minor) => degLabel(degreeToSemitone(d, drillScale(sp, minor)));
export const chordName = (root, q) => nn(root % 12) + CH[q].s;
