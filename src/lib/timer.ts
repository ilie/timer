import { CRITICAL_MS, WARNING_MS } from '../config/thresholds';

export type TimerState =
    { status: 'idle' } | { status: 'running'; endsAt: number } | { status: 'paused'; remainingMs: number };

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export type Threshold = 'normal' | 'warning' | 'critical' | 'zero';

export type RemainingOptions = { allowNegative?: boolean };

export type RestoreOptions = { clamp?: boolean };

export type RestoreResult = {
    state: TimerState;
    clamped: boolean;
};

const signedRemainingMs = (state: TimerState, now: number): number => {
    switch (state.status) {
        case 'idle':
            return 0;
        case 'running':
            return state.endsAt - now;
        case 'paused':
            return state.remainingMs;
    }
};

export const remainingMs = (
    state: TimerState,
    now: number,
    { allowNegative = false }: RemainingOptions = {},
): number => {
    const signedRemaining = signedRemainingMs(state, now);
    return allowNegative ? signedRemaining : Math.max(0, signedRemaining);
};

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

export const thresholdOf = (ms: number): Threshold => {
    if (ms <= 0) {
        return 'zero';
    }
    if (ms <= CRITICAL_MS) {
        return 'critical';
    }
    if (ms <= WARNING_MS) {
        return 'warning';
    }
    return 'normal';
};

export const start = (durationMs: number, now: number): TimerState => ({
    status: 'running',
    endsAt: now + durationMs,
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
export const extend = (state: TimerState, deltaMs: number): TimerState => {
    switch (state.status) {
        case 'idle':
            return state;
        case 'running':
            return { status: 'running', endsAt: state.endsAt + deltaMs };
        case 'paused':
            return { status: 'paused', remainingMs: Math.max(0, state.remainingMs + deltaMs) };
    }
};

/**
 * Move a running deadline into a wall clock that has just shifted by `skewMs`,
 * so the time remaining is exactly what it was before the shift. Paused timers
 * hold a duration rather than an instant, so the wall clock cannot affect them.
 */
export const reanchor = (state: TimerState, skewMs: number): TimerState =>
    state.status === 'running' ? { status: 'running', endsAt: state.endsAt + skewMs } : state;

export const restore = (
    state: TimerState,
    durationMs: number,
    now: number,
    { clamp = true }: RestoreOptions = {},
): RestoreResult => {
    if (state.status !== 'running') {
        return { state, clamped: false };
    }
    const remainingExceedsWholeComponent = state.endsAt - now > durationMs;
    if (clamp && remainingExceedsWholeComponent) {
        return { state: { status: 'running', endsAt: now + durationMs }, clamped: true };
    }
    return { state, clamped: false };
};
