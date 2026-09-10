import { renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import type { ReactNode } from "react";
import { CLOCK_JUMP_SAMPLE_MS } from "../config/timing";
import { getSnapshot, setClockJumpDetected } from "../store/boardStore";
import { useClockJump } from "./useClockJump";

const CLOCK_START = new Date("2026-06-11T09:00:00.000Z");
const BACKWARD_STEP_MS = 4 * 60_000;

let monotonicNow = 0;

const strictMode = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

const renderClockJump = () =>
  renderHook(
    () => {
      useClockJump();
    },
    { wrapper: strictMode },
  );

const stepClockBackwards = (): void => {
  monotonicNow += CLOCK_JUMP_SAMPLE_MS;
  vi.setSystemTime(CLOCK_START.getTime() - BACKWARD_STEP_MS);
  vi.advanceTimersByTime(CLOCK_JUMP_SAMPLE_MS);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(CLOCK_START);
  monotonicNow = 0;
  vi.spyOn(performance, "now").mockImplementation(() => monotonicNow);
  localStorage.clear();
  setClockJumpDetected(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("clock jump watch", () => {
  it("detects a backward step while nothing else touches the store", () => {
    const { unmount } = renderClockJump();

    stepClockBackwards();

    expect(getSnapshot().clockJumpDetected).toBe(true);
    unmount();
  });

  it("keeps the warning raised on later quiet samples", () => {
    const { unmount } = renderClockJump();
    stepClockBackwards();

    monotonicNow += CLOCK_JUMP_SAMPLE_MS;
    vi.advanceTimersByTime(CLOCK_JUMP_SAMPLE_MS);

    expect(getSnapshot().clockJumpDetected).toBe(true);
    unmount();
  });

  it("stops sampling once unmounted", () => {
    const { unmount } = renderClockJump();

    unmount();
    stepClockBackwards();

    expect(getSnapshot().clockJumpDetected).toBe(false);
  });
});
