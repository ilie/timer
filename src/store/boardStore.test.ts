import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "../config/storage";
import { remainingMs, statusOf } from "../lib/timer";
import {
  addSession,
  advanceComponent,
  applyClockStep,
  getSnapshot,
  hydrateFromStorage,
  moveSession,
  pauseSession,
  removeSession,
  sessionDurationMs,
  setCentreNumber,
  setClockJumpDetected,
  setSessionConfig,
  startSession,
  subscribe,
} from "./boardStore";
import type { Session } from "./boardStore";

const EXAM_START = new Date("2026-06-11T09:00:00.000Z");
const READING_MS = 75 * 60_000;
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

const idleSession = {
  id: "reading",
  examName: "B2 First",
  partIndex: 0,
  mode: "paper",
  extraMinutes: 0,
  timer: { status: "idle" },
};

const storedBoard = (
  sessions: readonly unknown[],
  breakTimer: unknown = { status: "idle" },
): string =>
  JSON.stringify({
    centreNumber: "ES432",
    sessions,
    break: { timer: breakTimer, minutes: 15 },
  });

const seed = (sessions: readonly unknown[], breakTimer?: unknown): void => {
  localStorage.setItem(STORAGE_KEY, storedBoard(sessions, breakTimer));
  hydrateFromStorage();
};

const timerOf = (id: string) => getSnapshot().sessions.find((session) => session.id === id)?.timer;

const sessionOf = (id: string) => getSnapshot().sessions.find((session) => session.id === id);

