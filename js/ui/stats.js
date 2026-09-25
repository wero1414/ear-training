import { P } from '../state/store.js';
import { el } from '../util.js';
import { t } from '../i18n/index.js';
import { statLabel } from '../drills/registry.js';

const ORDER = ['note', 'interval', 'chord', 'inv', 'degree', 'melody', 'prog', 'cadence', 'scale'];

// The "Accuracy by item" table.
export function paintStats() {
  let h = '';
  ORDER.forEach(b => {
    const st = P.stats[b];
    if (!st) return;
    const keys = Object.keys(st).filter(k => st[k].n);
    if (!keys.length) return;
    h += '<tr class="h"><td colspan="3">' + t('stats.kind.' + b) + '</td></tr>';
    keys.forEach(k => {
      const s = st[k],
        p = Math.round((100 * s.ok) / s.n),
        cls = p < 60 ? 'low' : p < 85 ? 'mid' : '';
      h +=
        '<tr><td class="n">' +
        statLabel(b, k) +
        '</td><td><div class="track"><i class="' +
        cls +
        '" style="width:' +
        p +
        '%"></i></div></td>' +
        '<td class="c">' +
        t('stats.row', { p, n: s.n }) +
        '</td></tr>';
    });
  });
  const tbl = el('statTbl');
  if (tbl) tbl.innerHTML = h || '<tr><td class="n" style="color:var(--dimmer)">' + t('stats.empty') + '</td></tr>';
}
