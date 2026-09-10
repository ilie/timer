import { render, screen } from "@testing-library/react";
import { act } from "react";
import type { ReactElement } from "react";
import { DISPLAY_TICK_MS } from "../config/timing";
import { useNow } from "./useNow";

const EXAM_START = new Date("2026-06-11T09:00:00.000Z");

function Clock({ name }: { name: string }): ReactElement {
  const now = useNow();
  return <span data-testid={name}>{now}</span>;
}

const readClock = (name: string): string => screen.getByTestId(name).textContent ?? "";

const setVisibility = (state: "visible" | "hidden"): void => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(EXAM_START);
  setVisibility("visible");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("one clock for the whole board", () => {
  it("never lets two columns disagree, at any point across a second boundary", () => {
    render(
      <>
        <Clock name="first" />
        <Clock name="second" />
      </>,
    );

    // Step across a full second in quarter-second samples, the rate the board ticks at.
    for (let step = 0; step < 8; step += 1) {
      advance(DISPLAY_TICK_MS);
      expect(readClock("first")).toBe(readClock("second"));
    }
  });

  it("gives a column mounted later the same reading as one already running", () => {
    const view = render(<Clock name="first" />);
    advance(DISPLAY_TICK_MS * 3);

    view.rerender(
      <>
        <Clock name="first" />
        <Clock name="second" />
      </>,
    );

    expect(readClock("second")).toBe(readClock("first"));
  });
});

describe("coming back from a display that was asleep", () => {
  it("corrects itself the moment the page becomes visible again", () => {
    render(<Clock name="first" />);
    const beforeSleep = readClock("first");

    // The display sleeps: real time passes but the throttled interval never fires.
    act(() => {
      setVisibility("hidden");
      vi.setSystemTime(Date.now() + 10 * 60_000);
    });
    expect(readClock("first")).toBe(beforeSleep);

    act(() => {
      setVisibility("visible");
    });

    expect(Number(readClock("first"))).toBe(EXAM_START.getTime() + 10 * 60_000);
  });

  it("corrects itself on pageshow, for a restore from the back/forward cache", () => {
    render(<Clock name="first" />);

    act(() => {
      vi.setSystemTime(Date.now() + 5 * 60_000);
      window.dispatchEvent(new Event("pageshow"));
    });

    expect(Number(readClock("first"))).toBe(EXAM_START.getTime() + 5 * 60_000);
  });
});
