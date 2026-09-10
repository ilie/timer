import { useMemo } from "react";
import type { ReactElement } from "react";
import { BoardValue } from "./BoardValue";
import { useNow } from "../hooks/useNow";
import { remainingSegments, reservationSegments } from "../lib/format";
import type { RemainingSegment } from "../lib/format";
import { remainingMs, thresholdOf } from "../lib/timer";
import type { TimerState } from "../lib/timer";

export type ValueAlignment = "start" | "center";

type RemainingTimeProps = {
  label: string | null;
  align?: ValueAlignment;
  timer: TimerState;
  durationMs: number;
};

type SegmentRunProps = {
  segments: readonly RemainingSegment[];
};

const CLOCK_CLASSES =
  "group/countdown inline-grid grid-cols-1 grid-rows-1 tabular-nums text-vlec-blue-900 data-[state=warning]:text-amber-700 data-[state=critical]:text-vlec-red-700 data-[state=zero]:text-vlec-red-700";

const ALIGNMENT_CLASSES: Record<ValueAlignment, string> = {
  start: "justify-items-start",
  center: "justify-items-center",
};

const LAYER_CLASSES =
  "col-start-1 row-start-1 whitespace-nowrap font-bold group-data-[state=critical]/countdown:font-black group-data-[state=zero]/countdown:font-black";

const RESERVATION_CLASSES = "col-start-1 row-start-1 invisible whitespace-nowrap font-black";

const SMALL_SEGMENT_CLASSES = "text-[0.52em] tracking-tight";

function segmentsKey(segments: readonly RemainingSegment[]): string {
  return segments.map((segment) => segment.text).join("");
}

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
}: RemainingTimeProps): ReactElement {
  const now = useNow();
  const remaining =
    timer.status === "idle"
      ? durationMs
      : Math.max(0, Math.min(remainingMs(timer, now), durationMs));
  const threshold = thresholdOf(remaining);
  // Every rendering the countdown can take, laid invisibly under the live one so
  // the column never resizes as the digits change.
  const reservations = useMemo(() => reservationSegments(durationMs), [durationMs]);

  return (
    <BoardValue label={label}>
      <span className={`${CLOCK_CLASSES} ${ALIGNMENT_CLASSES[align]}`} data-state={threshold}>
        {reservations.map((segments) => (
          <span
            key={segmentsKey(segments)}
            className={RESERVATION_CLASSES}
            aria-hidden="true"
            data-reservation
          >
            <SegmentRun segments={segments} />
          </span>
        ))}
        <span className={LAYER_CLASSES} role="timer" aria-live="off">
          <SegmentRun segments={remainingSegments(remaining)} />
        </span>
      </span>
    </BoardValue>
  );
}
