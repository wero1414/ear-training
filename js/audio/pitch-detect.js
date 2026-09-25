// Pitch detection for sing-back (labSing). Everything here runs on this device: the
// microphone signal is analysed frame by frame and never recorded, stored or sent.
//
// YIN (de Cheveigne & Kawahara, JASA 2002): difference function, cumulative mean
// normalised difference, absolute threshold, parabolic interpolation. 2048-sample
// window, integrating over the first half so lags up to 1024 fit.
export const WINDOW = 2048;
const HALF = WINDOW / 2;
// The paper's absolute threshold is 0.1-0.15; 0.15 keeps breathy voices.
const THRESHOLD = 0.15;
const MIN_F = 60,
  MAX_F = 1100;

export function yin(buf, sr) {
  const tauMin = Math.floor(sr / MAX_F),
    tauMax = Math.min(HALF, Math.ceil(sr / MIN_F));
  let energy = 0;
  for (let i = 0; i < WINDOW; i++) energy += buf[i] * buf[i];
  if (energy === 0) return { freq: 0, clarity: 0 };

  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let j = 0; j < HALF; j++) {
      const x = buf[j] - buf[j + tau];
      s += x * x;
    }
    d[tau] = s;
  }
  const dn = new Float32Array(tauMax + 1);
  dn[0] = 1;
  let sum = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    sum += d[tau];
    dn[tau] = sum ? (d[tau] * tau) / sum : 1;
  }

  // First dip under the threshold, walked down to its local minimum; failing that,
  // the global minimum (and a clarity that says it is unreliable).
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++)
    if (dn[t] < THRESHOLD) {
      while (t + 1 <= tauMax && dn[t + 1] < dn[t]) t++;
      tau = t;
      break;
    }
  if (tau < 0) {
    tau = tauMin;
    for (let t = tauMin; t <= tauMax; t++) if (dn[t] < dn[tau]) tau = t;
  }

  let exact = tau;
  if (tau > 1 && tau < tauMax) {
    const a = dn[tau - 1],
      b = dn[tau],
      c = dn[tau + 1],
      den = a - 2 * b + c;
    if (den) exact = tau + (a - c) / (2 * den);
  }
  return { freq: sr / exact, clarity: Math.max(0, 1 - dn[tau]) };
}

export const freqToMidi = (f, a4) => 69 + 12 * Math.log2(f / a4);

// Turns a stream of frames {t (ms), midi, clarity, level (RMS)} into states:
//   hold    a clear pitch, not yet steady ("hold steady: Mi")
//   heard   the same pitch (median of the last MEDIAN_MS) held for HOLD_MS
//   retry   nothing clear for RETRY_MS: ask again rather than mark wrong
// A heard note must be released (silence or unclear input) before the next one counts,
// so one sustained note is one answer.
const MEDIAN_MS = 150;
const HOLD_MS = 300;
const TOLERANCE = 0.4; // semitones around the held pitch
const CLARITY = 0.85;
const LEVEL = 0.01;
const RETRY_MS = 6000;

const median = xs => {
  const s = xs.slice().sort((a, b) => a - b);
  return s[s.length >> 1];
};

export function createSingDetector({ onState }) {
  let recent = [],
    holdStart = null,
    holdMidi = 0,
    heard = false,
    since = null,
    retried = false;

  function reset(t = null) {
    recent = [];
    holdStart = null;
    heard = false;
    since = t;
    retried = false;
  }

  function frame(f) {
    if (since === null) since = f.t;
    if (f.clarity < CLARITY || f.level < LEVEL) {
      recent = [];
      holdStart = null;
      if (heard) {
        heard = false;
        since = f.t;
      }
      if (!retried && f.t - since >= RETRY_MS) {
        retried = true;
        onState({ state: 'retry' });
      }
      return;
    }
    if (heard) return;
    recent.push(f);
    while (recent.length && recent[0].t < f.t - MEDIAN_MS) recent.shift();
    const m = median(recent.map(r => r.midi));
    if (holdStart === null || Math.abs(m - holdMidi) > TOLERANCE) {
      holdStart = f.t;
      holdMidi = m;
      onState({ state: 'hold', midi: Math.round(m) });
    } else if (f.t - holdStart >= HOLD_MS) {
      heard = true;
      onState({ state: 'heard', midi: Math.round(m) });
    }
  }

  return { frame, reset };
}
