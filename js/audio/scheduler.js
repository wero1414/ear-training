// Lookahead note scheduling: a timer polls every POLL_MS and schedules every event that
// falls inside the next LOOKAHEAD_S at absolute AudioContext times. The timer only
// decides when to schedule; the audio clock decides when things sound, which is what
// keeps timing steady when the timer itself is late.
export const POLL_MS = 25;
export const LOOKAHEAD_S = 0.25;

export const startPolling = tick => setInterval(tick, POLL_MS);
export const stopPolling = id => clearInterval(id);
