import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardTabs } from './BoardTabs';
import type { SessionView } from '../lib/sessionView';

const view = (id: string, examName: string): SessionView =>
    ({
        id,
        examName,
        examLabel: examName,
        partName: 'Reading',
        digital: false,
        status: 'idle',
        countsDown: false,
        durationMilliseconds: 0,
        extraMinutes: 0,
        allowedTime: '45min',
        timer: { status: 'idle' },
    }) as SessionView;

const columns = [view('a', 'A2 Key'), view('b', 'B2 First'), view('c', 'C1 Advanced')];

const noop = () => {};

const renderTabs = (onMoveSession: (id: string, to: number) => void) =>
    render(
        <table>
            <BoardTabs
                ref={null}
                columns={columns}
                labelLaneVisible={false}
                onEditSession={noop}
                onRequestRemove={noop}
                onMoveSession={onMoveSession}
                onAddSession={noop}
            />
        </table>,
    );

const tabFor = (examLabel: string): HTMLElement => {
    const tab = screen.getByRole('button', { name: `Configure ${examLabel}` }).closest('span');
    if (tab === null) {
        throw new Error(`No tab for ${examLabel}`);
    }
    return tab;
};

const dataTransfer = () => ({ effectAllowed: '', dropEffect: '', setData: () => {}, getData: () => '' });

describe('dragging a tab along the strip', () => {
    it('reorders as the tab passes over a neighbour, not only on drop', () => {
        const moves: Array<[string, number]> = [];
        renderTabs((id, to) => moves.push([id, to]));

        fireEvent.dragStart(tabFor('A2 Key'), { dataTransfer: dataTransfer() });
        fireEvent.dragEnter(tabFor('C1 Advanced'), { dataTransfer: dataTransfer() });

        expect(moves).toEqual([['a', 2]]);
    });

    it('ignores a tab dragged over itself', () => {
        const moves: Array<[string, number]> = [];
        renderTabs((id, to) => moves.push([id, to]));

        fireEvent.dragStart(tabFor('B2 First'), { dataTransfer: dataTransfer() });
        fireEvent.dragEnter(tabFor('B2 First'), { dataTransfer: dataTransfer() });

        expect(moves).toEqual([]);
    });

    it('does nothing on a stray drag-over with no drag in progress', () => {
        const moves: Array<[string, number]> = [];
        renderTabs((id, to) => moves.push([id, to]));

        fireEvent.dragEnter(tabFor('C1 Advanced'), { dataTransfer: dataTransfer() });

        expect(moves).toEqual([]);
    });

    it('stops reordering once the drag ends', () => {
        const moves: Array<[string, number]> = [];
        renderTabs((id, to) => moves.push([id, to]));

        fireEvent.dragStart(tabFor('A2 Key'), { dataTransfer: dataTransfer() });
        fireEvent.dragEnd(tabFor('A2 Key'), { dataTransfer: dataTransfer() });
        fireEvent.dragEnter(tabFor('C1 Advanced'), { dataTransfer: dataTransfer() });

        expect(moves).toEqual([]);
    });
});

describe('moving a tab from the keyboard', () => {
    it('moves left and right with Alt and an arrow key', async () => {
        const user = userEvent.setup();
        const moves: Array<[string, number]> = [];
        renderTabs((id, to) => moves.push([id, to]));

        screen.getByRole('button', { name: 'Configure B2 First' }).focus();
        await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
        await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');

        expect(moves).toEqual([
            ['b', 2],
            ['b', 0],
        ]);
    });

    it('leaves a plain arrow key alone', async () => {
        const user = userEvent.setup();
        const moves: Array<[string, number]> = [];
        renderTabs((id, to) => moves.push([id, to]));

        screen.getByRole('button', { name: 'Configure B2 First' }).focus();
        await user.keyboard('{ArrowRight}');

        expect(moves).toEqual([]);
    });
});
