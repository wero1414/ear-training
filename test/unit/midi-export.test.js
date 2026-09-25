import { describe, it, expect } from 'vitest';
import { buildMidi, vlq } from '../../js/jam/midi-export.js';

// Test-only Standard MIDI File reader: enough to check what the writer emits.
function parse(bytes) {
  let p = 0;
  const u8 = () => bytes[p++];
  const u16 = () => (u8() << 8) | u8();
  const u32 = () => ((u8() << 24) | (u8() << 16) | (u8() << 8) | u8()) >>> 0;
  const tag = () => String.fromCharCode(u8(), u8(), u8(), u8());
  const readVlq = () => {
    let v = 0,
      b;
    do {
      b = u8();
      v = (v << 7) | (b & 127);
    } while (b & 128);
    return v;
  };
  expect(tag()).toBe('MThd');
  expect(u32()).toBe(6);
  const header = { format: u16(), tracks: u16(), ppq: u16() };
  expect(tag()).toBe('MTrk');
  const end = u32() + p;
  const events = [];
  let tick = 0;
  while (p < end) {
    tick += readVlq();
    const status = u8();
    if (status === 0xff) {
      const type = u8(),
        len = readVlq();
      events.push({ tick, meta: type, data: [...bytes.slice(p, p + len)] });
      p += len;
    } else {
      events.push({ tick, on: (status & 0xf0) === 0x90, note: u8(), vel: u8() });
    }
  }
  expect(p).toBe(bytes.length);
  return { header, events };
}

const BARS = [
  { s: 0, q: 'maj' },
  { s: 7, q: 'dom7' },
];

describe('vlq', () => {
  // Examples from the Standard MIDI File 1.0 specification.
  it('encodes the spec examples', () => {
    expect(vlq(0)).toEqual([0x00]);
    expect(vlq(0x7f)).toEqual([0x7f]);
    expect(vlq(0x80)).toEqual([0x81, 0x00]);
    expect(vlq(0x2000)).toEqual([0xc0, 0x00]);
    expect(vlq(0x3fff)).toEqual([0xff, 0x7f]);
    expect(vlq(0x4000)).toEqual([0x81, 0x80, 0x00]);
  });
});

describe('buildMidi', () => {
  const { header, events } = parse(buildMidi(BARS, 2, 120));

  it('writes a single-track type-0 file at 480 PPQ', () => {
    expect(header).toEqual({ format: 0, tracks: 1, ppq: 480 });
  });

  it('starts with the tempo and ends with end-of-track', () => {
    expect(events[0]).toEqual({ tick: 0, meta: 0x51, data: [0x07, 0xa1, 0x20] }); // 500000 us = 120 bpm
    expect(events.at(-1).meta).toBe(0x2f);
  });

  it('pairs every note-on with a later note-off of the same pitch', () => {
    const open = new Map();
    for (const e of events.filter(e => e.meta === undefined)) {
      if (e.on) {
        expect(open.has(e.note)).toBe(false);
        open.set(e.note, e.tick);
      } else {
        expect(open.has(e.note)).toBe(true);
        expect(e.tick).toBeGreaterThan(open.get(e.note));
        open.delete(e.note);
      }
    }
    expect(open.size).toBe(0);
  });

  it('places each bar four beats apart, transposed to the key', () => {
    const ons = events.filter(e => e.on);
    expect(
      ons
        .filter(e => e.tick === 0)
        .map(e => e.note)
        .sort((a, b) => a - b),
    ).toEqual([38, 50, 54, 57]);
    expect(
      ons
        .filter(e => e.tick === 1920)
        .map(e => e.note)
        .sort((a, b) => a - b),
    ).toEqual([45, 57, 61, 64, 67]);
  });
});
