// Backing loop: expands the preset into bars and schedules each bar ahead of time on the
// audio clock.
import { S } from '../state/store.js';
import { el, rnd } from '../util.js';
import { t } from '../i18n/index.js';
import { chordMidis } from '../theory/chords.js';
import { JAMP } from '../theory/harmony.js';
import { ac, audio } from '../audio/context.js';
import { hat, kick, playNote, playStack } from '../audio/instruments.js';
import { LOOKAHEAD_S, startPolling, stopPolling } from '../audio/scheduler.js';
import { highlightBar } from '../ui/jam-view.js';

export const jam = { on: false, pos: 0, next: 0, timer: null, bars: [] };

// One entry per bar; `first` marks the first bar of a chord that lasts several.
export function jamBars() {
  const p = JAMP[S.jamPreset],
    out = [];
  p.c.forEach(([s, q, b]) => {
    for (let i = 0; i < b; i++) out.push({ s, q, first: i === 0 });
  });
  return out;
}

function jamChordMidis(s, q) {
  const root = 48 + ((S.jamKey + s) % 12);
  return chordMidis(root, q, rnd(2));
}

export function jamStart() {
  audio();
  jam.bars = jamBars();
  jam.on = true;
  jam.pos = 0;
  jam.next = ac.currentTime + 0.15;
  jam.timer = startPolling(jamTick);
  const b = el('jamBtn');
  if (b) b.textContent = t('jam.stop');
}

export function jamStop() {
  jam.on = false;
  stopPolling(jam.timer);
  jam.timer = null;
  const b = el('jamBtn');
  if (b) b.textContent = t('jam.play');
  document.querySelectorAll('.bar').forEach(x => x.classList.remove('on'));
}

function jamTick() {
  if (!jam.on) return;
  const spb = 60 / S.jamBpm,
    barLen = spb * 4;
  while (jam.next < ac.currentTime + LOOKAHEAD_S) {
    scheduleBar(jam.pos, jam.next);
    const idx = jam.pos,
      at = (jam.next - ac.currentTime) * 1000;
    // Known drift: the highlight rides setTimeout, not the audio clock (Phase 1 item 4).
    setTimeout(
      () => {
        if (jam.on) highlightBar(idx);
      },
      Math.max(0, at),
    );
    jam.next += barLen;
    jam.pos = (jam.pos + 1) % jam.bars.length;
  }
}

// Chord on beat 1 and a shorter restrike on the "and" of 3; bass on 1 and 3 with a
// fifth pickup; eighth-note hats and kick on 1 and 3.
function scheduleBar(i, time) {
  const spb = 60 / S.jamBpm,
    b = jam.bars[i],
    off = time - ac.currentTime;
  const mids = jamChordMidis(b.s, b.q);
  const root = 36 + ((S.jamKey + b.s) % 12);
  playStack(mids, off, spb * 1.7, 'rhodes', false, 0.5);
  playStack(mids, off + spb * 2.5, spb * 1.1, 'rhodes', false, 0.34);
  if (S.jamBass) {
    playNote(root, off, spb * 0.85, 'bass', 0.75);
    playNote(root, off + spb * 2, spb * 0.85, 'bass', 0.6);
    playNote(root + 7, off + spb * 3.5, spb * 0.4, 'bass', 0.45);
  }
  if (S.jamDrums) {
    for (let k = 0; k < 8; k++) hat(off + spb * k * 0.5, k % 2 ? 0.5 : 0.85);
    kick(off);
    kick(off + spb * 2);
  }
}
