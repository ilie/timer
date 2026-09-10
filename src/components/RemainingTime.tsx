import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useNow } from "../hooks/useNow";
import { remainingSegments, reservationSegments } from "../lib/format";
import type { RemainingSegment } from "../lib/format";
import { remainingMs, thresholdOf } from "../lib/timer";
import type { Threshold, TimerState } from "../lib/timer";

type RemainingTimeProps = {
  label: string | null;
  timer: TimerState;
  durationMs: number;
  onThresholdCross: (threshold: Threshold) => void;
};

type SegmentRunProps = {
  segments: readonly RemainingSegment[];
};

export const COLUMN_LABEL_CLASSES =
  "block font-medium uppercase leading-tight tracking-[0.14em] text-linguaskill-slate-400 text-column-label";

const REGION_CLASSES = "absolute inset-x-2 inset-y-1";

const CENTRING_CLASSES =
  "absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden";

const CELL_CLASSES =
  "group/countdown inline-grid shrink-0 grid-cols-1 grid-rows-1 place-items-center rounded-xl px-[0.1em] text-center leading-none tabular-nums text-vlec-blue-900 data-[state=warning]:text-amber-700 data-[state=critical]:text-vlec-red-700 data-[state=zero]:text-vlec-red-900";

const LAYER_CLASSES =
  "col-start-1 row-start-1 self-center justify-self-center whitespace-nowrap text-center font-bold group-data-[state=critical]/countdown:font-black group-data-[state=zero]/countdown:font-black";

const RESERVATION_CLASSES = "col-start-1 row-start-1 invisible whitespace-nowrap font-black";

const SMALL_SEGMENT_CLASSES = "text-[0.5em] tracking-tight";

const MIN_COUNTDOWN_PX = 24;

const SETTLED_TOLERANCE_PX = 1;

const LABEL_GAP_PX = 4;

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
  const regionRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const cellRef = useRef<HTMLParagraphElement>(null);
  const [fittedFontPx, setFittedFontPx] = useState<number | null>(null);

  useEffect(() => {
    if (lastReportedThreshold.current === threshold) {
      return;
    }
    lastReportedThreshold.current = threshold;
    onThresholdCross(threshold);
  }, [threshold, onThresholdCross]);

  useEffect(() => {
    const region = regionRef.current;
    const cell = cellRef.current;
    if (region === null || cell === null || typeof ResizeObserver === "undefined") {
      return;
    }
    const fitToRegion = () => {
      const available = region.getBoundingClientRect();
      const rendered = cell.getBoundingClientRect();
      const labelBox = labelRef.current;
      const reserved =
        labelBox === null ? 0 : labelBox.getBoundingClientRect().height + LABEL_GAP_PX;
      const usableHeight = available.height - reserved;
      const basis = Number.parseFloat(window.getComputedStyle(cell).fontSize);
      if (
        available.width === 0 ||
        usableHeight <= 0 ||
        rendered.width === 0 ||
        rendered.height === 0 ||
        !Number.isFinite(basis) ||
        basis === 0
      ) {
        return;
      }
      const widthPerPx = rendered.width / basis;
      const heightPerPx = rendered.height / basis;
      const fitted = Math.floor(Math.min(available.width / widthPerPx, usableHeight / heightPerPx));
      const next = Math.max(MIN_COUNTDOWN_PX, fitted);
      setFittedFontPx((current) =>
        current !== null && Math.abs(next - current) <= SETTLED_TOLERANCE_PX ? current : next,
      );
    };
    const observer = new ResizeObserver(fitToRegion);
    observer.observe(region);
    return () => {
      observer.disconnect();
    };
  }, [reservations, fittedFontPx]);

  return (
    <div ref={regionRef} className={REGION_CLASSES}>
      <div className={CENTRING_CLASSES}>
        {label === null ? null : (
          <span ref={labelRef} aria-hidden="true" className={COLUMN_LABEL_CLASSES}>
            {label}
          </span>
        )}
        <p
          ref={cellRef}
          className={CELL_CLASSES}
          data-state={threshold}
          style={fittedFontPx === null ? undefined : { fontSize: `${fittedFontPx}px` }}
        >
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
      </div>
    </div>
  );
}
