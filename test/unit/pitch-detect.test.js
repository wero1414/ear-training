import { describe, it, expect } from 'vitest';
import { yin, WINDOW, freqToMidi, createSingDetector } from '../../js/audio/pitch-detect.js';

const SR = 44100;
const cents = (a, b) => 1200 * Math.log2(a / b);

function tone(f, { harmonics = 1, sr = SR, noise = 0, seed = 1 } = {}) {
  const b = new Float32Array(WINDOW);
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < WINDOW; i++) {
    let v = 0;
    for (let h = 1; h <= harmonics; h++) v += Math.sin((2 * Math.PI * f * h * i) / sr) / h;
    b[i] = 0.3 * v + noise * rand();
  }
  return b;
}

describe('YIN', () => {
  it('finds sine pitches across the singing range within 3 cents', () => {
    for (const f of [82.41, 110, 196, 261.63, 440, 659.25, 880]) {
      const r = yin(tone(f), SR);
      expect(Math.abs(cents(r.freq, f)), `${f} Hz -> ${r.freq}`).toBeLessThan(3);
      expect(r.clarity).toBeGreaterThan(0.9);
    }
  });

  it('finds the fundamental of a harmonic-rich (voice-like) tone, not an overtone', () => {
    for (const f of [98, 146.83, 220, 392]) {
      const r = yin(tone(f, { harmonics: 8 }), SR);
      expect(Math.abs(cents(r.freq, f)), `${f} Hz -> ${r.freq}`).toBeLessThan(3);
    }
  });

  // A weak subharmonic (period doubling, common in real voices) makes the dip at twice
  // the period deeper than the true one; YIN's first-dip rule must still pick the note.
  it('is not pulled an octave down by a weak subharmonic', () => {
    const f = 220,
      b = tone(f, { harmonics: 4 });
    for (let i = 0; i < WINDOW; i++) b[i] += 0.03 * Math.sin((2 * Math.PI * (f / 2) * i) / SR);
    const r = yin(b, SR);
    expect(Math.abs(cents(r.freq, f)), `${r.freq}`).toBeLessThan(3);
  });

  it('works at 48 kHz too', () => {
    const r = yin(tone(330, { sr: 48000 }), 48000);
    expect(Math.abs(cents(r.freq, 330))).toBeLessThan(3);
  });

  it('reports low clarity for noise and silence', () => {
    expect(yin(tone(0, { noise: 1 }), SR).clarity).toBeLessThan(0.5);
    expect(yin(new Float32Array(WINDOW), SR).clarity).toBe(0);
  });

  it('converts to MIDI with A4 as reference', () => {
    expect(freqToMidi(440, 440)).toBeCloseTo(69, 10);
    expect(freqToMidi(432, 432)).toBeCloseTo(69, 10);
    expect(freqToMidi(261.6256, 440)).toBeCloseTo(60, 3);
  });
});

describe('sing detector', () => {
  const run = (frames, opts) => {
    const events = [];
    const det = createSingDetector({ onState: e => events.push(e), ...opts });
    for (const f of frames) det.frame(f);
    return events;
  };
  const steady = (midi, from, to, step = 33) => {
    const out = [];
    for (let t = from; t <= to; t += step) out.push({ t, midi, clarity: 0.95, level: 0.1 });
    return out;
  };

  it('goes listening -> hold -> heard for a steady note, once', () => {
    const ev = run(steady(64.1, 0, 1000));
    expect(ev[0].state).toBe('hold');
    const heard = ev.filter(e => e.state === 'heard');
    expect(heard).toHaveLength(1);
    expect(heard[0].midi).toBe(64);
  });

  it('does not accept a wavering pitch', () => {
    const frames = [];
    for (let t = 0; t <= 1500; t += 33)
      frames.push({ t, midi: 64 + (Math.floor(t / 100) % 2 ? 0.8 : -0.8), clarity: 0.95, level: 0.1 });
    expect(run(frames).some(e => e.state === 'heard')).toBe(false);
  });

  it('ignores unclear or quiet input, and asks again after a long silence', () => {
    const frames = [];
    for (let t = 0; t <= 7000; t += 33) frames.push({ t, midi: 60, clarity: 0.4, level: 0.1 });
    const ev = run(frames);
    expect(ev.some(e => e.state === 'hold' || e.state === 'heard')).toBe(false);
    expect(ev.some(e => e.state === 'retry')).toBe(true);
  });

  it('filters single outlier frames with the median', () => {
    const frames = steady(62, 0, 1000);
    frames[10] = { ...frames[10], midi: 74 };
    frames[20] = { ...frames[20], midi: 50 };
    const heard = run(frames).filter(e => e.state === 'heard');
    expect(heard.map(e => e.midi)).toEqual([62]);
  });
});
