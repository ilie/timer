import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RemainingTime } from './RemainingTime';
import { storageKey } from '../config/storage';
import { formatRemaining } from '../lib/format';
import { remainingMilliseconds } from '../lib/timer';
import type { TimerState } from '../lib/timer';
import { getSnapshot, hydrateFromStorage, startSession } from '../store/boardStore';

const examStart = new Date('2026-06-11T09:00:00.000Z');
const readingMilliseconds = 75 * 60_000;
const tenMinutesMilliseconds = 10 * 60_000;

const seedIdleReadingSession = (): void => {
    localStorage.setItem(
        storageKey,
        JSON.stringify({
            centreNumber: 'ES432',
            sessions: [
                {
                    id: 'reading',
                    examName: 'B2 First',
                    partIndex: 0,
                    mode: 'paper',
                    extraMinutes: 0,
                    timer: { status: 'idle' },
                },
            ],
            break: { timer: { status: 'idle' }, minutes: 15 },
        }),
    );
    hydrateFromStorage();
};

const runningTimerOf = (id: string): TimerState => {
    const timer = getSnapshot().sessions.find((session) => session.id === id)?.timer;
    if (timer === undefined) {
        throw new Error(`No session ${id}`);
    }
    return timer;
};

const advance = (milliseconds: number): void => {
    act(() => {
        vi.advanceTimersByTime(milliseconds);
    });
};

const renderedRemaining = (): string => {
    const value = screen.getByRole('timer').textContent;
    if (value === null) {
        throw new Error('No countdown rendered');
    }
    return value;
};

const reservedRenderings = (): string[] =>
    [...document.querySelectorAll('[data-reservation]')].map((node) => node.textContent ?? '');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(examStart);
    localStorage.clear();
    hydrateFromStorage();
});

afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
});

describe('anchoring', () => {
    it('anchors the end time exactly one duration after the start', () => {
        seedIdleReadingSession();
        startSession('reading');
        const timer = runningTimerOf('reading');

        expect(timer.status).toBe('running');
        expect(timer.status === 'running' && timer.endsAt - Date.now()).toBe(readingMilliseconds);
    });

    it('loses nothing to drift over ten minutes of ticks', () => {
        seedIdleReadingSession();
        startSession('reading');
        const timer = runningTimerOf('reading');

        render(<RemainingTime label={null} timer={timer} durationMilliseconds={readingMilliseconds} />);

        advance(tenMinutesMilliseconds);

        expect(remainingMilliseconds(timer, Date.now())).toBe(readingMilliseconds - 600_000);
        expect(renderedRemaining()).toBe(formatRemaining(readingMilliseconds - 600_000));
    });

    it('shows the whole allowed time while the session is idle', () => {
        render(<RemainingTime label={null} timer={{ status: 'idle' }} durationMilliseconds={readingMilliseconds} />);

        expect(renderedRemaining()).toBe(formatRemaining(readingMilliseconds));
    });
});

describe('width reservation', () => {
    it('reserves the same renderings whatever the value shows', () => {
        const durationMilliseconds = 90 * 60_000;
        const values = [durationMilliseconds, 600_000, 582_000, 0];
        const reservations = values.map((remaining) => {
            const view = render(
                <RemainingTime
                    label={null}
                    timer={{ status: 'running', endsAt: Date.now() + remaining }}
                    durationMilliseconds={durationMilliseconds}
                />,
            );
            const reserved = reservedRenderings();
            view.unmount();
            return reserved;
        });

        expect(reservations[0]).toContain('1h 10min 00sec');
        for (const reserved of reservations) {
            expect(reserved).toEqual(reservations[0]);
        }
    });

    it('marks each threshold on the countdown cell', () => {
        const durationMilliseconds = 20 * 60_000;
        const states = [11 * 60_000, 10 * 60_000, 5 * 60_000, 0].map((remaining) => {
            const view = render(
                <RemainingTime
                    label={null}
                    timer={{ status: 'running', endsAt: Date.now() + remaining }}
                    durationMilliseconds={durationMilliseconds}
                />,
            );
            const state = document.querySelector('[data-state]')?.getAttribute('data-state');
            view.unmount();
            return state;
        });

        expect(states).toEqual(['normal', 'warning', 'critical', 'zero']);
        expect(formatRemaining(0)).toBe('0min 00sec');
    });
});

describe('never counting upward', () => {
    it('never shows more than the allowed time when a stale sample meets a fresh start', () => {
        seedIdleReadingSession();
        const view = render(
            <RemainingTime label={null} timer={{ status: 'idle' }} durationMilliseconds={readingMilliseconds} />,
        );

        expect(renderedRemaining()).toBe('1h 15min 00sec');

        act(() => {
            vi.setSystemTime(examStart.getTime() + 200);
        });
        startSession('reading');
        const started = runningTimerOf('reading');

        view.rerender(<RemainingTime label={null} timer={started} durationMilliseconds={readingMilliseconds} />);

        expect(renderedRemaining()).toBe('1h 15min 00sec');
    });

    it('never ticks upward across a run', () => {
        const durationMilliseconds = 12 * 60_000;
        const timer: TimerState = { status: 'running', endsAt: Date.now() + durationMilliseconds };
        render(<RemainingTime label={null} timer={timer} durationMilliseconds={durationMilliseconds} />);

        let previous = remainingMilliseconds(timer, Date.now());
        for (let step = 0; step < 4 * 60; step += 1) {
            advance(250);
            const current = remainingMilliseconds(timer, Date.now());
            expect(current).toBeLessThanOrEqual(previous);
            previous = current;
            expect(renderedRemaining()).toBe(formatRemaining(Math.min(current, durationMilliseconds)));
        }
    });
});
