import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RemainingTime } from "./RemainingTime";
import { STORAGE_KEY } from "../config/storage";
import { DISPLAY_TICK_MS } from "../config/timing";
import { formatRemaining } from "../lib/format";
import { remainingMs } from "../lib/timer";
import type { Threshold, TimerState } from "../lib/timer";
import { getSnapshot, hydrateFromStorage, startSession } from "../store/boardStore";

const EXAM_START = new Date("2026-06-11T09:00:00.000Z");
const READING_MS = 75 * 60_000;
const TEN_MINUTES_MS = 10 * 60_000;

const seedIdleReadingSession = (): void => {
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
};

const runningTimerOf = (id: string): TimerState => {
  const timer = getSnapshot().sessions.find((session) => session.id === id)?.timer;
  if (timer === undefined) {
    throw new Error(`No session ${id}`);
  }
  return timer;
};

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

const noThresholdHandling = (): void => {};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(EXAM_START);
  localStorage.clear();
  hydrateFromStorage();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("anchoring", () => {
  it("anchors the end time exactly one duration after the start", () => {
    seedIdleReadingSession();
    startSession("reading");
    const timer = runningTimerOf("reading");

    expect(timer.status).toBe("running");
    expect(timer.status === "running" && timer.endsAt - Date.now()).toBe(READING_MS);
  });

  it("loses nothing to drift over ten minutes of ticks", () => {
    seedIdleReadingSession();
    startSession("reading");
    const timer = runningTimerOf("reading");

    render(
      <RemainingTime
        timer={timer}
        durationMs={READING_MS}
        onThresholdCross={noThresholdHandling}
      />,
    );

    advance(TEN_MINUTES_MS);

    expect(remainingMs(timer, Date.now())).toBe(READING_MS - 600_000);
    expect(screen.getByText(formatRemaining(READING_MS - 600_000))).toBeInTheDocument();
  });

  it("shows the whole allowed time while the session is idle", () => {
    render(
      <RemainingTime
        timer={{ status: "idle" }}
        durationMs={READING_MS}
        onThresholdCross={noThresholdHandling}
      />,
    );

    expect(screen.getByText(formatRemaining(READING_MS))).toBeInTheDocument();
  });
});

describe("threshold crossings", () => {
  it("reports each crossing once, in order, driving eleven minutes to zero", () => {
    const crossings: Threshold[] = [];
    const recordCrossing = (threshold: Threshold): void => {
      crossings.push(threshold);
    };
    const timer: TimerState = { status: "running", endsAt: Date.now() + 11 * 60_000 };

    render(
      <RemainingTime timer={timer} durationMs={11 * 60_000} onThresholdCross={recordCrossing} />,
    );

    expect(crossings).toEqual([]);

    for (let second = 0; second < 11 * 60; second += 1) {
      advance(1000);
    }

    expect(crossings).toEqual(["warning", "critical", "zero"]);
  });

  it("reports nothing while the threshold stays the same", () => {
    const crossings: Threshold[] = [];
    const recordCrossing = (threshold: Threshold): void => {
      crossings.push(threshold);
    };
    const timer: TimerState = { status: "running", endsAt: Date.now() + 11 * 60_000 };

    const view = render(
      <RemainingTime timer={timer} durationMs={11 * 60_000} onThresholdCross={recordCrossing} />,
    );

    advance(DISPLAY_TICK_MS * 4);
    view.rerender(
      <RemainingTime timer={timer} durationMs={11 * 60_000} onThresholdCross={recordCrossing} />,
    );

    expect(crossings).toEqual([]);
  });
});
