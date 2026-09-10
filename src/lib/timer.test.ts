import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectClockJump,
  pause,
  remainingMs,
  reset,
  restore,
  resume,
  start,
  statusOf,
  thresholdOf,
} from "./timer";
import type { TimerState } from "./timer";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const FORTY_FIVE_MINUTES = 45 * MINUTE;
const EXAM_START = new Date("2026-06-11T09:00:00.000Z");

describe("transitions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(EXAM_START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("anchors start exactly at now plus the duration", () => {
    const now = Date.now();
    const state = start(FORTY_FIVE_MINUTES, now);
    expect(state).toEqual({ status: "running", endsAt: now + FORTY_FIVE_MINUTES });
  });

  it("preserves the remaining time when pausing", () => {
    const now = Date.now();
    const running = start(FORTY_FIVE_MINUTES, now);
    vi.advanceTimersByTime(10 * MINUTE);
    const pausedAt = Date.now();
    const paused = pause(running, pausedAt);
    expect(paused).toEqual({ status: "paused", remainingMs: 35 * MINUTE });
    expect(remainingMs(paused, pausedAt)).toBe(remainingMs(running, pausedAt));
  });

  it("keeps the paused remaining time frozen while wall time passes", () => {
    const paused: TimerState = { status: "paused", remainingMs: 35 * MINUTE };
    vi.advanceTimersByTime(2 * HOUR);
    expect(remainingMs(paused, Date.now())).toBe(35 * MINUTE);
  });

  it("re-anchors resume off the new now", () => {
    const paused: TimerState = { status: "paused", remainingMs: 35 * MINUTE };
    vi.advanceTimersByTime(3 * MINUTE);
    const resumedAt = Date.now();
    const running = resume(paused, resumedAt);
    expect(running).toEqual({ status: "running", endsAt: resumedAt + 35 * MINUTE });
    expect(remainingMs(running, resumedAt)).toBe(35 * MINUTE);
  });

  it("returns to idle on reset", () => {
    expect(reset()).toEqual({ status: "idle" });
  });

  it("leaves non-running states untouched when pausing", () => {
    const idle: TimerState = { status: "idle" };
    expect(pause(idle, Date.now())).toBe(idle);
  });

  it("leaves non-paused states untouched when resuming", () => {
    const running = start(FORTY_FIVE_MINUTES, Date.now());
    expect(resume(running, Date.now() + MINUTE)).toBe(running);
  });
});

describe("statusOf", () => {
  const now = 1_760_000_000_000;

  it.each([
    [1, "running"],
    [0, "finished"],
    [-1, "finished"],
  ] as const)("reports %i ms of remaining time as %s", (offset, expected) => {
    expect(statusOf({ status: "running", endsAt: now + offset }, now)).toBe(expected);
  });

  it("reports idle and paused without consulting now", () => {
    expect(statusOf({ status: "idle" }, now)).toBe("idle");
    expect(statusOf({ status: "paused", remainingMs: 0 }, now)).toBe("paused");
  });
});

describe("thresholdOf", () => {
  it.each([
    [600_001, "normal"],
    [600_000, "warning"],
    [300_001, "warning"],
    [300_000, "critical"],
    [1, "critical"],
    [0, "zero"],
  ] as const)("maps %i ms to %s", (ms, expected) => {
    expect(thresholdOf(ms)).toBe(expected);
  });

  it("treats overtime as zero rather than a status", () => {
    expect(thresholdOf(-30_000)).toBe("zero");
  });
});

describe("remainingMs", () => {
  const now = 1_760_000_000_000;
  const overrunning: TimerState = { status: "running", endsAt: now - 90_000 };

  it("clamps at zero by default", () => {
    expect(remainingMs(overrunning, now)).toBe(0);
  });

  it("returns negative time when overtime is allowed", () => {
    expect(remainingMs(overrunning, now, { allowNegative: true })).toBe(-90_000);
  });

  it("reports zero for an idle timer", () => {
    expect(remainingMs({ status: "idle" }, now)).toBe(0);
  });
});

describe("restore", () => {
  const now = 1_760_000_000_000;

  it("reports finished when the end time passed while the page was closed", () => {
    const closedMidComponent: TimerState = { status: "running", endsAt: now - 20 * MINUTE };
    const restored = restore(closedMidComponent, FORTY_FIVE_MINUTES, now);
    expect(restored.clamped).toBe(false);
    expect(restored.state).toEqual(closedMidComponent);
    expect(statusOf(restored.state, now)).toBe("finished");
    expect(remainingMs(restored.state, now)).toBe(0);
  });

  it("restores a paused timer with identical remaining time after two hours", () => {
    const paused: TimerState = { status: "paused", remainingMs: 35 * MINUTE };
    const restored = restore(paused, FORTY_FIVE_MINUTES, now + 2 * HOUR);
    expect(restored.clamped).toBe(false);
    expect(restored.state).toEqual(paused);
    expect(remainingMs(restored.state, now + 2 * HOUR)).toBe(35 * MINUTE);
    expect(statusOf(restored.state, now + 2 * HOUR)).toBe("paused");
  });

  it("clamps a backward clock jump to the component duration and flags it", () => {
    const afterBackwardJump: TimerState = { status: "running", endsAt: now + 3 * HOUR };
    const restored = restore(afterBackwardJump, FORTY_FIVE_MINUTES, now);
    expect(restored.clamped).toBe(true);
    expect(restored.state).toEqual({ status: "running", endsAt: now + FORTY_FIVE_MINUTES });
    expect(remainingMs(restored.state, now)).toBe(FORTY_FIVE_MINUTES);
  });

  it("leaves the same input unclamped when clamping is disabled", () => {
    const afterBackwardJump: TimerState = { status: "running", endsAt: now + 3 * HOUR };
    const restored = restore(afterBackwardJump, FORTY_FIVE_MINUTES, now, { clamp: false });
    expect(restored.clamped).toBe(false);
    expect(restored.state).toEqual(afterBackwardJump);
    expect(remainingMs(restored.state, now)).toBe(3 * HOUR);
  });

  it("does not clamp remaining time equal to the component duration", () => {
    const freshlyStarted: TimerState = { status: "running", endsAt: now + FORTY_FIVE_MINUTES };
    const restored = restore(freshlyStarted, FORTY_FIVE_MINUTES, now);
    expect(restored.clamped).toBe(false);
    expect(restored.state).toEqual(freshlyStarted);
  });

  it("leaves an idle timer alone", () => {
    const idle: TimerState = { status: "idle" };
    expect(restore(idle, FORTY_FIVE_MINUTES, now)).toEqual({ state: idle, clamped: false });
  });
});

describe("detectClockJump", () => {
  const prevDate = 1_760_000_000_000;
  const prevPerf = 5_000;

  it.each([
    ["a steady clock", 250, 250, "none"],
    ["a scheduling hiccup within tolerance", 150, 250, "none"],
    ["a backward NTP step", -30_000, 250, "backward"],
    ["ten minutes of OS sleep", 600_000, 250, "none"],
  ] as const)("reports %s", (_scenario, dateDelta, perfDelta, expected) => {
    expect(
      detectClockJump({
        prevDate,
        prevPerf,
        nowDate: prevDate + dateDelta,
        nowPerf: prevPerf + perfDelta,
      }),
    ).toBe(expected);
  });

  it("never reports a forward discrepancy of any size", () => {
    expect(
      detectClockJump({
        prevDate,
        prevPerf,
        nowDate: prevDate + 24 * HOUR,
        nowPerf: prevPerf,
      }),
    ).toBe("none");
  });
});
