import { S } from '../state/store.js';
import { pick } from '../util.js';
import { midiToFreq } from '../theory/pitch.js';
import { chordMidis } from '../theory/chords.js';
import { keyContextChords } from '../theory/harmony.js';
import { ac, audio, bus, send } from './context.js';

let noiseBuf = null;
let drone = null;
const ksCache = new Map();

export const freqOf = m => midiToFreq(m, S.a4);
export const pickTimbre = t => {
  const k = t || S.timbre;
  return k === 'mixed' ? pick(['rhodes', 'pluck', 'marimba', 'organ']) : k;
};

// volume^1.7 approximates perceived loudness; a linear slider feels dead at the bottom.
function vgain(vel) {
  const g = audio().createGain();
  g.gain.value = Math.pow(S.vol, 1.7) * (vel === undefined ? 1 : vel);
  g.connect(bus);
  g.connect(send);
  return g;
}

// Two-operator FM voice. The modulation index is in Hz relative to f and decays over
// `mdec`, which is what gives the rhodes and marimba their attack.
function fmv(f, t0, dur, out, o) {
  const car = ac.createOscillator();
  car.frequency.value = f;
  const mod = ac.createOscillator();
  mod.frequency.value = f * o.ratio;
  const mg = ac.createGain();
  mg.gain.setValueAtTime(f * o.idx, t0);
  mg.gain.exponentialRampToValueAtTime(Math.max(f * o.idxEnd, 0.5), t0 + o.mdec);
  mod.connect(mg);
  mg.connect(car.frequency);
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(o.peak, t0 + o.atk);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.2, dur * o.dec));
  car.connect(amp);
  amp.connect(out);
  car.start(t0);
  mod.start(t0);
  car.stop(t0 + dur + 0.3);
  mod.stop(t0 + dur + 0.3);
}

// Karplus-Strong, rendered once per (frequency, duration) into a buffer. Damping rises
// with frequency so high strings do not ring forever.
function ksBuf(f, dur) {
  const key = f.toFixed(2) + '|' + dur.toFixed(2);
  if (ksCache.has(key)) return ksCache.get(key);
  const sr = ac.sampleRate,
    N = Math.max(2, Math.round(sr / f)),
    len = Math.ceil(sr * dur);
  const b = ac.createBuffer(1, len, sr),
    d = b.getChannelData(0),
    line = new Float32Array(N);
  let s = 0;
  for (let i = 0; i < N; i++) {
    s = s * 0.6 + (Math.random() * 2 - 1) * 0.4;
    line[i] = s;
  }
  let idx = 0,
    prev = 0;
  const damp = 0.9965 - Math.min(0.004, f / 40000);
  for (let i = 0; i < len; i++) {
    const cur = line[idx],
      nxt = line[(idx + 1) % N];
    line[idx] = damp * 0.5 * (cur + nxt);
    idx = (idx + 1) % N;
    prev = prev * 0.25 + cur * 0.75;
    d[i] = prev * 0.9;
  }
  const fade = Math.min(len, (sr * 0.05) | 0);
  for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
  if (ksCache.size > 240) ksCache.clear();
  ksCache.set(key, b);
  return b;
}

// The pluck cache is keyed by frequency, so it must be dropped when A4 changes or the
// pluck stays at the old tuning.
export function clearPluckCache() {
  ksCache.clear();
}

