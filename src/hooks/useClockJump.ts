import { useEffect } from 'react';
import { clockJumpSampleMilliseconds } from '../config/timing';
import { classifyClockJump } from '../lib/clockJump';
import { applyClockStep, reportUnverifiedClockJump } from '../store/boardStore';

/**
 * Watches for the system clock moving underneath a running exam.
 *
 * Samples only on its own interval, never on store activity: the classifier
 * decides whether the monotonic reading can be trusted by checking that this
 * interval fired roughly on schedule, which only means anything if the gap
 * between samples is the one we asked for.
 */
export function useClockJump(): void {
    useEffect(() => {
        let previousWallClock = Date.now();
        let previousMonotonic = performance.now();
        let stayedVisible = document.visibilityState === 'visible';

        const noteVisibility = (): void => {
            if (document.visibilityState !== 'visible') {
                stayedVisible = false;
            }
        };

        const sampleClocks = (): void => {
            const nowWallClock = Date.now();
            const nowMonotonic = performance.now();
            const jump = classifyClockJump({
                previousWallClock,
                previousMonotonic,
                nowWallClock,
                nowMonotonic,
                expectedMilliseconds: clockJumpSampleMilliseconds,
                pageStayedVisible: stayedVisible && document.visibilityState === 'visible',
            });
            previousWallClock = nowWallClock;
            previousMonotonic = nowMonotonic;
            stayedVisible = document.visibilityState === 'visible';
            if (jump.kind === 'stepped') {
                applyClockStep(jump.skewMilliseconds);
                return;
            }
            if (jump.kind === 'unverified') {
                reportUnverifiedClockJump(jump.skewMilliseconds);
            }
        };

        const sampleTimer = setInterval(sampleClocks, clockJumpSampleMilliseconds);
        document.addEventListener('visibilitychange', noteVisibility);

        return () => {
            clearInterval(sampleTimer);
            document.removeEventListener('visibilitychange', noteVisibility);
        };
    }, []);
}
