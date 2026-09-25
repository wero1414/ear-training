import { describe, it, expect } from 'vitest';
import { parseBackup } from '../../js/state/backup.js';

const good = {
  settings: { naming: 'solf', lang: 'es', vol: 0.5 },
  progress: {
    xp: 120,
    stars: { c0s0: 2 },
    best: { c0s0: 900 },
    stats: { degree: { 1: { n: 2, ok: 1 } } },
    days: 3,
    last: '2026-03-01',
  },
  at: '2026-03-02T10:00:00.000Z',
};

describe('parseBackup', () => {
  it('reads an exported file and migrates old progress', () => {
    const { settings, progress } = parseBackup(JSON.stringify(good));
    expect(settings.naming).toBe('solf');
    expect(settings.degNaming).toBe('movable'); // upgraded like stored settings
    expect(progress.schema).toBe(3);
    expect(progress.stats.degree).toEqual({ 2: { n: 2, ok: 1 } }); // v1 degree keys migrated
    expect(progress.xp).toBe(120);
  });

  it('keeps current progress as it is', () => {
    const cur = { ...good, progress: { ...good.progress, schema: 2, stats: { degree: { 3: { n: 1, ok: 0 } } } } };
    expect(parseBackup(JSON.stringify(cur)).progress.stats.degree).toEqual({ 3: { n: 1, ok: 0 } });
  });

  it('rejects anything that is not an export', () => {
    for (const bad of [
      '',
      'not json',
      '[]',
      '{}',
      JSON.stringify({ settings: {} }),
      JSON.stringify({ progress: { xp: 'a lot' }, settings: {} }),
      JSON.stringify({ settings: {}, progress: { xp: 1, stars: [], best: {}, stats: {} } }),
    ])
      expect(() => parseBackup(bad), bad).toThrow();
  });
});
