import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyClockJump } from "./clockJump";
import {
  extend,
  pause,
  reanchor,
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

describe("classifyClockJump", () => {
  const prevDate = 1_760_000_000_000;
  const prevPerf = 5_000;
  const SAMPLE_MS = 5_000;

  const classify = (
    dateDelta: number,
    perfDelta: number,
    pageStayedVisible = true,
  ): ReturnType<typeof classifyClockJump> =>
    classifyClockJump({
      prevDate,
      prevPerf,
      nowDate: prevDate + dateDelta,
      nowPerf: prevPerf + perfDelta,
      expectedMs: SAMPLE_MS,
      pageStayedVisible,
    });

  it("reports a steady clock", () => {
    expect(classify(SAMPLE_MS, SAMPLE_MS)).toEqual({ kind: "none" });
  });

  it("reports a scheduling hiccup within tolerance", () => {
    expect(classify(SAMPLE_MS - 1_900, SAMPLE_MS)).toEqual({ kind: "none" });
  });

  it("measures a backward step taken while the sampler kept running", () => {
    expect(classify(SAMPLE_MS - 30_000, SAMPLE_MS)).toEqual({
      kind: "stepped",
      skewMs: -30_000,
    });
  });

  it("measures a forward step taken while the sampler kept running", () => {
    expect(classify(SAMPLE_MS + 30_000, SAMPLE_MS)).toEqual({
      kind: "stepped",
      skewMs: 30_000,
    });
  });

  // The signature of OS sleep is identical to a forward clock step, so the only
  // safe reading is that we cannot tell. Adjusting on this would hand candidates
  // back the time the machine spent asleep.
  it("refuses to call ten minutes of OS sleep a clock step", () => {
    expect(classify(600_000, 0)).toEqual({ kind: "unverified", skewMs: 600_000 });
  });

  it("refuses to judge a gap where the page was hidden", () => {
    expect(classify(SAMPLE_MS + 30_000, SAMPLE_MS, false)).toEqual({
      kind: "unverified",
      skewMs: 30_000,
    });
  });

  it("refuses to judge a gap where the sampler ran far behind schedule", () => {
    expect(classify(90_000, 60_000)).toEqual({ kind: "unverified", skewMs: 30_000 });
  });
});

describe("reanchor", () => {
  const endsAt = EXAM_START.getTime() + FORTY_FIVE_MINUTES;

  it("carries a running deadline with the clock so the remaining time holds", () => {
    const running: TimerState = { status: "running", endsAt };
    const beforeStep = remainingMs(running, EXAM_START.getTime());
    const stepped = reanchor(running, -HOUR);

    expect(remainingMs(stepped, EXAM_START.getTime() - HOUR)).toBe(beforeStep);
  });

  it("leaves a paused timer alone, since it holds a duration not an instant", () => {
    const paused: TimerState = { status: "paused", remainingMs: FORTY_FIVE_MINUTES };
    expect(reanchor(paused, -HOUR)).toBe(paused);
  });

  it("leaves an idle timer alone", () => {
    const idle: TimerState = { status: "idle" };
    expect(reanchor(idle, HOUR)).toBe(idle);
  });
});

describe("extend", () => {
  it("adds time to a running timer without losing the time already served", () => {
    const running: TimerState = { status: "running", endsAt: EXAM_START.getTime() + 35 * MINUTE };
    const extended = extend(running, 25 * MINUTE);

    expect(remainingMs(extended, EXAM_START.getTime())).toBe(60 * MINUTE);
  });

  it("adds time to a paused timer", () => {
    const paused: TimerState = { status: "paused", remainingMs: 10 * MINUTE };
    expect(extend(paused, 5 * MINUTE)).toEqual({ status: "paused", remainingMs: 15 * MINUTE });
  });

  it("never leaves a paused timer owing negative time", () => {
    const paused: TimerState = { status: "paused", remainingMs: 5 * MINUTE };
    expect(extend(paused, -10 * MINUTE)).toEqual({ status: "paused", remainingMs: 0 });
  });

  it("leaves an idle timer alone", () => {
    const idle: TimerState = { status: "idle" };
    expect(extend(idle, 25 * MINUTE)).toBe(idle);
  });
});

describe("a session that spans the Spanish DST transition", () => {
  // At 03:00 CEST on 25 October 2026 Spain puts its clocks back to 02:00 CET.
  const TRANSITION_UTC = Date.parse("2026-10-25T01:00:00.000Z");
  const localTime = (instant: number): string =>
    new Date(instant).toLocaleTimeString("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  it("measures real elapsed time, not the movement of the local clock", () => {
    const startedAt = TRANSITION_UTC - 30 * MINUTE;
    const running = start(75 * MINUTE, startedAt);

    // The local clock goes back an hour part way through, so it reads only
    // fifteen minutes later at the end of a seventy-five minute paper.
    expect(localTime(startedAt)).toBe("02:30");
    expect(localTime(startedAt + 75 * MINUTE)).toBe("02:45");

    // The countdown is unmoved by that: it still runs the full duration.
    expect(remainingMs(running, startedAt)).toBe(75 * MINUTE);
    expect(remainingMs(running, startedAt + 30 * MINUTE)).toBe(45 * MINUTE);
    expect(remainingMs(running, startedAt + 75 * MINUTE)).toBe(0);
    expect(statusOf(running, startedAt + 75 * MINUTE)).toBe("finished");
  });

  it("survives a reload part way through the transition", () => {
    const startedAt = TRANSITION_UTC - 30 * MINUTE;
    const running = start(75 * MINUTE, startedAt);
    const reloadedAt = TRANSITION_UTC + 30 * MINUTE;

    // A reload re-derives from the stored absolute instant, so the hour the
    // local clock gave back does not become an hour of extra exam time.
    const restored = restore(running, 75 * MINUTE, reloadedAt);

    expect(restored.clamped).toBe(false);
    expect(remainingMs(restored.state, reloadedAt)).toBe(15 * MINUTE);
  });
});
