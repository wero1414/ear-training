// Practice settings, Sound, and the progress export/reset controls.
import { S, P, sv, resetProgress } from '../state/store.js';
import { el } from '../util.js';
import { ALL12, WHITE } from '../theory/pitch.js';
import { t } from '../i18n/index.js';
import { CH } from '../theory/chords.js';
import { SC } from '../theory/scales.js';
import { nn } from '../labels.js';
import { setReverb } from '../audio/context.js';
import { clearPluckCache, playNote } from '../audio/instruments.js';
import { paintTop } from './hud.js';
import { paintStats } from './stats.js';
import { go, view } from '../main.js';

function chipRow(host, items, isOn, toggle) {
  host.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button');
    b.className = 'chip' + (isOn(it.v) ? ' on' : '');
    b.textContent = it.b;
    b.onclick = () => {
      toggle(it.v);
      sv();
      chips();
    };
    host.appendChild(b);
  });
}

// Every chip row refuses to deselect its last item.
export function chips() {
  chipRow(
    el('kindChips'),
    ['note', 'interval', 'chord', 'inv', 'degree', 'melody', 'prog', 'cadence', 'scale'].map(v => ({
      v,
      b: t('kinds.' + v),
    })),
    v => S.kinds.includes(v),
    v => {
      S.kinds.includes(v) ? S.kinds.length > 1 && (S.kinds = S.kinds.filter(x => x !== v)) : S.kinds.push(v);
    },
  );
  chipRow(
    el('pcChips'),
    ALL12.map(i => ({ v: i, b: nn(i) })),
    v => S.pcs.includes(v),
    v => {
      S.pcs.includes(v)
        ? S.pcs.length > 1 && (S.pcs = S.pcs.filter(x => x !== v))
        : (S.pcs = [...S.pcs, v].sort((a, b) => a - b));
    },
  );
  chipRow(
    el('ivlChips'),
    [...Array(13).keys()].map(i => ({ v: i, b: t('theory.intervalShort')[i] })),
    v => S.ivls.includes(v),
    v => {
      S.ivls.includes(v)
        ? S.ivls.length > 1 && (S.ivls = S.ivls.filter(x => x !== v))
        : (S.ivls = [...S.ivls, v].sort((a, b) => a - b));
    },
  );
  chipRow(
    el('chChips'),
    Object.keys(CH).map(q => ({ v: q, b: CH[q].s })),
    v => S.chords.includes(v),
    v => {
      S.chords.includes(v) ? S.chords.length > 1 && (S.chords = S.chords.filter(x => x !== v)) : S.chords.push(v);
    },
  );
  chipRow(
    el('scChips'),
    Object.keys(SC).map(m => ({ v: m, b: t('theory.scale.' + m).short })),
    v => S.scales.includes(v),
    v => {
      S.scales.includes(v) ? S.scales.length > 1 && (S.scales = S.scales.filter(x => x !== v)) : S.scales.push(v);
    },
  );
}

export function octSelects() {
  const a = el('octLow'),
    b = el('octHigh');
  a.innerHTML = '';
  b.innerHTML = '';
  for (let o = 1; o <= 7; o++) {
    a.appendChild(new Option(o, o));
    b.appendChild(new Option(o, o));
  }
  a.value = S.octLow;
  b.value = S.octHigh;
}

export function syncSettings() {
  el('dir').value = S.dir;
  el('arp').value = S.arp;
  el('reqOct').checked = S.reqOct;
  el('limit').value = S.limit;
  el('keyMode').value = S.keyMode;
  el('keyQual').value = S.keyQual;
  el('melLen').value = S.melLen;
  el('chrom').checked = S.chrom;
  el('timbre').value = S.timbre;
  el('naming').value = S.naming;
  el('mask').checked = S.mask;
  el('sfx').checked = S.sfx;
  el('adaptive').checked = S.adaptive;
  el('a4').value = S.a4;
  el('vol').value = S.vol;
  el('volVal').textContent = Math.round(S.vol * 100) + '%';
  el('rev').value = S.rev;
  el('revVal').textContent = Math.round((S.rev / 0.6) * 100) + '%';
  el('dur').value = S.dur;
  el('durVal').textContent = (+S.dur).toFixed(1) + ' s';
}

export function bindSettings() {
  el('dir').onchange = e => {
    S.dir = e.target.value;
    sv();
  };
  el('arp').onchange = e => {
    S.arp = +e.target.value;
    sv();
  };
  el('reqOct').onchange = e => {
    S.reqOct = e.target.checked;
    sv();
  };
  el('limit').onchange = e => {
    S.limit = +e.target.value;
    sv();
  };
  el('keyMode').onchange = e => {
    S.keyMode = e.target.value;
    sv();
  };
  el('keyQual').onchange = e => {
    S.keyQual = e.target.value;
    sv();
  };
  el('melLen').onchange = e => {
    S.melLen = +e.target.value;
    sv();
  };
  el('chrom').onchange = e => {
    S.chrom = e.target.checked;
    sv();
  };
  el('timbre').onchange = e => {
    S.timbre = e.target.value;
    sv();
    playNote(60, 0, +S.dur, S.timbre);
  };
  el('naming').onchange = e => {
    S.naming = e.target.value;
    sv();
    chips();
    paintStats();
    go(view);
  };
  el('mask').onchange = e => {
    S.mask = e.target.checked;
    sv();
  };
  el('sfx').onchange = e => {
    S.sfx = e.target.checked;
    sv();
  };
  el('adaptive').onchange = e => {
    S.adaptive = e.target.checked;
    sv();
  };
  el('a4').onchange = e => {
    S.a4 = Math.min(500, Math.max(380, +e.target.value || 440));
    e.target.value = S.a4;
    clearPluckCache();
    sv();
  };
  el('vol').oninput = e => {
    S.vol = +e.target.value;
    el('volVal').textContent = Math.round(S.vol * 100) + '%';
    sv();
  };
  el('rev').oninput = e => {
    S.rev = +e.target.value;
    el('revVal').textContent = Math.round((S.rev / 0.6) * 100) + '%';
    setReverb(S.rev);
    sv();
  };
  el('dur').oninput = e => {
    S.dur = +e.target.value;
    el('durVal').textContent = S.dur.toFixed(1) + ' s';
    sv();
  };
  el('octLow').onchange = e => {
    S.octLow = +e.target.value;
    if (S.octHigh < S.octLow) {
      S.octHigh = S.octLow;
      el('octHigh').value = S.octHigh;
    }
    sv();
  };
  el('octHigh').onchange = e => {
    S.octHigh = +e.target.value;
    if (S.octHigh < S.octLow) {
      S.octLow = S.octHigh;
      el('octLow').value = S.octLow;
    }
    sv();
  };
  document.querySelectorAll('[data-preset]').forEach(
    b =>
      (b.onclick = () => {
        const p = b.dataset.preset;
        S.pcs =
          p === '2'
            ? [0, 6]
            : p === '3'
              ? [0, 4, 8]
              : p === '4'
                ? [0, 3, 6, 9]
                : p === 'white'
                  ? [...WHITE]
                  : [...ALL12];
        sv();
        chips();
      }),
  );
  el('btnExport').onclick = () => {
    const b = new Blob([JSON.stringify({ settings: S, progress: P, at: new Date().toISOString() }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'perfect-ear.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  el('btnReset').onclick = () => {
    if (!confirm(t('stats.confirmReset'))) return;
    resetProgress();
    sv();
    paintTop();
    paintStats();
    go('map');
  };
}
