import { useId } from 'react';
import type { ReactElement } from 'react';
import { TriangleAlert } from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { formatRemaining } from '../lib/format';
import type { SessionView } from '../lib/sessionView';
import { displayedRemainingMilliseconds } from '../lib/timer';

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

const confirmations: Record<PendingActionKind, { title: string; message: string; confirmLabel: string }> = {
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
    return {
        kind,
        sessionId: view.id,
        examLabel: view.examLabel,
        partName: view.partName,
        remaining: formatRemaining(displayedRemainingMilliseconds(view.timer, view.durationMilliseconds, Date.now())),
    };
}

export function PendingActionDialog({ action, onConfirm, onClose, className }: PendingActionDialogProps): ReactElement {
    const { title, message, confirmLabel } = confirmations[action.kind];
    const messageId = useId();

    function confirm(): boolean {
        onConfirm();
        return true;
    }

    return (
        <ModalDialog
            title={title}
            titleIcon={TriangleAlert}
            submitLabel={confirmLabel}
            describedBy={messageId}
            destructive
            onSubmit={confirm}
            onClose={onClose}
            className={className}
        >
            <p id={messageId} className="text-linguaskill-slate-600 text-lg text-pretty">
                {message}
            </p>
            <p className="text-linguaskill-slate-900 text-lg font-medium text-pretty">
                {`${action.examLabel} — ${action.partName} still has ${action.remaining} left.`}
            </p>
        </ModalDialog>
    );
}
