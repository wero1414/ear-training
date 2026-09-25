import { describe, it, expect } from 'vitest';
import { PROGRESS_SCHEMA, migrateProgress } from '../../js/state/migrate.js';

describe('migrateProgress v1 -> v2', () => {
  it('rekeys diatonic degree stats by semitone, as v1 displayed them', () => {
    const p = migrateProgress({ stats: { degree: { 0: { n: 2, ok: 1 }, 1: { n: 1, ok: 1 }, 3: { n: 4, ok: 2 } } } });
    // degree index 1 -> semitone 2 ("2"), index 3 -> semitone 5 ("4")
    expect(p.stats.degree).toEqual({ 0: { n: 2, ok: 1 }, 2: { n: 1, ok: 1 }, 5: { n: 4, ok: 2 } });
  });

  it('keeps chromatic keys (7-11) and merges rows that land on the same semitone', () => {
    const p = migrateProgress({ stats: { degree: { 4: { n: 2, ok: 2 }, 7: { n: 3, ok: 1 }, 10: { n: 1, ok: 0 } } } });
    // index 4 is semitone 7, the same item as chromatic key 7
    expect(p.stats.degree).toEqual({ 7: { n: 5, ok: 3 }, 10: { n: 1, ok: 0 } });
  });

  it('leaves other buckets alone and stamps the schema', () => {
    const note = { 3: { n: 1, ok: 1 } };
    const p = migrateProgress({ xp: 50, stats: { note } });
    expect(p.stats.note).toBe(note);
    expect(p.xp).toBe(50);
    expect(p.schema).toBe(PROGRESS_SCHEMA);
    expect(migrateProgress({}).schema).toBe(PROGRESS_SCHEMA);
  });

  it('does not touch data that is already current', () => {
    const degree = { 3: { n: 1, ok: 0 } };
    expect(migrateProgress({ schema: 2, stats: { degree } }).stats.degree).toBe(degree);
  });
});
