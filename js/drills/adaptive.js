import { S, P } from '../state/store.js';
import { pick, rnd } from '../util.js';

// Previous answer, shared across drill kinds, so the same answer is not asked twice in a row.
export const guard = { last: null };

export function bump(b, key, ok) {
  if (!P.stats[b]) P.stats[b] = {};
  const s = P.stats[b][key] || (P.stats[b][key] = { n: 0, ok: 0 });
  s.n++;
  if (ok) s.ok++;
}

// Error-rate weighting. Items with fewer than 3 attempts get weight 2 so untested items
// surface early. keyOf maps a candidate to its stats key when the two differ.
export function weighted(items, b, keyOf = i => i) {
  if (!S.adaptive) return pick(items);
  const st = P.stats[b] || {};
  const w = items.map(i => {
    const s = st[keyOf(i)];
    return !s || s.n < 3 ? 2 : 1 + 3.2 * (1 - s.ok / s.n);
  });
  let t = w.reduce((a, b2) => a + b2, 0),
    r = Math.random() * t;
  for (let i = 0; i < items.length; i++) {
    r -= w[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function keyFor(sp) {
  const pc = sp.keyMode === 'random' ? rnd(12) : 0;
  const minor = sp.keyQual === 'min' ? true : sp.keyQual === 'both' ? Math.random() < 0.5 : false;
  return { pc, minor };
}
