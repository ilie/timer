import { useEffect, useMemo, useRef } from "react";
import type { ReactElement } from "react";
import { useNow } from "../hooks/useNow";
import { remainingSegments, reservationSegments } from "../lib/format";
import type { RemainingSegment } from "../lib/format";
import { remainingMs, thresholdOf } from "../lib/timer";
import type { Threshold, TimerState } from "../lib/timer";

export type ValueAlignment = "start" | "center";

type RemainingTimeProps = {
  label: string | null;
  align?: ValueAlignment;
  timer: TimerState;
  durationMs: number;
  onThresholdCross: (threshold: Threshold) => void;
};

type SegmentRunProps = {
  segments: readonly RemainingSegment[];
};

export const FIT_CLASSES =
  "inline-block whitespace-nowrap px-[0.18em] align-middle leading-none text-[length:var(--board-value-size,1.75rem)]";

export const COLUMN_LABEL_CLASSES =
  "mb-[0.35em] block text-[0.28em] font-semibold uppercase leading-tight tracking-[0.2em] text-linguaskill-slate-400";

const CLOCK_CLASSES =
  "group/countdown inline-grid grid-cols-1 grid-rows-1 tabular-nums text-vlec-blue-900 data-[state=warning]:text-amber-700 data-[state=critical]:text-vlec-red-700 data-[state=zero]:text-vlec-red-900";

const ALIGNMENT_CLASSES: Record<ValueAlignment, string> = {
  start: "justify-items-start",
  center: "justify-items-center",
};

const LAYER_CLASSES =
  "col-start-1 row-start-1 whitespace-nowrap font-bold group-data-[state=critical]/countdown:font-black group-data-[state=zero]/countdown:font-black";

const RESERVATION_CLASSES = "col-start-1 row-start-1 invisible whitespace-nowrap font-black";

const SMALL_SEGMENT_CLASSES = "text-[0.52em] tracking-tight";

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
  label,
  align = "center",
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
    <span data-fit="value" className={FIT_CLASSES}>
      {label === null ? null : <span className={COLUMN_LABEL_CLASSES}>{label}</span>}
      <span className={`${CLOCK_CLASSES} ${ALIGNMENT_CLASSES[align]}`} data-state={threshold}>
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
      </span>
    </span>
  );
}
