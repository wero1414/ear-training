// Two clocks, never mixed.
//
// Notes: a timer polls every POLL_MS and schedules every event that falls inside the
// next LOOKAHEAD_S at absolute AudioContext times. The timer only decides when to
// schedule; the audio clock decides when things sound, so a late timer costs nothing.
//
// Visuals: anything that must line up with what is heard goes into a visual queue keyed
// by AudioContext time, drained from requestAnimationFrame. setTimeout drifts under iOS
// Low Power Mode and stops in hidden tabs while audio keeps playing; rAF also stops
// when hidden, but on return the queue catches up to the audio clock instead of
// replaying stale timers.
import { ac } from './context.js';

export const POLL_MS = 25;
export const LOOKAHEAD_S = 0.25;

export const startPolling = tick => setInterval(tick, POLL_MS);
export const stopPolling = id => clearInterval(id);

export function createVisualQueue() {
  let events = [];
  return {
    at(time, fn) {
      events.push({ time, fn });
      events.sort((a, b) => a.time - b.time);
    },
    flush(now) {
      while (events.length && events[0].time <= now) events.shift().fn();
    },
    clear() {
      events = [];
    },
    size: () => events.length,
  };
}

// The context time of the sample the listener hears right now. currentTime runs ahead
// of the speaker by the output latency (tens of ms on Bluetooth); getOutputTimestamp()
// reports the time actually at the output, where the browser supports it.
function heardTime() {
  const ts = ac.getOutputTimestamp ? ac.getOutputTimestamp() : null;
  return ts && ts.contextTime > 0 ? ts.contextTime : ac.currentTime;
}

const visuals = createVisualQueue();
let frame = 0;

function drain() {
  frame = 0;
  if (!ac) return;
  visuals.flush(heardTime());
  if (visuals.size()) frame = requestAnimationFrame(drain);
}

// Run fn when the audio scheduled at AudioContext time `time` is being heard.
export function atAudioTime(time, fn) {
  visuals.at(time, fn);
  if (!frame) frame = requestAnimationFrame(drain);
}

export function clearVisuals() {
  visuals.clear();
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}
