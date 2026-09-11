import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { mergeClasses } from '../lib/mergeClasses';
import { BoardValue } from './BoardValue';
import { useNow } from '../hooks/useNow';
import { remainingSegments, reservationSegments } from '../lib/format';
import type { RemainingSegment } from '../lib/format';
import { remainingMs, thresholdOf } from '../lib/timer';
import type { TimerState } from '../lib/timer';

export type ValueAlignment = 'start' | 'center';

type RemainingTimeProps = {
    label: string | null;
    align?: ValueAlignment;
    timer: TimerState;
    durationMs: number;
    className?: string;
};

type SegmentRunProps = {
    segments: readonly RemainingSegment[];
};

function segmentsKey(segments: readonly RemainingSegment[]): string {
    return segments.map((segment) => segment.text).join('');
}

/** The digits, with the minute and second words set smaller than the numbers. */
function SegmentRun({ segments }: SegmentRunProps): ReactElement {
    return (
        <>
            {segments.map((segment, index) =>
                segment.scale === 'small' ? (
                    <span key={index} className="text-[0.52em] tracking-tight">
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
    align = 'center',
    timer,
    durationMs,
    className,
}: RemainingTimeProps): ReactElement {
    const now = useNow();
    const remaining = timer.status === 'idle' ? durationMs : Math.max(0, Math.min(remainingMs(timer, now), durationMs));
    const threshold = thresholdOf(remaining);
    // Every rendering the countdown can take, laid invisibly under the live one so
    // the column never resizes as the digits change.
    const reservations = useMemo(() => reservationSegments(durationMs), [durationMs]);

    return (
        <BoardValue label={label} className={className}>
            <span
                data-state={threshold}
                className={mergeClasses(
                    'group/countdown text-vlec-blue-900 inline-grid grid-cols-1 grid-rows-1 tabular-nums',
                    'data-[state=critical]:text-vlec-red-700 data-[state=zero]:text-vlec-red-700 data-[state=warning]:text-amber-700',
                    align === 'start' ? 'justify-items-start' : 'justify-items-center',
                )}
            >
                {reservations.map((segments) => (
                    <span
                        key={segmentsKey(segments)}
                        className="invisible col-start-1 row-start-1 font-black whitespace-nowrap"
                        aria-hidden="true"
                        data-reservation
                    >
                        <SegmentRun segments={segments} />
                    </span>
                ))}
                <span
                    role="timer"
                    aria-live="off"
                    className="col-start-1 row-start-1 font-bold whitespace-nowrap group-data-[state=critical]/countdown:font-black group-data-[state=zero]/countdown:font-black"
                >
                    <SegmentRun segments={remainingSegments(remaining)} />
                </span>
            </span>
        </BoardValue>
    );
}
