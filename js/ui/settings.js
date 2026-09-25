// Practice settings, Sound, and the progress export/reset controls.
import { S, P, sv, replaceAll, resetProgress } from '../state/store.js';
import { parseBackup } from '../state/backup.js';
import { KINDS, kindEnabled } from '../drills/registry.js';
import { el } from '../util.js';
import { ALL12, WHITE } from '../theory/pitch.js';
import { applyStatic, setLang, t } from '../i18n/index.js';
import { CH } from '../theory/chords.js';
import { SC } from '../theory/scales.js';
import { nn } from '../labels.js';
import { isIOS, mediaChannel, setReverb } from '../audio/context.js';
import { clearPluckCache, playNote } from '../audio/instruments.js';
import { paintTop } from './hud.js';
import { midiAvailable, setMidi } from './midi.js';
import { singAvailable, stopSing } from './sing.js';
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

// Phase 2 features land behind these flags until they are solid (settings keys, all
// default off). Each has lab.<key>.name and lab.<key>.hint strings; `available` hides a
// flag the browser cannot support, `apply` runs when it is switched.
export const LAB_FLAGS = [
  { key: 'labMelody' },
  { key: 'labSrs' },
  { key: 'labMidi', available: midiAvailable, apply: setMidi },
  { key: 'labJamQuiz' },
  { key: 'labSing', available: singAvailable, apply: on => on || stopSing() },
  { key: 'labRhythm' },
];

function labRows() {
  const host = el('labRows');
  const flags = LAB_FLAGS.filter(f => !f.available || f.available());
  el('labBox').hidden = !flags.length;
  host.innerHTML = '';
  for (const { key: f, apply } of flags) {
    const row = document.createElement('div');
    row.className = 'srow';
    const label = document.createElement('label');
    label.className = 'lbl';
    label.htmlFor = f;
    label.textContent = t('lab.' + f + '.name');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = f;
    box.checked = !!S[f];
    box.onchange = () => {
      S[f] = box.checked;
      sv();
      if (apply) apply(box.checked);
      // Flags can add drill kinds, so redraw the chips (and these rows) too.
      chips();
      go(view);
    };
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = t('lab.' + f + '.hint');
    row.append(label, box, hint);
    host.appendChild(row);
  }
}

// Preset buttons show their notes in the current naming (C F# or Do Fa#).
const PRESETS = { 2: [0, 6], 3: [0, 4, 8], 4: [0, 3, 6, 9] };

// Every chip row refuses to deselect its last item.
export function chips() {
  labRows();
  for (const [k, pcs] of Object.entries(PRESETS))
    document.querySelector('[data-preset="' + k + '"]').textContent = pcs.map(nn).join(' ');
  chipRow(
    el('kindChips'),
    Object.keys(KINDS)
      .filter(k => kindEnabled(k, S))
      .map(v => ({
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
  el('lang').value = S.lang;
  el('degNaming').value = S.degNaming;
  el('iosMediaChannel').checked = S.iosMediaChannel;
  el('iosRow').hidden = !isIOS();
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
  el('iosMediaChannel').onchange = e => {
    S.iosMediaChannel = e.target.checked;
    sv();
    mediaChannel(S.iosMediaChannel);
  };
  el('degNaming').onchange = e => {
    S.degNaming = e.target.value;
    sv();
    paintStats();
    go(view);
  };
  el('lang').onchange = e => {
    S.lang = e.target.value;
    sv();
    setLang(S.lang);
    applyStatic();
    chips();
    paintTop();
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
  el('btnImport').onclick = () => el('importFile').click();
  el('importFile').onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data;
    try {
      data = parseBackup(await file.text());
    } catch {
      el('importMsg').textContent = t('stats.importBad');
      return;
    }
    if (!confirm(t('stats.confirmImport'))) return;
    replaceAll(data.settings, data.progress);
    sv();
    setLang(S.lang);
    applyStatic();
    octSelects();
    chips();
    syncSettings();
    paintTop();
    paintStats();
    el('importMsg').textContent = t('stats.imported');
    go('map');
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
