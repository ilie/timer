import { mergeClasses } from '../lib/mergeClasses';
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

const runControlLabels = {
    idle: 'Start',
    running: 'Pause',
    paused: 'Resume',
} as const;

export function SessionControls({ view, onRequestReset, className }: SessionControlsProps): ReactElement | null {
    if (!view.countsDown) {
        return null;
    }

    const runControlLabel = view.status === 'finished' ? null : runControlLabels[view.status];
    const offersNextPart = view.status === 'finished' && view.nextPartName !== null;

    function runControl() {
        switch (view.status) {
            case 'idle':
                startSession(view.id);
                return;
            case 'running':
                pauseSession(view.id);
                return;
            case 'paused':
                resumeSession(view.id);
                return;
            case 'finished':
                return;
        }
    }

    function requestReset() {
        onRequestReset(view);
    }

    function advanceToNextPart() {
        advanceComponent(view.id);
    }

    return (
        <div className={mergeClasses('inline-flex flex-wrap items-center justify-center gap-3', className)}>
            <Button
                variant="quiet"
                className="text-control min-w-[6em] rounded-full px-5 py-2.5"
                onClick={requestReset}
            >
                <RotateCcw className="size-[1.15em]" strokeWidth={2.25} aria-hidden="true" />
                Reset
            </Button>
            {runControlLabel !== null && (
                <Button className="text-control min-w-[7.5em] rounded-full px-6 py-2.5" onClick={runControl}>
                    {view.status === 'running' ? (
                        <Pause className="size-[1.15em]" fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
                    ) : (
                        <Play className="size-[1.15em]" fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
                    )}
                    {runControlLabel}
                </Button>
            )}
            {offersNextPart && (
                <Button className="text-control min-w-[7.5em] rounded-full px-6 py-2.5" onClick={advanceToNextPart}>
                    <ChevronRight className="size-[1.15em]" strokeWidth={2.5} aria-hidden="true" />
                    Next: {view.nextPartName}
                </Button>
            )}
        </div>
    );
}
