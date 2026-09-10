import { useEffect } from "react";
import { CLOCK_JUMP_SAMPLE_MS } from "../config/timing";
import { classifyClockJump } from "../lib/timer";
import { applyClockStep, reportUnverifiedClockJump } from "../store/boardStore";

/**
 * Watches for the system clock moving underneath a running exam.
 *
 * Samples only on its own interval, never on store activity: the classifier
 * decides whether the monotonic reading can be trusted by checking that this
 * interval fired roughly on schedule, which only means anything if the gap
 * between samples is the one we asked for.
 */
export function useClockJump(): void {
  useEffect(() => {
    let prevDate = Date.now();
    let prevPerf = performance.now();
    let stayedVisible = document.visibilityState === "visible";

    const noteVisibility = (): void => {
      if (document.visibilityState !== "visible") {
        stayedVisible = false;
      }
    };

    const sampleClocks = (): void => {
      const nowDate = Date.now();
      const nowPerf = performance.now();
      const jump = classifyClockJump({
        prevDate,
        prevPerf,
        nowDate,
        nowPerf,
        expectedMs: CLOCK_JUMP_SAMPLE_MS,
        pageStayedVisible: stayedVisible && document.visibilityState === "visible",
      });
      prevDate = nowDate;
      prevPerf = nowPerf;
      stayedVisible = document.visibilityState === "visible";
      if (jump.kind === "stepped") {
        applyClockStep(jump.skewMs);
        return;
      }
      if (jump.kind === "unverified") {
        reportUnverifiedClockJump(jump.skewMs);
      }
    };

    const sampleTimer = setInterval(sampleClocks, CLOCK_JUMP_SAMPLE_MS);
    document.addEventListener("visibilitychange", noteVisibility);

    return () => {
      clearInterval(sampleTimer);
      document.removeEventListener("visibilitychange", noteVisibility);
    };
  }, []);
}
