import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "../config/storage";
import { statusOf } from "../lib/timer";
import {
  getSnapshot,
  hydrateFromStorage,
  pauseSession,
  setClockJumpDetected,
  startSession,
  subscribe,
} from "./boardStore";

const EXAM_START = new Date("2026-06-11T09:00:00.000Z");
const READING_MS = 75 * 60_000;

const idleSession = {
  id: "reading",
  examName: "B2 First",
  partIndex: 0,
  mode: "paper",
  extraMinutes: 0,
  timer: { status: "idle" },
};

const storedBoard = (sessions: readonly unknown[]): string =>
  JSON.stringify({
    centreNumber: "ES432",
    sessions,
    break: { timer: { status: "idle" }, minutes: 15 },
  });

const seed = (sessions: readonly unknown[]): void => {
  localStorage.setItem(STORAGE_KEY, storedBoard(sessions));
  hydrateFromStorage();
};

const timerOf = (id: string) => getSnapshot().sessions.find((session) => session.id === id)?.timer;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(EXAM_START);
  localStorage.clear();
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
