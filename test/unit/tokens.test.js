import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../css/tokens.css', import.meta.url), 'utf8');
const blocks = [...css.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]);

it('keeps each token block one-per-line, unique and alphabetised', () => {
  expect(blocks.length).toBe(2);
  for (const body of blocks) {
    const lines = body
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    for (const l of lines) expect(l).toMatch(/^--[a-z0-9-]+: [^;]+;$/);
    const names = lines.map(l => l.split(':')[0]);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([...names].sort());
  }
});

it('overrides only tokens that exist in the default block', () => {
  const names = body => [...body.matchAll(/(--[a-z0-9-]+):/g)].map(m => m[1]);
  const base = new Set(names(blocks[0]));
  for (const n of names(blocks[1])) expect(base.has(n)).toBe(true);
});
