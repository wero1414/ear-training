import { describe, it, expect } from 'vitest';
import { NEW_CARD, addDays, isDue, quality, review, srsWeight } from '../../js/drills/srs.js';

const D = '2026-03-02';

describe('SM-2 review', () => {
  it('schedules 1, 6, then interval x EF days for successive good answers', () => {
    let c = review(NEW_CARD, 4, D);
    expect(c).toMatchObject({ reps: 1, interval: 1, due: '2026-03-03' });
    c = review(c, 4, c.due);
    expect(c).toMatchObject({ reps: 2, interval: 6, due: '2026-03-09' });
    c = review(c, 4, c.due);
    expect(c.reps).toBe(3);
    expect(c.interval).toBe(Math.round(6 * c.ef));
  });

  it('updates EF with the SM-2 formula and floors it at 1.3', () => {
    expect(review(NEW_CARD, 5, D).ef).toBeCloseTo(2.6, 10);
    expect(review(NEW_CARD, 4, D).ef).toBeCloseTo(2.5, 10);
    expect(review(NEW_CARD, 3, D).ef).toBeCloseTo(2.36, 10);
    let c = { ...NEW_CARD, ef: 1.35 };
    c = review(c, 3, D);
    expect(c.ef).toBe(1.3);
  });

  it('restarts repetitions on a failed answer without changing EF', () => {
    let c = review(review(review(NEW_CARD, 5, D), 5, '2026-03-03'), 5, '2026-03-09');
    const ef = c.ef;
    c = review(c, 1, '2026-03-20');
    expect(c).toMatchObject({ reps: 0, interval: 1, due: '2026-03-21', ef });
  });

  it('caps the interval at a year', () => {
    let c = NEW_CARD,
      d = D;
    for (let i = 0; i < 40; i++) {
      c = review(c, 5, d);
      d = c.due;
    }
    expect(c.interval).toBe(365);
  });

  it('keeps a short history', () => {
    let c = NEW_CARD;
    for (let i = 0; i < 40; i++) c = review(c, 4, addDays(D, i));
    expect(c.history.length).toBe(20);
    expect(c.history.at(-1)).toEqual({ d: addDays(D, 39), q: 4 });
  });
});

describe('helpers', () => {
  it('maps answers to SM-2 quality', () => {
    expect(quality({ ok: true, ms: 1500 })).toBe(5);
    expect(quality({ ok: true, ms: 6000 })).toBe(4);
    expect(quality({ ok: false, ms: 2000 })).toBe(1);
    expect(quality({ ok: false, timeout: true })).toBe(0);
  });

  it('adds days across month ends and leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('treats new and overdue cards as due, future ones not', () => {
    expect(isDue(undefined, D)).toBe(true);
    expect(isDue({ due: '2026-03-01' }, D)).toBe(true);
    expect(isDue({ due: D }, D)).toBe(true);
    expect(isDue({ due: '2026-03-03' }, D)).toBe(false);
  });

  it('weights overdue above new above not-due', () => {
    const overdue = srsWeight({ due: '2026-02-20' }, D),
      fresh = srsWeight(undefined, D),
      later = srsWeight({ due: '2026-03-10' }, D);
    expect(overdue).toBeGreaterThan(fresh);
    expect(fresh).toBeGreaterThan(later);
    expect(later).toBeGreaterThan(0);
  });
});
