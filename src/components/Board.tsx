import { useRef, useState, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import { Pencil } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Button } from './UI/Button';
import { BoardGrid } from './BoardGrid';
import { EmptyBoard } from './EmptyBoard';
import { PendingActionDialog, pendingActionFor } from './PendingActionDialog';
import type { PendingAction } from './PendingActionDialog';
import { rowHeights, useBoardScale } from '../hooks/useBoardScale';
import type { BoardScaleLayout } from '../hooks/useBoardScale';
import { useUnloadGuard } from '../hooks/useUnloadGuard';
import { densityFor } from '../lib/format';
import { describeSession } from '../lib/sessionView';
import type { SessionView } from '../lib/sessionView';
import {
    getClockSnapshot,
    getSnapshot,
    moveSession,
    removeSession,
    resetSession,
    subscribe,
} from '../store/boardStore';

type BoardProps = {
    onAddSession: () => void;
    onEditSession: (sessionId: string) => void;
    onEditCentreNumber: () => void;
    className?: string;
};

const SUPPORTING_ROWS = 3;

const COUNTDOWN_ROWS = 4;

export function Board({ onAddSession, onEditSession, onEditCentreNumber, className }: BoardProps): ReactElement {
    const board = useSyncExternalStore(subscribe, getSnapshot);
    const now = useSyncExternalStore(subscribe, getClockSnapshot);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const boardRef = useRef<HTMLElement>(null);
    const focusBoardAfterClose = useRef(false);
    const regionRef = useRef<HTMLDivElement>(null);
    const tabStripRef = useRef<HTMLTableSectionElement>(null);

    const density = densityFor(board.sessions.length);
    const columns = board.sessions.map((session) => describeSession(session, density, now));
    const labelLaneVisible = columns.length === 1;
    const showsCountdown = columns.some((column) => column.countsDown);

    const layout: BoardScaleLayout = {
        columns: Math.max(1, columns.length),
        valueRows: showsCountdown ? COUNTDOWN_ROWS : SUPPORTING_ROWS,
        hasControlsRow: showsCountdown,
        labelLane: labelLaneVisible,
    };

    useBoardScale(boardRef, regionRef, tabStripRef, layout);
    useUnloadGuard(columns.some((column) => column.status === 'running'));

    /** Removing a column destroys the button that had focus, so take it back. */
    function focusBoard() {
        boardRef.current?.focus();
    }

    function handleRemoveRequest(view: SessionView) {
        if (view.status === 'idle') {
            removeSession(view.id);
            focusBoard();
            return;
        }
        setPendingAction(pendingActionFor('remove', view));
    }

    function handleResetRequest(view: SessionView) {
        if (view.status !== 'running' && view.status !== 'paused') {
            resetSession(view.id);
            return;
        }
        setPendingAction(pendingActionFor('reset', view));
    }

    function handleConfirmPendingAction() {
        if (pendingAction === null) {
            return;
        }
        if (pendingAction.kind === 'remove') {
            removeSession(pendingAction.sessionId);
            focusBoardAfterClose.current = true;
            return;
        }
        resetSession(pendingAction.sessionId);
    }

    function handleClosePendingAction() {
        setPendingAction(null);
        if (focusBoardAfterClose.current) {
            focusBoardAfterClose.current = false;
            focusBoard();
        }
    }

    return (
        <section
            ref={boardRef}
            tabIndex={-1}
            className={twMerge('flex h-full min-h-0 w-full flex-col', className)}
            data-density={density}
            data-columns={columns.length}
        >
            <Button
                variant="quiet"
                className="text-centre-number focus-visible:outline-vlec-blue-700 mr-auto mb-2 ml-6 items-baseline rounded-md px-2 py-1 text-left font-normal tracking-[0.16em] uppercase"
                aria-label={`Edit centre no: ${board.centreNumber}`}
                onClick={onEditCentreNumber}
            >
                <Pencil className="size-[0.75em] shrink-0 self-center" strokeWidth={2.25} aria-hidden="true" />
                Centre no: <span className="text-vlec-blue-900 font-semibold">{board.centreNumber}</span>
            </Button>
            {columns.length === 0 ? (
                <EmptyBoard onAddSession={onAddSession} />
            ) : (
                <BoardGrid
                    columns={columns}
                    labelLaneVisible={labelLaneVisible}
                    showsCountdown={showsCountdown}
                    heights={rowHeights(layout)}
                    onAddSession={onAddSession}
                    onEditSession={onEditSession}
                    onRequestRemove={handleRemoveRequest}
                    onRequestReset={handleResetRequest}
                    onMoveSession={moveSession}
                    regionRef={regionRef}
                    tabStripRef={tabStripRef}
                />
            )}
            {pendingAction !== null && (
                <PendingActionDialog
                    action={pendingAction}
                    onConfirm={handleConfirmPendingAction}
                    onClose={handleClosePendingAction}
                />
            )}
        </section>
    );
}
