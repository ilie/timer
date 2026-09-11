import { twMerge } from 'tailwind-merge';
import type { ReactElement } from 'react';
import { useSyncExternalStore } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from './UI/Button';
import { formatClockSkew } from '../lib/format';
import { getSnapshot, setClockJumpDetected, subscribe } from '../store/boardStore';

function dismiss(): void {
    setClockJumpDetected(false);
}

type ClockAlertProps = {
    className?: string;
};

/**
 * Tells the invigilator that the system clock moved under a running exam.
 *
 * Detecting the jump is only half the job: whether or not the countdowns could
 * be corrected automatically, somebody in the room has to know it happened.
 */
export function ClockAlert({ className }: ClockAlertProps): ReactElement | null {
    const board = useSyncExternalStore(subscribe, getSnapshot);

    if (!board.clockJumpDetected) {
        return null;
    }

    const timesPreserved = board.clockTimesPreserved;
    const skew = board.clockSkewMilliseconds === 0 ? null : formatClockSkew(board.clockSkewMilliseconds);

    return (
        <div
            role="alert"
            className={twMerge(
                'tab-text mx-8 mb-2 flex shrink-0 items-center gap-3 rounded-lg border-2 px-5 py-3',
                timesPreserved
                    ? 'border-amber-700 bg-amber-50 text-amber-900'
                    : 'border-vlec-red-700 bg-vlec-red-50 text-vlec-red-900',
                className,
            )}
        >
            <TriangleAlert className="size-[1.4em] shrink-0" aria-hidden="true" />
            <p className="flex-1 text-pretty">
                {skew === null ? (
                    'The system clock changed'
                ) : (
                    <>
                        The system clock moved <span className="font-semibold">{skew}</span>
                    </>
                )}
                {timesPreserved
                    ? '. The times below were adjusted to match and are still correct.'
                    : '. Check the times below against a clock you trust before relying on them.'}
            </p>
            <Button
                variant="ghost"
                className="-mr-2 rounded-full p-2 text-current hover:bg-black/10 hover:text-current focus-visible:outline-current"
                aria-label="Dismiss"
                onClick={dismiss}
            >
                <X className="size-[1.15em]" aria-hidden="true" />
            </Button>
        </div>
    );
}
