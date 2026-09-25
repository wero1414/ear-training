// Type-0 Standard MIDI File writer for the jam loop: one track, tempo meta event, block
// chords held for 3.5 beats over a two-note root bass per bar.
import { chordMidis } from '../theory/chords.js';

const PPQ = 480;

// Variable-length quantity: 7 bits per byte, high bit set on all but the last.
export function vlq(n) {
  const b = [n & 127];
  n >>= 7;
  while (n) {
    b.unshift((n & 127) | 128);
    n >>= 7;
  }
  return b;
}

// bars: [{s: semitone from key, q: chord quality}], key: pitch class, bpm: tempo.
export function buildMidi(bars, key, bpm) {
  const ev = [];
  bars.forEach((b, i) => {
    const t = i * PPQ * 4;
    const root = 36 + ((key + b.s) % 12);
    const mids = chordMidis(48 + ((key + b.s) % 12), b.q, 0);
    mids.forEach(m => {
      ev.push({ t, on: 1, n: m, v: 78 });
      ev.push({ t: t + PPQ * 3.5, on: 0, n: m, v: 0 });
    });
    ev.push({ t, on: 1, n: root, v: 96 });
    ev.push({ t: t + PPQ * 1.9, on: 0, n: root, v: 0 });
    ev.push({ t: t + PPQ * 2, on: 1, n: root, v: 88 });
    ev.push({ t: t + PPQ * 3.6, on: 0, n: root, v: 0 });
  });
  // Note-offs sort before note-ons at the same tick so repeated notes retrigger.
  ev.sort((a, b) => a.t - b.t || a.on - b.on);
  const trk = [];
  const usec = Math.round(6e7 / bpm);
  trk.push(0, 0xff, 0x51, 3, (usec >> 16) & 255, (usec >> 8) & 255, usec & 255);
  let last = 0;
  ev.forEach(e => {
    const d = Math.round(e.t - last);
    last = e.t;
    trk.push(...vlq(d), e.on ? 0x90 : 0x80, e.n & 127, e.v & 127);
  });
  trk.push(0, 0xff, 0x2f, 0);
  const hdr = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (PPQ >> 8) & 255, PPQ & 255];
  const len = trk.length;
  return new Uint8Array([
    ...hdr,
    0x4d,
    0x54,
    0x72,
    0x6b,
    (len >> 24) & 255,
    (len >> 16) & 255,
    (len >> 8) & 255,
    len & 255,
    ...trk,
  ]);
}
