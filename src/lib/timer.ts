import { CRITICAL_MS, WARNING_MS } from "../config/thresholds";
import { CLOCK_JUMP_TOLERANCE_MS } from "../config/timing";

export type TimerState =
  | { status: "idle" }
  | { status: "running"; endsAt: number }
  | { status: "paused"; remainingMs: number };

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export type Threshold = "normal" | "warning" | "critical" | "zero";

export type ClockJump = "none" | "backward";

export type ClockSample = {
  prevDate: number;
  prevPerf: number;
  nowDate: number;
  nowPerf: number;
};

export type RemainingOptions = { allowNegative?: boolean };

export type RestoreOptions = { clamp?: boolean };

export type RestoreResult = {
  state: TimerState;
  clamped: boolean;
};

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
  state.status === "running" ? { status: "paused", remainingMs: state.endsAt - now } : state;

export const resume = (state: TimerState, now: number): TimerState =>
  state.status === "paused" ? { status: "running", endsAt: now + state.remainingMs } : state;

export const reset = (): TimerState => ({ status: "idle" });

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

export const detectClockJump = ({
  prevDate,
  prevPerf,
  nowDate,
  nowPerf,
}: ClockSample): ClockJump => {
  const wallClockElapsed = nowDate - prevDate;
  const monotonicElapsed = nowPerf - prevPerf;
  const wallClockFellBehindMonotonic = wallClockElapsed < monotonicElapsed - CLOCK_JUMP_TOLERANCE_MS;
  return wallClockFellBehindMonotonic ? "backward" : "none";
};
