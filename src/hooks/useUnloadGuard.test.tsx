import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Board } from '../components/Board';
import { STORAGE_KEY } from '../config/storage';
import { hydrateFromStorage } from '../store/boardStore';

const EXAM_START = new Date('2026-06-11T09:00:00.000Z');

const noRequest = (): void => {};

const seedRunningSession = (endsInMs: number): void => {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            centreNumber: 'ES432',
            sessions: [
                {
                    id: 'reading',
                    examName: 'B2 First',
                    partIndex: 0,
                    mode: 'paper',
                    extraMinutes: 0,
                    timer: { status: 'running', endsAt: EXAM_START.getTime() + endsInMs },
                },
            ],
            break: { timer: { status: 'idle' }, minutes: 15 },
        }),
    );
    hydrateFromStorage();
};

type ListenerSpy = { mock: { calls: unknown[][] } };

const callsFor = (spy: ListenerSpy): number => spy.mock.calls.filter((call) => call[0] === 'beforeunload').length;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(EXAM_START);
    localStorage.clear();
    hydrateFromStorage();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
});

describe('unload guard', () => {
    it('guards only while a session is running and lets go when its end time passes', () => {
        seedRunningSession(2000);
        const listen = vi.spyOn(window, 'addEventListener');
        const stopListening = vi.spyOn(window, 'removeEventListener');

        render(<Board onAddSession={noRequest} onEditSession={noRequest} onEditCentreNumber={noRequest} />);

        expect(callsFor(listen)).toBe(1);
        expect(callsFor(stopListening)).toBe(0);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(callsFor(stopListening)).toBe(1);
    });

    it('does not guard a board with nothing running', () => {
        const listen = vi.spyOn(window, 'addEventListener');

        render(<Board onAddSession={noRequest} onEditSession={noRequest} onEditCentreNumber={noRequest} />);

        expect(callsFor(listen)).toBe(0);
    });
});
