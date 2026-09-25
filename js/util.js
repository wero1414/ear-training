export const el = id => document.getElementById(id);
export const rnd = n => (Math.random() * n) | 0;
export const pick = a => a[rnd(a.length)];
export const eq = (a, b) =>
  Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]) : a === b;
