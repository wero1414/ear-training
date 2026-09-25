import { P, lvlOf, xpFor } from '../state/store.js';
import { el } from '../util.js';
import { t } from '../i18n/index.js';

export function say(h, c) {
  const m = el('msg');
  if (m) {
    m.innerHTML = h;
    m.className = 'msg' + (c ? ' ' + c : '');
  }
}

export function pop(t, c) {
  const d = document.createElement('div');
  d.className = 'pop';
  d.textContent = t;
  d.style.color = c;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

export function flash(ok) {
  const d = document.createElement('div');
  d.className = 'flash';
  d.style.background =
    'radial-gradient(circle at 50% 40%,' + (ok ? 'rgba(53,217,187,.30)' : 'rgba(236,92,110,.30)') + ',transparent 62%)';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 450);
}

// Level, xp bar and streak at the top of the page.
export function paintTop() {
  const l = lvlOf(P.xp),
    cur = xpFor(l),
    next = xpFor(l + 1);
  const frac = Math.max(0, Math.min(1, (P.xp - cur) / (next - cur)));
  el('lvlNum').textContent = l;
  el('xpLabel').textContent = t('top.level', { n: l });
  el('xpNum').textContent = t('top.xp', { cur: P.xp - cur, next: next - cur });
  el('xpFill').style.width = frac * 100 + '%';
  // 119.4 is the ring's circumference, 2 * pi * r for r = 19.
  el('ring').setAttribute('stroke-dashoffset', String(119.4 * (1 - frac)));
  el('fire').textContent = P.days > 1 ? t('top.streak', { n: P.days }) : '';
}

// Question count, hearts, multiplier and score during a stage run.
export function paintHUD(run) {
  if (!run) return;
  const q = el('hq');
  if (q) q.textContent = Math.min(run.i + 1, run.spec.n) + ' / ' + run.spec.n;
  const h = el('hh');
  if (h) h.innerHTML = [0, 1, 2].map(i => '<span class="' + (i < run.lives ? '' : 'off') + '">\u2665</span>').join('');
  const c = el('hc');
  if (c) c.textContent = run.combo >= 3 ? '\u00d7' + Math.min(3, 1 + run.combo * 0.15).toFixed(1) : '';
  const s = el('hs');
  if (s) s.textContent = run.score;
}
