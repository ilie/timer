import { useEffect, useMemo, useRef } from "react";
import type { ReactElement } from "react";
import { useNow } from "../hooks/useNow";
import { remainingSegments, reservationSegments } from "../lib/format";
import type { RemainingSegment } from "../lib/format";
import { remainingMs, thresholdOf } from "../lib/timer";
import type { Threshold, TimerState } from "../lib/timer";

type RemainingTimeProps = {
  timer: TimerState;
  durationMs: number;
  onThresholdCross: (threshold: Threshold) => void;
};

type SegmentRunProps = {
  segments: readonly RemainingSegment[];
};

const CELL_CLASSES =
  "group/countdown inline-grid grid-cols-1 grid-rows-1 place-items-center rounded-xl px-[0.1em] text-center leading-none tabular-nums text-vlec-blue-900 group-data-[columns=1]/board:text-countdown-1 group-data-[columns=2]/board:text-countdown-2 group-data-[columns=3]/board:text-countdown-3 group-data-[columns=4]/board:text-countdown-4 data-[state=warning]:text-amber-700 data-[state=critical]:text-vlec-red-700 data-[state=zero]:text-vlec-red-900";

const LAYER_CLASSES =
  "col-start-1 row-start-1 self-center justify-self-center whitespace-nowrap text-center font-bold group-data-[state=critical]/countdown:font-black group-data-[state=zero]/countdown:font-black";

const RESERVATION_CLASSES =
  "col-start-1 row-start-1 invisible whitespace-nowrap font-black";

const SMALL_SEGMENT_CLASSES = "text-[0.5em] tracking-tight";

function SegmentRun({ segments }: SegmentRunProps): ReactElement {
  return (
    <>
      {segments.map((segment, index) =>
        segment.scale === "small" ? (
          <span key={index} className={SMALL_SEGMENT_CLASSES}>
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

export function RemainingTime({
  timer,
  durationMs,
  onThresholdCross,
}: RemainingTimeProps): ReactElement {
  const now = useNow();
  const remaining =
    timer.status === "idle"
      ? durationMs
      : Math.max(0, Math.min(remainingMs(timer, now), durationMs));
  const threshold = thresholdOf(remaining);
  const lastReportedThreshold = useRef(threshold);
  const reservations = useMemo(() => reservationSegments(durationMs), [durationMs]);

  useEffect(() => {
    if (lastReportedThreshold.current === threshold) {
      return;
    }
    lastReportedThreshold.current = threshold;
    onThresholdCross(threshold);
  }, [threshold, onThresholdCross]);

  return (
    <p className={CELL_CLASSES} data-state={threshold}>
      {reservations.map((segments) => (
        <span
          key={segments.map((segment) => segment.text).join("")}
          className={RESERVATION_CLASSES}
          aria-hidden="true"
          data-reservation
        >
          <SegmentRun segments={segments} />
        </span>
      ))}
      <span className={LAYER_CLASSES} role="timer">
        <SegmentRun segments={remainingSegments(remaining)} />
      </span>
    </p>
  );
}
