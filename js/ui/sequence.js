// Sequence answer widget: `len` slots filled by tapping item buttons, with undo and a
// "hear mine" playback. The trial is read through current() at click time.
//   current()  the live trial        label(v)  slot text for a value
//   submit(seq) called when full     hear(trial) plays the entered sequence
import { t } from '../i18n/index.js';

export function seqUI(host, items, len, cls, { current, label, submit, hear }) {
  const slots = document.createElement('div');
  slots.className = 'slots';
  const draw = () => {
    slots.innerHTML = '';
    for (let i = 0; i < len; i++) {
      const d = document.createElement('div');
      const v = current().seq[i];
      d.className = 'slot' + (v === undefined ? '' : ' full');
      d.textContent = v === undefined ? '\u2013' : label(v);
      slots.appendChild(d);
    }
  };
  draw();
  host.appendChild(slots);
  const truth = document.createElement('div');
  truth.className = 'slots';
  truth.id = 'truthSlots';
  host.appendChild(truth);
  const g = document.createElement('div');
  g.className = 'grid' + (cls ? ' ' + cls : '');
  items.forEach(it => {
    const b = document.createElement('button');
    b.dataset.v = it.v;
    b.innerHTML = '<b>' + it.b + '</b>';
    b.onclick = () => {
      const trial = current();
      if (!trial || trial.done || trial.seq.length >= len) return;
      trial.seq.push(it.v);
      draw();
      if (trial.seq.length === len) submit(trial.seq.slice());
    };
    g.appendChild(b);
  });
  host.appendChild(g);
  const row = document.createElement('div');
  row.className = 'octrow';
  const back = document.createElement('button');
  back.textContent = '\u232b';
  back.onclick = () => {
    const trial = current();
    if (trial && !trial.done) {
      trial.seq.pop();
      draw();
    }
  };
  const hearBtn = document.createElement('button');
  hearBtn.textContent = t('trial.hearMine');
  hearBtn.onclick = () => {
    const trial = current();
    if (!trial || !trial.seq.length) return;
    hear(trial);
  };
  row.append(back, hearBtn);
  host.appendChild(row);
}
