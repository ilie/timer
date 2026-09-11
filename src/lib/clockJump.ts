import { CLOCK_JUMP_TOLERANCE_MS } from "../config/timing";

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

/**
 * How far the sampler's own interval may stretch or slip and still count as
 * having run on schedule. Outside this band we treat the monotonic reading as
 * untrustworthy rather than guess.
 */
const SAMPLER_EARLY_FACTOR = 0.8;

const SAMPLER_LATE_FACTOR = 1.5;

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
