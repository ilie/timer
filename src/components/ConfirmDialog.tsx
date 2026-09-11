import { useId } from 'react';
import type { ReactElement } from 'react';
import { TriangleAlert } from 'lucide-react';
import { ModalDialog } from './ModalDialog';

type ConfirmDialogProps = {
    title: string;
    message: string;
    detail: string;
    confirmLabel: string;
    onConfirm: () => void;
    onClose: () => void;
    className?: string;
};

export function ConfirmDialog({
    title,
    message,
    detail,
    confirmLabel,
    onConfirm,
    onClose,
    className,
}: ConfirmDialogProps): ReactElement {
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
            <p className="text-linguaskill-slate-900 text-lg font-medium text-pretty">{detail}</p>
        </ModalDialog>
    );
}
