---
name: web-audio-engine
description: Use when writing or changing anything in js/audio/ or js/jam/ — synthesis, scheduling, transport, the audio graph, or browser audio workarounds. Covers the instrument designs already in use, scheduling rules, and the iOS failure modes.
---

# Web Audio engine

## Graph

```
voice gain ──┬─> bus ──> DynamicsCompressor (limiter) ──> destination
             └─> send ──> ConvolverNode (synthetic IR) ──> bus
```

The compressor is a safety limiter, not an effect: `threshold -11 dB, knee 20, ratio 8,
attack 3 ms, release 250 ms`. Without it a 6-note stack at full volume clips on mobile.

The reverb impulse is generated, never loaded: stereo noise shaped by `(1 - t)^decay` over
2.2 s with a 12 ms fade-in. Regenerate it only if the sample rate changes.

Per-voice gain is `volume^1.7`. The exponent approximates perceived loudness; a linear
slider feels wrong at the bottom of its range.

## Instruments

All synthesised. Do not add sample loading.

- **rhodes** — 2-operator FM, carrier:modulator 1:1, index 3.4 decaying to 0.12 over
  500 ms, plus a second operator at ratio 7.02 with a 90 ms index decay for the tine
  attack. This is the default and the one users judge the app by.
- **marimba** — FM at ratio 3.96 (deliberately inharmonic), index collapsing in 70 ms,
  short amplitude decay.
- **pluck** — Karplus-Strong. Noise-excited delay line of length `round(sampleRate / f)`,
  two-tap averaging filter, damping `0.9965 - min(0.004, f / 40000)` so high notes do not
  ring forever. Rendered offline into an `AudioBuffer` and cached by `(frequency, duration)`.
  Cache is cleared when A4 changes; it must be, or the app stays out of tune.
- **organ / sine** — additive sines with a sustain segment.
- **bass** — FM ratio 1, low index, long decay. Jam only.
- **drums** — kick is a sine sweeping 140 → 45 Hz in 90 ms; hat is highpassed noise at
  7 kHz with a 50 ms decay.

## Scheduling

Two clocks, never mixed:

- **Note scheduling.** A `setInterval` at 25 ms that schedules every event falling inside
  the next 250 ms, at absolute `AudioContext.currentTime` offsets. This is the standard
  lookahead pattern and it is the only thing that survives a backgrounded tab.
- **UI animation.** A `requestAnimationFrame` loop that reads `AudioContext.currentTime`
  and advances a queue of scheduled visual events. Never `setTimeout` for anything the
  user sees in time with audio: it drifts under Low Power Mode, and on iOS it stops
  entirely when the tab is hidden while audio keeps playing, so the highlight ends up bars
  behind.

## Gotchas that have already cost time

- `exponentialRampToValueAtTime` cannot target 0 and silently does nothing from 0. Start
  and end envelopes at `0.0001`.
- Every `OscillatorNode` and `AudioBufferSourceNode` is single-use and needs an explicit
  `stop(t)`. Nodes without a stop time are never collected.
- `AudioContext` starts suspended and only resumes inside a user gesture. It can also
  enter `interrupted` on iOS after a call or Siri, which is not `suspended` and needs
  `resume()` on `visibilitychange`.
- iOS Safari routes Web Audio to the **ringer** channel, so the hardware mute switch
  silences the app. The fix is to start a silent looping `<audio>` element on the same
  user gesture, which moves output to the media channel. It looks like dead code. It is not.
- Creating a second `AudioContext` on iOS often yields a dead one. There is exactly one.

## Testing synthesis

Render through `OfflineAudioContext` in a browser test:

1. Render 1 s of a known MIDI note per instrument.
2. FFT the buffer, assert the dominant bin is within 3 cents of
   `A4 * 2^((midi - 69) / 12)`.
3. Assert peak sample magnitude stays below 1.0 for a 6-note stack at maximum volume.
4. Assert the buffer is not silent, which catches envelope regressions that the frequency
   assertion passes.
