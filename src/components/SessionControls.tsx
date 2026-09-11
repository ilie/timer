import { twMerge } from 'tailwind-merge';
import type { ReactElement } from 'react';
import { ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from './UI/Button';
import type { SessionView } from '../lib/sessionView';
import { advanceComponent, pauseSession, resumeSession, startSession } from '../store/boardStore';

type SessionControlsProps = {
    view: SessionView;
    onRequestReset: (view: SessionView) => void;
    className?: string;
};

/**
 * The one button that drives the countdown, by the state it is in. Naming it,
 * drawing it and acting on it are the same decision, so they are made once.
 */
const runControls = {
    idle: { label: 'Start', Icon: Play, run: startSession },
    running: { label: 'Pause', Icon: Pause, run: pauseSession },
    paused: { label: 'Resume', Icon: Play, run: resumeSession },
} as const;

export function SessionControls({ view, onRequestReset, className }: SessionControlsProps): ReactElement | null {
    if (!view.countsDown) {
        return null;
    }

    const runControl = view.status === 'finished' ? null : runControls[view.status];
    const offersNextPart = view.status === 'finished' && view.nextPartName !== null;

    function handleRunControl() {
        runControl?.run(view.id);
    }

    function requestReset() {
        onRequestReset(view);
    }

    function advanceToNextPart() {
        advanceComponent(view.id);
    }

    return (
        <div className={twMerge('inline-flex flex-wrap items-center justify-center gap-3', className)}>
            <Button
                variant="quiet"
                className="control-text min-w-[6em] rounded-full px-5 py-2.5"
                onClick={requestReset}
            >
                <RotateCcw className="size-[1.15em]" strokeWidth={2.25} aria-hidden="true" />
                Reset
            </Button>
            {runControl !== null && (
                <Button className="control-text min-w-[7.5em] rounded-full px-6 py-2.5" onClick={handleRunControl}>
                    <runControl.Icon
                        className="size-[1.15em]"
                        fill="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                    {runControl.label}
                </Button>
            )}
            {offersNextPart && (
                <Button className="control-text min-w-[7.5em] rounded-full px-6 py-2.5" onClick={advanceToNextPart}>
                    <ChevronRight className="size-[1.15em]" strokeWidth={2.5} aria-hidden="true" />
                    Next: {view.nextPartName}
                </Button>
            )}
        </div>
    );
}