const endsAtOf = (id: string): number | undefined => {
  const timer = timerOf(id);
  return timer?.status === "running" ? timer.endsAt : undefined;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(EXAM_START);
  localStorage.clear();
  setClockJumpDetected(false);
  hydrateFromStorage();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("snapshot identity", () => {
  it("returns the same reference while nothing changes", () => {
    seed([idleSession]);
    expect(Object.is(getSnapshot(), getSnapshot())).toBe(true);
    vi.advanceTimersByTime(30_000);
    expect(Object.is(getSnapshot(), getSnapshot())).toBe(true);
  });

  it("replaces the reference and notifies once on a transition", () => {
    seed([idleSession]);
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    const before = getSnapshot();

    startSession("reading");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(Object.is(before, getSnapshot())).toBe(false);
    expect(timerOf("reading")).toEqual({ status: "running", endsAt: Date.now() + READING_MS });
    unsubscribe();
  });

  it("ignores a transition that changes nothing", () => {
    seed([idleSession]);
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    const before = getSnapshot();

    pauseSession("reading");

    expect(listener).not.toHaveBeenCalled();
    expect(Object.is(before, getSnapshot())).toBe(true);
    unsubscribe();
  });
});

describe("expiry timer", () => {
  it("notifies once at the end time and not before, with a fresh reference", () => {
    seed([idleSession]);
    startSession("reading");
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    const before = getSnapshot();

    vi.advanceTimersByTime(READING_MS - 1);
    expect(listener).not.toHaveBeenCalled();
    expect(Object.is(before, getSnapshot())).toBe(true);

    vi.advanceTimersByTime(1);
    expect(listener).toHaveBeenCalledTimes(1);
    const after = getSnapshot();
    expect(Object.is(before, after)).toBe(false);
    expect(statusOf(after.sessions[0]?.timer ?? { status: "idle" }, Date.now())).toBe("finished");

    vi.advanceTimersByTime(10 * 60_000);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("wakes at the earliest end time across sessions", () => {
    seed([idleSession, { ...idleSession, id: "listening", partIndex: 2 }]);
    startSession("reading");
    startSession("listening");
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    vi.advanceTimersByTime(40 * 60_000);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(statusOf(timerOf("listening") ?? { status: "idle" }, Date.now())).toBe("finished");
    expect(statusOf(timerOf("reading") ?? { status: "idle" }, Date.now())).toBe("running");
    unsubscribe();
  });
});

describe("persistence", () => {
  it("writes on a transition, never on hydration, expiry or the passage of time", () => {
    localStorage.setItem(STORAGE_KEY, storedBoard([idleSession]));
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    hydrateFromStorage();
    expect(setItem).not.toHaveBeenCalled();

    startSession("reading");
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem.mock.calls[0]?.[0]).toBe(STORAGE_KEY);

    vi.advanceTimersByTime(READING_MS);
    getSnapshot();
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("persists the whole board, not only the timers", () => {
    seed([idleSession]);
    startSession("reading");

    const written: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    expect(written).toEqual({
      centreNumber: "ES432",
      sessions: [{ ...idleSession, timer: { status: "running", endsAt: Date.now() + READING_MS } }],
      break: { timer: { status: "idle" }, minutes: 15 },
    });
  });

  it("keeps the revision counter out of the stored payload", () => {
    seed([idleSession]);
    startSession("reading");

    const written: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    expect(written).not.toHaveProperty("revision");
  });

  it("flags a failing write instead of crashing", () => {
    seed([idleSession]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    expect(() => {
      startSession("reading");
    }).not.toThrow();

    expect(getSnapshot().persistFailed).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(statusOf(timerOf("reading") ?? { status: "idle" }, Date.now())).toBe("running");
    unsubscribe();
  });
});

describe("restore", () => {
  it("resumes a running timer against a single clock sample", () => {
    const endsAt = EXAM_START.getTime() + 20 * 60_000;
    seed([{ ...idleSession, timer: { status: "running", endsAt } }]);

    expect(timerOf("reading")).toEqual({ status: "running", endsAt });
    expect(getSnapshot().restoreDiscarded).toBe(false);
  });

  it("clamps a timer that outlives its component and raises the clock-jump flag", () => {
    const endsAt = EXAM_START.getTime() + 5 * 60 * 60_000;
    seed([{ ...idleSession, timer: { status: "running", endsAt } }]);

    expect(timerOf("reading")).toEqual({
      status: "running",
      endsAt: EXAM_START.getTime() + READING_MS,
    });
    expect(getSnapshot().clockJumpDetected).toBe(true);
  });

  it("keeps a paused session that fits inside its component", () => {
    seed([{ ...idleSession, timer: { status: "paused", remainingMs: READING_MS } }]);

    expect(timerOf("reading")).toEqual({ status: "paused", remainingMs: READING_MS });
    expect(getSnapshot().restoreDiscarded).toBe(false);
  });

  it("keeps a break that has run into overtime", () => {
    const endsAt = EXAM_START.getTime() - 3 * 60_000;
    seed([idleSession], { status: "running", endsAt });

    expect(getSnapshot().break.timer).toEqual({ status: "running", endsAt });
    expect(getSnapshot().restoreDiscarded).toBe(false);
  });

  it("clamps a far-future expiry instead of scheduling an overflowing timeout", () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const endsAt = EXAM_START.getTime() + 60 * 24 * 60 * 60_000;

    seed([idleSession], { status: "running", endsAt });

    const scheduledDelays = setTimeoutSpy.mock.calls.map(([, delay]) => delay ?? 0);
    expect(Math.max(...scheduledDelays)).toBe(MAX_TIMEOUT_DELAY_MS);

    setTimeoutSpy.mockClear();
    vi.advanceTimersByTime(MAX_TIMEOUT_DELAY_MS);

    expect(setTimeoutSpy.mock.calls.map(([, delay]) => delay)).toEqual([MAX_TIMEOUT_DELAY_MS]);
    expect(getSnapshot().break.timer).toEqual({ status: "running", endsAt });
  });

  it("starts clean without flagging a discard when nothing was stored", () => {
    localStorage.clear();

    expect(() => {
      hydrateFromStorage();
    }).not.toThrow();

    expect(getSnapshot().sessions).toEqual([]);
    expect(getSnapshot().restoreDiscarded).toBe(false);
  });

  it.each([
    ["unparseable json", "{ not json"],
    ["a payload that is not an object", '"a board"'],
    ["a board without sessions", JSON.stringify({ centreNumber: "ES432" })],
    ["a session missing its timer", storedBoard([{ ...idleSession, timer: undefined }])],
    ["a session with an unknown mode", storedBoard([{ ...idleSession, mode: "spoken" }])],
    ["a session with an unknown exam", storedBoard([{ ...idleSession, examName: "B9 Mastery" }])],
    ["a session with an out-of-range part", storedBoard([{ ...idleSession, partIndex: 9 }])],
    ["more sessions than the board allows", storedBoard(Array(5).fill(idleSession))],
    [
      "a paused session holding more time than its component allows",
      storedBoard([{ ...idleSession, timer: { status: "paused", remainingMs: 999_999_999 } }]),
    ],
    [
      "a paused break holding more time than the break allows",
      storedBoard([idleSession], { status: "paused", remainingMs: 999_999_999 }),
    ],
  ])("discards %s and reports it", (_scenario, payload) => {
    localStorage.setItem(STORAGE_KEY, payload);

    expect(() => {
      hydrateFromStorage();
    }).not.toThrow();

    expect(getSnapshot().sessions).toEqual([]);
    expect(getSnapshot().restoreDiscarded).toBe(true);
  });
});

describe("cross-tab sync", () => {
  it("adopts a board written by another tab", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    const before = getSnapshot();

    localStorage.setItem(STORAGE_KEY, storedBoard([idleSession]));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(Object.is(before, getSnapshot())).toBe(false);
    expect(getSnapshot().sessions).toHaveLength(1);
    unsubscribe();
  });

  it("keeps a raised clock-jump warning while adopting that board", () => {
    seed([idleSession]);
    const unsubscribe = subscribe(vi.fn());
    setClockJumpDetected(true);

    localStorage.setItem(STORAGE_KEY, storedBoard([{ ...idleSession, id: "writing" }]));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));

    expect(getSnapshot().sessions.map((session) => session.id)).toEqual(["writing"]);
    expect(getSnapshot().clockJumpDetected).toBe(true);
    unsubscribe();
  });

  it("keeps a persistence failure visible while adopting that board", () => {
    seed([idleSession]);
    const unsubscribe = subscribe(vi.fn());
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });

    startSession("reading");
    expect(getSnapshot().persistFailed).toBe(true);

    setItem.mockRestore();
    localStorage.setItem(STORAGE_KEY, storedBoard([idleSession]));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));

    expect(getSnapshot().persistFailed).toBe(true);
    unsubscribe();
  });

  it("ignores writes to other keys", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe("clock jump flag", () => {
  it("is board level and changes the snapshot once", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    setClockJumpDetected(true);
    setClockJumpDetected(true);

    expect(getSnapshot().clockJumpDetected).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});

describe("session lifecycle", () => {
  it("refuses a fifth session and leaves the four already on the board", () => {
    seed([
      { ...idleSession, id: "one" },
      { ...idleSession, id: "two" },
      { ...idleSession, id: "three" },
      { ...idleSession, id: "four" },
    ]);
    const before = getSnapshot();

    addSession({ examName: "B2 First", partIndex: 0, mode: "paper", extraMinutes: 0 });

    expect(getSnapshot().sessions).toHaveLength(4);
    expect(Object.is(before, getSnapshot())).toBe(true);
  });

  it("adds sessions up to the cap with distinct ids and the chosen configuration", () => {
    addSession({ examName: "B2 First", partIndex: 1, mode: "paper", extraMinutes: 0 });
    addSession({ examName: "Linguaskill General", partIndex: 0, mode: "digital", extraMinutes: 15 });

    const ids = getSnapshot().sessions.map((session) => session.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(getSnapshot().sessions.map((session) => session.examName)).toEqual([
      "B2 First",
      "Linguaskill General",
    ]);
    expect(getSnapshot().sessions[1]).toMatchObject({
      partIndex: 0,
      mode: "digital",
      extraMinutes: 15,
    });
  });

  it("keeps a running countdown when the very same configuration is saved again", () => {
    seed([idleSession]);
    startSession("reading");
    const running = sessionOf("reading")?.timer;

    setSessionConfig("reading", {
      examName: "B2 First",
      partIndex: 0,
      mode: "paper",
      extraMinutes: 0,
    });

    expect(sessionOf("reading")?.timer).toEqual(running);
  });

  it("persists an edited centre number and leaves the sessions alone", () => {
    seed([idleSession]);

    setCentreNumber("ES999");

    expect(getSnapshot().centreNumber).toBe("ES999");
    expect(getSnapshot().sessions).toHaveLength(1);

    hydrateFromStorage();

    expect(getSnapshot().centreNumber).toBe("ES999");
  });

  it("leaves the other sessions' end times untouched when one is removed", () => {
    seed([idleSession, { ...idleSession, id: "writing", partIndex: 1 }]);
    startSession("reading");
    startSession("writing");
    const readingEndsAt = endsAtOf("reading");

    removeSession("writing");

    expect(getSnapshot().sessions.map((session) => session.id)).toEqual(["reading"]);
    expect(endsAtOf("reading")).toBe(readingEndsAt);
  });

  it("leaves a running countdown alone when start is pressed again", () => {
    seed([idleSession]);
    startSession("reading");
    const startedEndsAt = endsAtOf("reading");
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    vi.advanceTimersByTime(30 * 60_000);
    startSession("reading");

    expect(endsAtOf("reading")).toBe(startedEndsAt);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("re-seeds a session from its new configuration", () => {
    seed([idleSession]);

    setSessionConfig("reading", {
      examName: "C1 Advanced",
      partIndex: 1,
      mode: "digital",
      extraMinutes: 10,
    });

    expect(sessionOf("reading")).toEqual({
      id: "reading",
      examName: "C1 Advanced",
      partIndex: 1,
      mode: "digital",
      extraMinutes: 10,
      timer: { status: "idle" },
    });
  });
});

describe("advancing to the next component", () => {
  it("returns the session to idle with the next component's duration", () => {
    seed([idleSession]);
    startSession("reading");

    advanceComponent("reading");

    expect(sessionOf("reading")?.partIndex).toBe(1);
    expect(timerOf("reading")).toEqual({ status: "idle" });

    startSession("reading");
    expect(timerOf("reading")).toEqual({ status: "running", endsAt: Date.now() + 80 * 60_000 });
  });

  it("does nothing on the last component of an exam", () => {
    seed([{ ...idleSession, partIndex: 2 }]);
    startSession("reading");
    const before = getSnapshot();

    advanceComponent("reading");

    expect(sessionOf("reading")?.partIndex).toBe(2);
    expect(Object.is(before, getSnapshot())).toBe(true);
  });
});

describe("session duration", () => {
  const readingSession = (overrides: Partial<Session>): Session => ({
    id: "reading",
    examName: "B2 First",
    partIndex: 0,
    mode: "paper",
    extraMinutes: 0,
    timer: { status: "idle" },
    ...overrides,
  });

  it("adds the extra minutes to the component's own minutes", () => {
    expect(sessionDurationMs(readingSession({ extraMinutes: 19 }))).toBe((75 + 19) * 60_000);
  });

  it("is zero for a session whose component no longer exists", () => {
    expect(sessionDurationMs(readingSession({ partIndex: 9 }))).toBe(0);
  });
});

const readingConfig = {
  examName: "B2 First",
  partIndex: 0,
  mode: "paper",
  extraMinutes: 0,
} as const;

const remainingOf = (id: string): number => {
  const timer = timerOf(id);
  if (timer === undefined) {
    throw new Error(`No session ${id}`);
  }
  return remainingMs(timer, Date.now());
};

describe("granting extra time part way through a component", () => {
  it("adds the time to a running session instead of restarting it", () => {
    seed([idleSession]);
    startSession("reading");
    vi.advanceTimersByTime(40 * 60_000);

    setSessionConfig("reading", { ...readingConfig, extraMinutes: 25 });

    // 35 minutes were left of the 75; the extra 25 make 60. Restarting would show 100.
    expect(remainingOf("reading")).toBe(60 * 60_000);
    expect(statusOf(timerOf("reading")!, Date.now())).toBe("running");
  });

  it("adds the time to a paused session", () => {
    seed([idleSession]);
    startSession("reading");
    vi.advanceTimersByTime(40 * 60_000);
    pauseSession("reading");

    setSessionConfig("reading", { ...readingConfig, extraMinutes: 25 });

    expect(remainingOf("reading")).toBe(60 * 60_000);
    expect(timerOf("reading")?.status).toBe("paused");
  });

  it("takes time away again when the extra time is reduced", () => {
    seed([idleSession]);
    startSession("reading");
    vi.advanceTimersByTime(40 * 60_000);
    setSessionConfig("reading", { ...readingConfig, extraMinutes: 25 });

    setSessionConfig("reading", { ...readingConfig, extraMinutes: 10 });

    expect(remainingOf("reading")).toBe(45 * 60_000);
  });

  it("still re-seeds the timer when the component itself changes", () => {
    seed([idleSession]);
    startSession("reading");
    vi.advanceTimersByTime(40 * 60_000);

    setSessionConfig("reading", { ...readingConfig, partIndex: 1 });

    expect(timerOf("reading")).toEqual({ status: "idle" });
  });

  it("leaves an idle session idle when extra time is added before the start", () => {
    seed([idleSession]);

    setSessionConfig("reading", { ...readingConfig, extraMinutes: 25 });

    expect(timerOf("reading")).toEqual({ status: "idle" });
    expect(sessionDurationMs(sessionOf("reading")!)).toBe(100 * 60_000);
  });
});

describe("stored state that would break the board", () => {
  it("rejects extra minutes beyond the allowed maximum", () => {
    // Left unbounded this reaches a per-minute loop on the render path.
    seed([{ ...idleSession, extraMinutes: 1_000_000_000 }]);

    expect(getSnapshot().sessions).toEqual([]);
    expect(getSnapshot().restoreDiscarded).toBe(true);
  });

  it("rejects a paused timer owing negative time", () => {
    seed([{ ...idleSession, timer: { status: "paused", remainingMs: -1 } }]);

    expect(getSnapshot().sessions).toEqual([]);
    expect(getSnapshot().restoreDiscarded).toBe(true);
  });

  it("rejects a break longer than the allowed maximum", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        centreNumber: "ES432",
        sessions: [],
        break: { timer: { status: "idle" }, minutes: 100_000 },
      }),
    );
    hydrateFromStorage();

    expect(getSnapshot().restoreDiscarded).toBe(true);
  });

  it("rejects a fractional break length", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        centreNumber: "ES432",
        sessions: [],
        break: { timer: { status: "idle" }, minutes: 15.5 },
      }),
    );
    hydrateFromStorage();

    expect(getSnapshot().restoreDiscarded).toBe(true);
  });
});

