import { describe, it, expect } from 'vitest';
import { phrase, harmonyPlan, CHORD_TONES } from '../../js/drills/phrase.js';

// Deterministic PRNG (mulberry32) so failures reproduce.
const rng = seed => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const many = [];
for (let len = 3; len <= 7; len++) for (let s = 1; s <= 600; s++) many.push({ len, m: phrase(len, rng(s * 31 + len)) });

describe('phrase grammar', () => {
  it('has the requested length and stays on degree indices 0-6', () => {
    for (const { len, m } of many) {
      expect(m).toHaveLength(len);
      for (const d of m) expect(d >= 0 && d <= 6 && Number.isInteger(d)).toBe(true);
    }
  });

  it('puts a chord tone of the planned harmony on every strong beat', () => {
    for (const { len, m } of many) {
      const plan = harmonyPlan(len);
      m.forEach((d, i) => {
        if (i % 2 === 0) expect(CHORD_TONES[plan[i >> 1]], `${m} at ${i}`).toContain(d);
      });
    }
  });

  it('ends on 1, 3 or 5', () => {
    for (const { m } of many) expect([0, 2, 4]).toContain(m.at(-1));
  });

  it('resolves every leap by step in the opposite direction', () => {
    for (const { m } of many)
      for (let i = 2; i < m.length; i++) {
        const leap = m[i - 1] - m[i - 2];
        if (Math.abs(leap) >= 2) expect(m[i] - m[i - 1], `${m}`).toBe(-Math.sign(leap));
      }
  });

  it('moves by step about 70% of the time', () => {
    let steps = 0,
      moves = 0;
    for (const { m } of many)
      for (let i = 1; i < m.length; i++) {
        moves++;
        if (Math.abs(m[i] - m[i - 1]) === 1) steps++;
      }
    const share = steps / moves;
    expect(share).toBeGreaterThan(0.62);
    expect(share).toBeLessThan(0.82);
  });

  it('never repeats a note back to back', () => {
    for (const { m } of many) for (let i = 1; i < m.length; i++) expect(m[i]).not.toBe(m[i - 1]);
  });
});
