import { useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { useNow } from "../hooks/useNow";
import { formatRemaining } from "../lib/format";
import { remainingMs, thresholdOf } from "../lib/timer";
import type { Threshold, TimerState } from "../lib/timer";

type RemainingTimeProps = {
  timer: TimerState;
  durationMs: number;
  onThresholdCross: (threshold: Threshold) => void;
};

export function RemainingTime({
  timer,
  durationMs,
  onThresholdCross,
}: RemainingTimeProps): ReactElement {
  const now = useNow();
  const remaining = timer.status === "idle" ? durationMs : remainingMs(timer, now);
  const threshold = thresholdOf(remaining);
  const lastReportedThreshold = useRef(threshold);

  useEffect(() => {
    if (lastReportedThreshold.current === threshold) {
      return;
    }
    lastReportedThreshold.current = threshold;
    onThresholdCross(threshold);
  }, [threshold, onThresholdCross]);

  return <p data-state={threshold}>{formatRemaining(remaining)}</p>;
}