describe("compensating for a system clock step", () => {
  it("moves every running deadline with the clock and persists the correction", () => {
    seed([idleSession]);
    startSession("reading");
    const before = remainingOf("reading");

    applyClockStep(-60 * 60_000);
    vi.setSystemTime(Date.now() - 60 * 60_000);

    expect(remainingOf("reading")).toBe(before);
    expect(localStorage.getItem(STORAGE_KEY)).toContain(String(endsAtOf("reading")));
  });

  it("says nothing when no exam is running", () => {
    seed([idleSession]);

    applyClockStep(-60 * 60_000);

    expect(getSnapshot().clockJumpDetected).toBe(false);
  });
});

describe("reordering the columns", () => {
  const three = ["a", "b", "c"].map((id) => ({ ...idleSession, id }));

  const order = (): string[] => getSnapshot().sessions.map((session) => session.id);

  it("moves a session to a later position", () => {
    seed(three);

    moveSession("a", 2);

    expect(order()).toEqual(["b", "c", "a"]);
  });

  it("moves a session to an earlier position", () => {
    seed(three);

    moveSession("c", 0);

    expect(order()).toEqual(["c", "a", "b"]);
  });

  it("keeps a running timer untouched as its column moves", () => {
    seed(three);
    startSession("a");
    const before = timerOf("a");

    moveSession("a", 2);

    expect(timerOf("a")).toEqual(before);
  });

  it("persists the new order", () => {
    seed(three);

    moveSession("a", 2);
    hydrateFromStorage();

    expect(order()).toEqual(["b", "c", "a"]);
  });

  it("clamps a target beyond either end", () => {
    seed(three);

    moveSession("b", 99);
    expect(order()).toEqual(["a", "c", "b"]);

    moveSession("b", -5);
    expect(order()).toEqual(["b", "a", "c"]);
  });

  it("does nothing for an unknown session or a move to its own place", () => {
    seed(three);
    const revision = getSnapshot().revision;

    moveSession("nope", 0);
    moveSession("b", 1);

    expect(order()).toEqual(["a", "b", "c"]);
    expect(getSnapshot().revision).toBe(revision);
  });
});
