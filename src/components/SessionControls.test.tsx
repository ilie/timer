import { render, screen } from '@testing-library/react';
import { SessionControls } from './SessionControls';
import type { SessionView } from '../lib/sessionView';
import type { TimerStatus } from '../lib/timer';

function runningView(status: TimerStatus): SessionView {
    return {
        id: 'reading',
        examLabel: 'C2 Proficiency',
        examName: 'C2 Proficiency',
        digital: false,
        partName: 'Reading & Use of English',
        allowedTime: '1h 30min',
        extraMinutes: 0,
        countsDown: true,
        timer: { status: 'running', endsAt: Date.now() + 60_000 },
        durationMs: 90 * 60_000,
        status,
        nextPartName: null,
    };
}

const noop = () => {};

describe('the run control on the board', () => {
    // The board's own font sizes look like colour utilities to tailwind-merge.
    // Unconfigured it drops text-white, leaving dark text on the dark button.
    it.each([
        ['idle', 'Start'],
        ['running', 'Pause'],
        ['paused', 'Resume'],
    ] as const)('keeps its white text while showing %s', (status, label) => {
        render(<SessionControls view={runningView(status)} onRequestReset={noop} />);

        expect(screen.getByRole('button', { name: label })).toHaveClass('text-white', 'bg-vlec-blue-900');
    });

    it('leaves the quiet Reset button without a solid background', () => {
        render(<SessionControls view={runningView('running')} onRequestReset={noop} />);

        const reset = screen.getByRole('button', { name: 'Reset' });
        expect(reset).not.toHaveClass('text-white');
        expect(reset).not.toHaveClass('bg-vlec-blue-900');
    });
});
