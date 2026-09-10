import { renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import type { ReactNode } from "react";
import { CLOCK_JUMP_SAMPLE_MS } from "../config/timing";
import { STORAGE_KEY } from "../config/storage";
import { remainingMs } from "../lib/timer";
import type { TimerState } from "../lib/timer";
import {
  getSnapshot,
  hydrateFromStorage,
  setClockJumpDetected,
  startSession,
} from "../store/boardStore";
import { useClockJump } from "./useClockJump";

const CLOCK_START = new Date("2026-06-11T09:00:00.000Z");
const HOUR = 60 * 60_000;
const READING_MS = 75 * 60_000;

let monotonicNow = 0;

const strictMode = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

const renderClockJump = () =>
  renderHook(
    () => {
      useClockJump();
    },
    { wrapper: strictMode },
  );

const seedRunningSession = (): void => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      centreNumber: "ES432",
      sessions: [
        {
          id: "reading",
          examName: "B2 First",
          partIndex: 0,
          mode: "paper",
          extraMinutes: 0,
          timer: { status: "idle" },
        },
      ],
      break: { timer: { status: "idle" }, minutes: 15 },
    }),
  );
  hydrateFromStorage();
  startSession("reading");
};

const timerOf = (id: string): TimerState => {
  const timer = getSnapshot().sessions.find((session) => session.id === id)?.timer;
  if (timer === undefined) {
    throw new Error(`No session ${id}`);
  }
  return timer;
};

const setVisibility = (state: "visible" | "hidden"): void => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

/** One sampler interval passes, with the wall clock stepping by `stepMs`. */
const sampleWithWallStep = (stepMs: number): void => {
  monotonicNow += CLOCK_JUMP_SAMPLE_MS;
  vi.setSystemTime(Date.now() + stepMs);
  vi.advanceTimersByTime(CLOCK_JUMP_SAMPLE_MS);
};

/** One sampler interval where the monotonic clock stood still, as after a suspend. */
const sampleWithoutMonotonicProgress = (gapMs: number): void => {
  vi.setSystemTime(Date.now() + gapMs);
  vi.advanceTimersByTime(CLOCK_JUMP_SAMPLE_MS);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(CLOCK_START);
  monotonicNow = 0;
  vi.spyOn(performance, "now").mockImplementation(() => monotonicNow);
  setVisibility("visible");
  localStorage.clear();
  setClockJumpDetected(false);
  hydrateFromStorage();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("a clock step while an exam is running", () => {
  it("keeps the remaining time intact when the clock is put back an hour", () => {
    seedRunningSession();
    const { unmount } = renderClockJump();

    sampleWithWallStep(-HOUR);

    // The candidate has used only the five seconds the sampler actually measured.
    expect(remainingMs(timerOf("reading"), Date.now())).toBe(READING_MS - CLOCK_JUMP_SAMPLE_MS);
    expect(getSnapshot().clockTimesPreserved).toBe(true);
    expect(getSnapshot().clockSkewMs).toBe(-HOUR);
    unmount();
  });

  it("keeps the remaining time intact when the clock is put forward an hour", () => {
    seedRunningSession();
    const { unmount } = renderClockJump();

    sampleWithWallStep(HOUR);

    expect(remainingMs(timerOf("reading"), Date.now())).toBe(READING_MS - CLOCK_JUMP_SAMPLE_MS);
    expect(getSnapshot().clockTimesPreserved).toBe(true);
    unmount();
  });

  it("does not declare the session finished early on a forward step", () => {
    seedRunningSession();
    const { unmount } = renderClockJump();

    sampleWithWallStep(2 * HOUR);

    expect(remainingMs(timerOf("reading"), Date.now())).toBeGreaterThan(0);
    unmount();
  });

  it("raises the warning and keeps it raised on later quiet samples", () => {
    seedRunningSession();
    const { unmount } = renderClockJump();

    sampleWithWallStep(-HOUR);
    expect(getSnapshot().clockJumpDetected).toBe(true);

    sampleWithWallStep(0);

    expect(getSnapshot().clockJumpDetected).toBe(true);
    unmount();
  });
});

describe("a gap we cannot account for", () => {
  it("does not hand back time the machine spent asleep", () => {
    seedRunningSession();
    const before = timerOf("reading");
    const { unmount } = renderClockJump();

    sampleWithoutMonotonicProgress(10 * 60_000);

    expect(timerOf("reading")).toEqual(before);
    expect(getSnapshot().clockJumpDetected).toBe(true);
    expect(getSnapshot().clockTimesPreserved).toBe(false);
    unmount();
  });

  it("does not adjust across a gap where the page was hidden", () => {
    seedRunningSession();
    const before = timerOf("reading");
    const { unmount } = renderClockJump();

    setVisibility("hidden");
    setVisibility("visible");
    sampleWithWallStep(-HOUR);

    expect(timerOf("reading")).toEqual(before);
    expect(getSnapshot().clockTimesPreserved).toBe(false);
    unmount();
  });
});

describe("staying quiet when there is nothing to protect", () => {
  it("says nothing about a clock step when no exam is running", () => {
    const { unmount } = renderClockJump();

    sampleWithWallStep(-HOUR);

    expect(getSnapshot().clockJumpDetected).toBe(false);
    unmount();
  });

  it("stops sampling once unmounted", () => {
    seedRunningSession();
    const { unmount } = renderClockJump();

    unmount();
    sampleWithWallStep(-HOUR);

    expect(getSnapshot().clockJumpDetected).toBe(false);
  });
});
