import { useEffect } from "react";
import { CLOCK_JUMP_SAMPLE_MS } from "../config/timing";
import { detectClockJump } from "../lib/timer";
import { setClockJumpDetected, subscribe } from "../store/boardStore";

export function useClockJump(): void {
  useEffect(() => {
    let prevDate = Date.now();
    let prevPerf = performance.now();

    const sampleClocks = (): void => {
      const nowDate = Date.now();
      const nowPerf = performance.now();
      const jump = detectClockJump({ prevDate, prevPerf, nowDate, nowPerf });
      prevDate = nowDate;
      prevPerf = nowPerf;
      if (jump === "backward") {
        setClockJumpDetected(true);
      }
    };

    const unsubscribe = subscribe(sampleClocks);
    const sampleTimer = setInterval(sampleClocks, CLOCK_JUMP_SAMPLE_MS);

    return () => {
      unsubscribe();
      clearInterval(sampleTimer);
    };
  }, []);
}
