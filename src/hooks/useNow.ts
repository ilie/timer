import { useSyncExternalStore } from 'react';
import { DISPLAY_TICK_MS } from '../config/timing';

/**
 * One shared wall-clock sample for the whole board.
 *
 * Every column reads the same value, so two columns can never render times a
 * second apart, and the sample is refreshed the moment the page becomes
 * visible again rather than waiting out an interval the browser throttled
 * while the display was asleep.
 */
let now = Date.now();

const listeners = new Set<() => void>();

let ticker: ReturnType<typeof setInterval> | null = null;

const publish = (): void => {
    const sample = Date.now();
    if (sample === now) {
        return;
    }
    now = sample;
    for (const listener of listeners) {
        listener();
    }
};

const resyncIfVisible = (): void => {
    if (document.visibilityState === 'visible') {
        publish();
    }
};

const startTicking = (): void => {
    now = Date.now();
    ticker = setInterval(publish, DISPLAY_TICK_MS);
    document.addEventListener('visibilitychange', resyncIfVisible);
    window.addEventListener('pageshow', publish);
};

const stopTicking = (): void => {
    if (ticker !== null) {
        clearInterval(ticker);
        ticker = null;
    }
    document.removeEventListener('visibilitychange', resyncIfVisible);
    window.removeEventListener('pageshow', publish);
};

const subscribeToClock = (listener: () => void): (() => void) => {
    listeners.add(listener);
    if (listeners.size === 1) {
        startTicking();
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            stopTicking();
        }
    };
};

const getClockSnapshot = (): number => now;

export function useNow(): number {
    return useSyncExternalStore(subscribeToClock, getClockSnapshot);
}
