import { useEffect } from "react";
import { detectClockJump } from "../lib/timer";
import { setClockJumpDetected, subscribe } from "../store/boardStore";

export function useClockJump(): void {
  useEffect(() => {
    let prevDate = Date.now();
    let prevPerf = performance.now();
    return subscribe(() => {
      const nowDate = Date.now();
      const nowPerf = performance.now();
      const jump = detectClockJump({ prevDate, prevPerf, nowDate, nowPerf });
      prevDate = nowDate;
      prevPerf = nowPerf;
      if (jump === "backward") {
        setClockJumpDetected(true);
      }
    });
  }, []);
}
