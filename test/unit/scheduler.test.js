import { describe, it, expect } from 'vitest';
import { createVisualQueue } from '../../js/audio/scheduler.js';

describe('visual queue', () => {
  it('fires events once the clock reaches them, in time order', () => {
    const q = createVisualQueue();
    const fired = [];
    q.at(2, () => fired.push('b'));
    q.at(1, () => fired.push('a'));
    q.at(3, () => fired.push('c'));
    q.flush(0.5);
    expect(fired).toEqual([]);
    q.flush(2);
    expect(fired).toEqual(['a', 'b']);
    q.flush(10);
    expect(fired).toEqual(['a', 'b', 'c']);
    q.flush(20);
    expect(fired).toEqual(['a', 'b', 'c']);
  });

  it('catches up after a long gap (hidden tab) by firing everything due, in order', () => {
    const q = createVisualQueue();
    const fired = [];
    for (let i = 0; i < 5; i++) q.at(i, () => fired.push(i));
    q.flush(100);
    expect(fired).toEqual([0, 1, 2, 3, 4]);
  });

  it('drops pending events on clear', () => {
    const q = createVisualQueue();
    const fired = [];
    q.at(1, () => fired.push(1));
    q.clear();
    q.flush(5);
    expect(fired).toEqual([]);
    expect(q.size()).toBe(0);
  });
});