export function playNote(midi, when, dur, tname, vel) {
  const a = audio(),
    t0 = a.currentTime + (when || 0),
    f = freqOf(midi),
    T = pickTimbre(tname),
    out = vgain(vel);
  if (T === 'rhodes') {
    fmv(f, t0, dur, out, { ratio: 1, idx: 3.4, idxEnd: 0.12, mdec: 0.5, atk: 0.004, dec: 1.05, peak: 0.42 });
    // Tine: a short, inharmonic 7.02 operator on top.
    fmv(f, t0, dur * 0.35, out, { ratio: 7.02, idx: 0.9, idxEnd: 0.02, mdec: 0.09, atk: 0.002, dec: 0.3, peak: 0.1 });
  } else if (T === 'bass') {
    fmv(f, t0, dur, out, { ratio: 1, idx: 1.1, idxEnd: 0.05, mdec: 0.25, atk: 0.006, dec: 0.9, peak: 0.6 });
  } else if (T === 'marimba') {
    // Ratio 3.96 is deliberately inharmonic.
    fmv(f, t0, Math.min(dur, 1.1), out, {
      ratio: 3.96,
      idx: 1.6,
      idxEnd: 0.03,
      mdec: 0.07,
      atk: 0.002,
      dec: 0.45,
      peak: 0.5,
    });
  } else if (T === 'pluck') {
    const src = a.createBufferSource();
    src.buffer = ksBuf(f, Math.max(0.6, dur));
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(13000, f * 10 + 1200);
    const g = a.createGain();
    g.gain.value = 0.75;
    src.connect(lp);
    lp.connect(g);
    g.connect(out);
    src.start(t0);
    src.stop(t0 + dur + 0.2);
  } else if (T === 'organ') {
    [
      [1, 0.5],
      [2, 0.3],
      [3, 0.14],
      [4, 0.2],
      [6, 0.07],
      [8, 0.09],
    ].forEach(([r, amp]) => {
      const o = a.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * r;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(amp * 0.55, t0 + 0.03);
      g.gain.setValueAtTime(amp * 0.55, t0 + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(out);
      o.start(t0);
      o.stop(t0 + dur + 0.2);
    });
  } else {
    const o = a.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.6, t0 + 0.025);
    g.gain.setValueAtTime(0.6, t0 + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(out);
    o.start(t0);
    o.stop(t0 + dur + 0.2);
  }
}

export function playStack(midis, when, dur, tb, arp, vel) {
  midis.forEach((m, i) =>
    playNote(m, when + (arp ? i * 0.19 : i * 0.012), dur, tb, vel === undefined ? (arp ? 0.95 : 0.72) : vel),
  );
  return arp ? dur + midis.length * 0.19 : dur;
}

// One second of low-weighted noise (three summed one-pole filters over white noise),
// built on first use and looped by every noise source.
function noise(a) {
  if (!noiseBuf) {
    const n = a.sampleRate | 0;
    noiseBuf = a.createBuffer(1, n, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 0.1050186;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
  }
  return noiseBuf;
}

// Masker before single-note trials, so the previous note cannot serve as a reference.
export function noiseBurst(when, dur) {
  const a = audio(),
    t0 = a.currentTime + (when || 0);
  const src = a.createBufferSource();
  src.buffer = noise(a);
  src.loop = true;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1100;
  bp.Q.value = 0.5;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.09 * Math.pow(S.vol, 1.7), t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(bus);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

export function hat(when, vel) {
  const a = audio(),
    t0 = a.currentTime + when;
  const src = a.createBufferSource();
  src.buffer = noise(a);
  src.loop = true;
  const hp = a.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.09 * vel * Math.pow(S.vol, 1.7), t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  src.connect(hp);
  hp.connect(g);
  g.connect(bus);
  src.start(t0);
  src.stop(t0 + 0.09);
}

export function kick(when) {
  const a = audio(),
    t0 = a.currentTime + when,
    o = a.createOscillator(),
    g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140, t0);
  o.frequency.exponentialRampToValueAtTime(45, t0 + 0.09);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.55 * Math.pow(S.vol, 1.7), t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
  o.connect(g);
  g.connect(bus);
  o.start(t0);
  o.stop(t0 + 0.3);
}

export function sfx(k) {
  if (!S.sfx) return;
  if (k === 'ok') {
    playNote(88, 0, 0.5, 'marimba', 0.5);
    playNote(95, 0.07, 0.5, 'marimba', 0.38);
  } else if (k === 'bad') {
    const a = audio(),
      t0 = a.currentTime,
      out = vgain(0.55);
    [88, 93].forEach(f => {
      const o = a.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      o.connect(g);
      g.connect(out);
      o.start(t0);
      o.stop(t0 + 0.35);
    });
  } else if (k === 'clear') {
    [72, 76, 79, 84, 88].forEach((m, i) => playNote(m, i * 0.09, 0.9, 'marimba', 0.5));
  } else if (k === 'fail') {
    [60, 57, 53].forEach((m, i) => playNote(m, i * 0.13, 0.8, 'rhodes', 0.5));
  }
}

export function droneOn(midi) {
  droneOff();
  const a = audio(),
    out = a.createGain();
  out.gain.value = 0;
  out.connect(bus);
  out.connect(send);
  const oscs = [
    [1, 1],
    [2, 0.28],
    [3, 0.1],
    [4, 0.06],
  ].map(([r, amp]) => {
    const o = a.createOscillator();
    o.type = 'sine';
    o.frequency.value = freqOf(midi) * r;
    const g = a.createGain();
    g.gain.value = amp * 0.2;
    o.connect(g);
    g.connect(out);
    o.start();
    return o;
  });
  out.gain.linearRampToValueAtTime(Math.pow(S.vol, 1.7), a.currentTime + 0.1);
  drone = { out, oscs };
}

export function droneOff() {
  if (!drone) return;
  const d = drone;
  drone = null;
  d.out.gain.cancelScheduledValues(ac.currentTime);
  d.out.gain.setValueAtTime(d.out.gain.value, ac.currentTime);
  d.out.gain.linearRampToValueAtTime(0, ac.currentTime + 0.15);
  d.oscs.forEach(o => o.stop(ac.currentTime + 0.25));
}

export const droneActive = () => !!drone;

// I-IV-V-I (or i-iv-V-i) at 480 ms per chord. Returns when the cadence has finished.
export function keyContext(keyPc, when, minor) {
  const r = 48 + keyPc;
  keyContextChords(minor).forEach((c, i) =>
    playStack(chordMidis(r + c[0], c[1], 0), when + i * 0.48, 0.62, 'rhodes', false, 0.55),
  );
  return 4 * 0.48 + 0.35;
}
