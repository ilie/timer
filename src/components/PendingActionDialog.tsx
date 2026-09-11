import type { ReactElement } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { formatRemaining } from '../lib/format';
import type { SessionView } from '../lib/sessionView';
import { remainingMs } from '../lib/timer';

export type PendingActionKind = 'remove' | 'reset';

/** A destructive request held back until the invigilator confirms it. */
export type PendingAction = {
    kind: PendingActionKind;
    sessionId: string;
    examLabel: string;
    partName: string;
    remaining: string;
};

type PendingActionDialogProps = {
    action: PendingAction;
    onConfirm: () => void;
    onClose: () => void;
    className?: string;
};

const CONFIRMATIONS: Record<PendingActionKind, { title: string; message: string; confirmLabel: string }> = {
    remove: {
        title: 'Close This Session?',
        message: 'Closing removes the column and its countdown from the board.',
        confirmLabel: 'Close Session',
    },
    reset: {
        title: 'Reset This Countdown?',
        message: 'Resetting returns the countdown to the full allowed time.',
        confirmLabel: 'Reset Countdown',
    },
};

/** What the countdown reads when the action is taken, for the confirmation to quote. */
export function pendingActionFor(kind: PendingActionKind, view: SessionView): PendingAction {
    const remaining =
        view.timer.status === 'idle'
            ? view.durationMs
            : Math.max(0, Math.min(remainingMs(view.timer, Date.now()), view.durationMs));
    return {
        kind,
        sessionId: view.id,
        examLabel: view.examLabel,
        partName: view.partName,
        remaining: formatRemaining(remaining),
    };
}

export function PendingActionDialog({ action, onConfirm, onClose, className }: PendingActionDialogProps): ReactElement {
    const { title, message, confirmLabel } = CONFIRMATIONS[action.kind];

    return (
        <ConfirmDialog
            title={title}
            message={message}
            detail={`${action.examLabel} — ${action.partName} still has ${action.remaining} left.`}
            confirmLabel={confirmLabel}
            onConfirm={onConfirm}
            onClose={onClose}
            className={className}
        />
    );
}
