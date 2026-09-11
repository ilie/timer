import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClockAlert } from './ClockAlert';
import { STORAGE_KEY } from '../config/storage';
import {
    applyClockStep,
    hydrateFromStorage,
    reportUnverifiedClockJump,
    setClockJumpDetected,
    startSession,
} from '../store/boardStore';

const seedRunningSession = (): void => {
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
                    timer: { status: 'idle' },
                },
            ],
            break: { timer: { status: 'idle' }, minutes: 15 },
        }),
    );
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

    it('can be dismissed once the invigilator has seen it', async () => {
        const user = userEvent.setup();
        seedRunningSession();
        applyClockStep(-60 * 60_000);
        render(<ClockAlert />);

        await user.click(screen.getByRole('button', { name: 'Dismiss' }));

        expect(screen.queryByRole('alert')).toBeNull();
    });
});
