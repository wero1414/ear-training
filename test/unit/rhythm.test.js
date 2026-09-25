import { describe, it, expect } from 'vitest';
import { CELLS, onsets, pattern, gradeTaps } from '../../js/drills/rhythm-core.js';

const rng = seed => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('rhythm cells', () => {
  it('every cell fills exactly one beat', () => {
    for (const [name, c] of Object.entries(CELLS))
      expect(
        c.durs.reduce((a, b) => a + b, 0),
        name,
      ).toBe(4);
  });

  it('turns cells into onsets in beats', () => {
    expect(onsets(['q', 'ee', 'ssss', 'q'])).toEqual([0, 1, 1.5, 2, 2.25, 2.5, 2.75, 3]);
    expect(onsets(['ess', 'sse'])).toEqual([0, 0.5, 0.75, 1, 1.25, 1.5]);
  });

  it('makes one-bar patterns from the level vocabulary, never all quarters', () => {
    for (let s = 1; s < 300; s++) {
      const p1 = pattern(1, rng(s));
      expect(p1).toHaveLength(4);
      for (const c of p1) expect(['q', 'ee']).toContain(c);
      expect(p1.every(c => c === 'q')).toBe(false);
      for (const c of pattern(2, rng(s))) expect(Object.keys(CELLS)).toContain(c);
    }
  });
});

describe('gradeTaps', () => {
  const beat = 0.75; // 80 bpm
  const expected = onsets(['q', 'ee', 'q', 'ee']).map(b => b * beat);

  it('accepts accurate taps', () => {
    const r = gradeTaps(
      expected,
      expected.map(t => t + 0.01),
    );
    expect(r.ok).toBe(true);
  });

  it('forgives a constant offset (latency) but not a scattered one', () => {
    expect(
      gradeTaps(
        expected,
        expected.map(t => t + 0.12),
      ).ok,
    ).toBe(true);
    const scattered = expected.map((t, i) => t + (i % 2 ? 0.12 : -0.12));
    expect(gradeTaps(expected, scattered).ok).toBe(false);
  });

  it('rejects a wrong number of taps and an offset of a whole subdivision', () => {
    expect(gradeTaps(expected, expected.slice(1)).ok).toBe(false);
    expect(gradeTaps(expected, [...expected, 3.1]).ok).toBe(false);
    expect(
      gradeTaps(
        expected,
        expected.map(t => t + 0.375),
      ).ok,
    ).toBe(false);
  });

  it('reports the average offset in ms', () => {
    expect(
      gradeTaps(
        expected,
        expected.map(t => t - 0.05),
      ).offsetMs,
    ).toBe(-50);
  });
});
