import { CRITICAL_MS, WARNING_MS } from "../config/thresholds";
import { CLOCK_JUMP_TOLERANCE_MS } from "../config/timing";

export type TimerState =
  | { status: "idle" }
  | { status: "running"; endsAt: number }
  | { status: "paused"; remainingMs: number };

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export type Threshold = "normal" | "warning" | "critical" | "zero";

/**
 * What a pair of clock readings tells us about the system clock.
 *
 * - `none`      — wall clock and monotonic clock agree within tolerance.
 * - `stepped`   — they disagree, and we can prove the disagreement is the wall
 *                 clock's fault, so `skewMs` is the exact amount it moved.
 * - `unverified` — they disagree, but we cannot tell whether the wall clock
 *                 moved or real time passed while we were not running.
 */
export type ClockJump =
  | { kind: "none" }
  | { kind: "stepped"; skewMs: number }
  | { kind: "unverified"; skewMs: number };

export type ClockSample = {
  prevDate: number;
  prevPerf: number;
  nowDate: number;
  nowPerf: number;
  /** How long the sampler intended to wait between these two readings. */
  expectedMs: number;
  /** False if the page was hidden or frozen at any point between the readings. */
  pageStayedVisible: boolean;
};

export type RemainingOptions = { allowNegative?: boolean };

export type RestoreOptions = { clamp?: boolean };

export type RestoreResult = {
  state: TimerState;
  clamped: boolean;
};

/**
 * How far the sampler's own interval may stretch or slip and still count as
 * having run on schedule. Outside this band we treat the monotonic reading as
 * untrustworthy rather than guess.
 */
const SAMPLER_EARLY_FACTOR = 0.8;

const SAMPLER_LATE_FACTOR = 1.5;

const signedRemainingMs = (state: TimerState, now: number): number => {
  switch (state.status) {
    case "idle":
      return 0;
    case "running":
      return state.endsAt - now;
    case "paused":
      return state.remainingMs;
  }
};

export const remainingMs = (
  state: TimerState,
  now: number,
  { allowNegative = false }: RemainingOptions = {},
): number => {
  const signedRemaining = signedRemainingMs(state, now);
  return allowNegative ? signedRemaining : Math.max(0, signedRemaining);
};

export const statusOf = (state: TimerState, now: number): TimerStatus => {
  switch (state.status) {
    case "idle":
      return "idle";
    case "paused":
      return "paused";
    case "running":
      return state.endsAt <= now ? "finished" : "running";
  }
};

export const thresholdOf = (ms: number): Threshold => {
  if (ms <= 0) {
    return "zero";
  }
  if (ms <= CRITICAL_MS) {
    return "critical";
  }
  if (ms <= WARNING_MS) {
    return "warning";
  }
  return "normal";
};

export const start = (durationMs: number, now: number): TimerState => ({
  status: "running",
  endsAt: now + durationMs,
});

export const pause = (state: TimerState, now: number): TimerState =>
  state.status === "running"
    ? { status: "paused", remainingMs: Math.max(0, state.endsAt - now) }
    : state;

export const resume = (state: TimerState, now: number): TimerState =>
  state.status === "paused" ? { status: "running", endsAt: now + state.remainingMs } : state;

export const reset = (): TimerState => ({ status: "idle" });

/**
 * Add (or remove) time on a timer that is already under way, keeping the time
 * already served. Used when an invigilator grants extra time mid-component.
 */
export const extend = (state: TimerState, deltaMs: number): TimerState => {
  switch (state.status) {
    case "idle":
      return state;
    case "running":
      return { status: "running", endsAt: state.endsAt + deltaMs };
    case "paused":
      return { status: "paused", remainingMs: Math.max(0, state.remainingMs + deltaMs) };
  }
};

/**
 * Move a running deadline into a wall clock that has just shifted by `skewMs`,
 * so the time remaining is exactly what it was before the shift. Paused timers
 * hold a duration rather than an instant, so the wall clock cannot affect them.
 */
export const reanchor = (state: TimerState, skewMs: number): TimerState =>
  state.status === "running" ? { status: "running", endsAt: state.endsAt + skewMs } : state;

export const restore = (
  state: TimerState,
  durationMs: number,
  now: number,
  { clamp = true }: RestoreOptions = {},
): RestoreResult => {
  if (state.status !== "running") {
    return { state, clamped: false };
  }
  const remainingExceedsWholeComponent = state.endsAt - now > durationMs;
  if (clamp && remainingExceedsWholeComponent) {
    return { state: { status: "running", endsAt: now + durationMs }, clamped: true };
  }
  return { state, clamped: false };
};

/**
 * Compare a wall-clock reading against a monotonic one to see whether the
 * system clock moved underneath a running exam.
 *
 * The two readings disagreeing is not by itself evidence that the wall clock is
 * at fault: an OS suspend produces the same signature, because the monotonic
 * clock may stop while real time keeps passing. Telling them apart matters,
 * because the corrections are opposites — a stepped clock must be compensated
 * for, whereas time spent asleep is time the candidate really did use up.
 *
 * We distinguish them by asking whether our own sampler kept running. If the
 * interval fired roughly on schedule and the page never went hidden, then the
 * process was alive throughout, the monotonic reading is the true elapsed time,
 * and any difference is the wall clock's doing. Otherwise we admit we cannot
 * tell, and leave the decision to the invigilator.
 *
 * Note this deliberately does not depend on whether `performance.now()`
 * advances across OS sleep, which varies by platform: if it does not advance we
 * see an off-schedule sampler and report `unverified`; if it does advance the
 * two clocks agree and we report `none`. Both are correct.
 */
export const classifyClockJump = ({
  prevDate,
  prevPerf,
  nowDate,
  nowPerf,
  expectedMs,
  pageStayedVisible,
}: ClockSample): ClockJump => {
  const wallClockElapsed = nowDate - prevDate;
  const monotonicElapsed = nowPerf - prevPerf;
  const skewMs = wallClockElapsed - monotonicElapsed;
  if (Math.abs(skewMs) <= CLOCK_JUMP_TOLERANCE_MS) {
    return { kind: "none" };
  }
  const samplerRanOnSchedule =
    monotonicElapsed >= expectedMs * SAMPLER_EARLY_FACTOR &&
    monotonicElapsed <= expectedMs * SAMPLER_LATE_FACTOR;
  return samplerRanOnSchedule && pageStayedVisible
    ? { kind: "stepped", skewMs }
    : { kind: "unverified", skewMs };
};
