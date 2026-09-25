import { WHITE, BLACK } from '../theory/pitch.js';
import { nn } from '../labels.js';

// Black key pitch class -> index of the white key it sits after.
const BLACK_AFTER = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

// active: pitch classes that stay enabled (null for all). cb(pc, octaveIndex).
// opts.octaves: how many octaves to draw; opts.hl: {pc: className} highlights.
export function keyboard(host, active, cb, opts) {
  const o = opts || {},
    octs = o.octaves || 1;
  const kb = document.createElement('div');
  kb.className = 'kb' + (octs > 1 ? ' tall' : '');
  const nW = 7 * octs,
    ww = 100 / nW,
    bw = ww * 0.62;
  for (let oc = 0; oc < octs; oc++) {
    WHITE.forEach((pc, i) => {
      const b = document.createElement('button');
      b.className = 'k w';
      b.dataset.pc = pc;
      b.dataset.oct = oc;
      b.style.left = (oc * 7 + i) * ww + '%';
      b.style.width = ww + '%';
      b.textContent = nn(pc);
      if (active && !active.includes(pc)) b.disabled = true;
      if (o.hl && o.hl[pc]) b.classList.add(o.hl[pc]);
      kb.appendChild(b);
    });
    BLACK.forEach(pc => {
      const b = document.createElement('button');
      b.className = 'k b';
      b.dataset.pc = pc;
      b.dataset.oct = oc;
      b.style.left = (oc * 7 + BLACK_AFTER[pc] + 1) * ww - bw / 2 + '%';
      b.style.width = bw + '%';
      b.textContent = nn(pc);
      if (active && !active.includes(pc)) b.disabled = true;
      if (o.hl && o.hl[pc]) b.classList.add(o.hl[pc]);
      kb.appendChild(b);
    });
  }
  kb.addEventListener('click', e => {
    const b = e.target.closest('.k');
    if (b && !b.disabled) cb(+b.dataset.pc, +b.dataset.oct);
  });
  host.appendChild(kb);
  return kb;
}
