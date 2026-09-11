import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClockAlert } from './ClockAlert';
import { storageKey } from '../config/storage';
import {
    applyClockStep,
    hydrateFromStorage,
    reportUnverifiedClockJump,
    setClockJumpDetected,
    startSession,
} from '../store/boardStore';

const storedBoard = (timer: unknown): string =>
    JSON.stringify({
        centreNumber: 'ES432',
        sessions: [
            {
                id: 'reading',
                examName: 'B2 First',
                partIndex: 0,
                mode: 'paper',
                extraMinutes: 0,
                timer,
            },
        ],
        break: { timer: { status: 'idle' }, minutes: 15 },
    });

const seedRunningSession = (): void => {
    localStorage.setItem(storageKey, storedBoard({ status: 'idle' }));
    hydrateFromStorage();
    startSession('reading');
};

beforeEach(() => {
    localStorage.clear();
    setClockJumpDetected(false);
    hydrateFromStorage();
});

afterEach(() => {
    localStorage.clear();
    setClockJumpDetected(false);
});

describe('the clock warning the invigilator sees', () => {
    it('stays out of the way while the clock behaves', () => {
        render(<ClockAlert />);

        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('says the times were corrected when the step could be compensated for', () => {
        seedRunningSession();
        applyClockStep(-60 * 60_000);

        render(<ClockAlert />);

        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('1h back');
        expect(alert).toHaveTextContent('still correct');
    });

    it('asks for the times to be checked when the gap could not be accounted for', () => {
        seedRunningSession();
        reportUnverifiedClockJump(10 * 60_000);

        render(<ClockAlert />);

        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('10min forward');
        expect(alert).toHaveTextContent('Check the times below');
    });

    it('reads as one sentence with the skew set into it', () => {
        seedRunningSession();
        applyClockStep(-60 * 60_000);

        render(<ClockAlert />);

        expect(screen.getByRole('alert').textContent).toBe(
            'The system clock moved 1h back. The times below were adjusted to match and are still correct.',
        );
    });

    it('warns without a skew when a restored deadline had to be cut back', () => {
        // A deadline further away than the component is long means the clock moved
        // while the board was closed, by an amount nobody can measure afterwards.
        localStorage.setItem(storageKey, storedBoard({ status: 'running', endsAt: Date.now() + 10 * 60 * 60_000 }));
        hydrateFromStorage();

        render(<ClockAlert />);

        expect(screen.getByRole('alert').textContent).toBe(
            'The system clock changed. Check the times below against a clock you trust before relying on them.',
        );
    });

    it('can be dismissed once the invigilator has seen it', async () => {
        const user = userEvent.setup();
        seedRunningSession();
        applyClockStep(-60 * 60_000);
        render(<ClockAlert />);

        await user.click(screen.getByRole('button', { name: 'Dismiss' }));

        expect(screen.queryByRole('alert')).toBeNull();
    });
});
