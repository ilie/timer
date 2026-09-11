import { criticalMilliseconds, warningMilliseconds } from '../config/thresholds';

export type TimerState =
    { status: 'idle' } | { status: 'running'; endsAt: number } | { status: 'paused'; remainingMs: number };

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export type Threshold = 'normal' | 'warning' | 'critical' | 'zero';

type RemainingOptions = { allowNegative?: boolean };

type RestoreOptions = { clamp?: boolean };

export type RestoreResult = {
    state: TimerState;
    clamped: boolean;
};

const signedRemainingMilliseconds = (state: TimerState, now: number): number => {
    switch (state.status) {
        case 'idle':
            return 0;
        case 'running':
            return state.endsAt - now;
        case 'paused':
            return state.remainingMs;
    }
};

export const remainingMilliseconds = (
    state: TimerState,
    now: number,
    { allowNegative = false }: RemainingOptions = {},
): number => {
    const signedRemaining = signedRemainingMilliseconds(state, now);
    return allowNegative ? signedRemaining : Math.max(0, signedRemaining);
};

/**
 * What the board shows for this timer: the whole component before it starts,
 * and once under way never more than the component itself nor less than zero.
 * The cap is what stops a clock that moved backwards under a running exam from
 * reading as more time than the candidate is allowed.
 */
export const displayedRemainingMilliseconds = (state: TimerState, durationMilliseconds: number, now: number): number =>
    state.status === 'idle'
        ? durationMilliseconds
        : Math.max(0, Math.min(remainingMilliseconds(state, now), durationMilliseconds));

export const statusOf = (state: TimerState, now: number): TimerStatus => {
    switch (state.status) {
        case 'idle':
            return 'idle';
        case 'paused':
            return 'paused';
        case 'running':
            return state.endsAt <= now ? 'finished' : 'running';
    }
};

export const thresholdOf = (milliseconds: number): Threshold => {
    if (milliseconds <= 0) {
        return 'zero';
    }
    if (milliseconds <= criticalMilliseconds) {
        return 'critical';
    }
    if (milliseconds <= warningMilliseconds) {
        return 'warning';
    }
    return 'normal';
};

export const start = (durationMilliseconds: number, now: number): TimerState => ({
    status: 'running',
    endsAt: now + durationMilliseconds,
});

export const pause = (state: TimerState, now: number): TimerState =>
    state.status === 'running' ? { status: 'paused', remainingMs: Math.max(0, state.endsAt - now) } : state;

export const resume = (state: TimerState, now: number): TimerState =>
    state.status === 'paused' ? { status: 'running', endsAt: now + state.remainingMs } : state;

export const reset = (): TimerState => ({ status: 'idle' });

/**
 * Add (or remove) time on a timer that is already under way, keeping the time
 * already served. Used when an invigilator grants extra time mid-component.
 */
export const extend = (state: TimerState, deltaMilliseconds: number): TimerState => {
    switch (state.status) {
        case 'idle':
            return state;
        case 'running':
            return { status: 'running', endsAt: state.endsAt + deltaMilliseconds };
        case 'paused':
            return { status: 'paused', remainingMs: Math.max(0, state.remainingMs + deltaMilliseconds) };
    }
};

/**
 * Move a running deadline into a wall clock that has just shifted by `skewMilliseconds`,
 * so the time remaining is exactly what it was before the shift. Paused timers
 * hold a duration rather than an instant, so the wall clock cannot affect them.
 */
export const reanchor = (state: TimerState, skewMilliseconds: number): TimerState =>
    state.status === 'running' ? { status: 'running', endsAt: state.endsAt + skewMilliseconds } : state;

export const restore = (
    state: TimerState,
    durationMilliseconds: number,
    now: number,
    { clamp = true }: RestoreOptions = {},
): RestoreResult => {
    if (state.status !== 'running') {
        return { state, clamped: false };
    }
    const remainingExceedsWholeComponent = state.endsAt - now > durationMilliseconds;
    if (clamp && remainingExceedsWholeComponent) {
        return { state: { status: 'running', endsAt: now + durationMilliseconds }, clamped: true };
    }
    return { state, clamped: false };
};
