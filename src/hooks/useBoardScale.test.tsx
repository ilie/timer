import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Board } from '../components/Board';
import { storageKey } from '../config/storage';
import { hydrateFromStorage } from '../store/boardStore';

// jsdom lays nothing out, so every box the fitter measures is stubbed here: one
// width for the row labels, another for the values, and a roomy board to fit
// them in. That is enough to pin how the two lanes divide the width between them.
const labelWidth = 100;

const valueWidth = 300;

const tabStripHeight = 40;

const boxOf = (width: number, height: number): DOMRect =>
    ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0 }) as DOMRect;

const paperSession = (id: string, examName: string) => ({
    id,
    examName,
    partIndex: 0,
    mode: 'paper',
    extraMinutes: 0,
    timer: { status: 'idle' },
});

const seed = (sessions: readonly unknown[]): void => {
    localStorage.setItem(
        storageKey,
        JSON.stringify({
            centreNumber: 'ES432',
            sessions,
            break: { timer: { status: 'idle' }, minutes: 15 },
        }),
    );
    hydrateFromStorage();
};

const noop = () => {};

const renderBoard = (): HTMLElement => {
    const { container } = render(<Board onAddSession={noop} onEditSession={noop} onEditCentreNumber={noop} />);
    const board = container.firstElementChild;
    if (!(board instanceof HTMLElement)) {
        throw new Error('No board rendered');
    }
    return board;
};

beforeEach(() => {
    localStorage.clear();
    hydrateFromStorage();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element): DOMRect {
        const lane = this instanceof HTMLElement ? this.dataset.fit : undefined;
        if (lane === 'label') {
            return boxOf(labelWidth, 20);
        }
        if (lane === 'value') {
            return boxOf(valueWidth, 40);
        }
        if (this.tagName === 'THEAD') {
            return boxOf(1000, tabStripHeight);
        }
        return boxOf(1000, 500);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
});

describe('the width given to the row-label lane', () => {
    it('splits it between the widest label and the widest value', () => {
        seed([paperSession('one', 'B2 First')]);

        const board = renderBoard();

        // 100 / (100 + 300): the labels take their share of the two lanes, no more.
        expect(board.style.getPropertyValue('--board-label-lane')).toBe('25.000%');
    });

    it('gives the lane nothing once a second column takes the labels away', () => {
        seed([paperSession('one', 'B2 First'), paperSession('two', 'C1 Advanced')]);

        const board = renderBoard();

        expect(board.style.getPropertyValue('--board-label-lane')).toBe('0.000%');
    });
});
