import { twMerge } from 'tailwind-merge';
import { useEffect, useId, useRef } from 'react';
import type { FormEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { Check, TriangleAlert, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './UI/Button';

type ModalDialogProps = {
    title: string;
    titleIcon: LucideIcon;
    submitLabel: string;
    /** Id of the element describing the dialog, announced after its title. */
    describedBy?: string;
    /** Styles the submit button as a warning and swaps its tick for an alert. */
    destructive?: boolean;
    onSubmit: () => boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
};

export function ModalDialog({
    title,
    titleIcon: TitleIcon,
    submitLabel,
    describedBy,
    destructive = false,
    onSubmit,
    onClose,
    children,
    className,
}: ModalDialogProps): ReactElement {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const pressStartedOnBackdrop = useRef(false);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog === null) {
            return;
        }
        if (!dialog.open) {
            dialog.showModal();
        }
        const preferred = dialog.querySelector<HTMLElement>('[data-initial-focus]');
        if (preferred === null) {
            cancelRef.current?.focus();
            return;
        }
        preferred.focus();
        // Deliberately no cleanup that closes the dialog: `close()` fires the
        // dialog's close event, which every caller reads as the user dismissing it.
        // Each close path here already closes before unmounting, so there is no
        // orphaned top-layer entry to tidy up.
    }, []);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!onSubmit()) {
            return;
        }
        dialogRef.current?.close();
    }

    function close() {
        dialogRef.current?.close();
    }

    function rememberPressOrigin(event: MouseEvent<HTMLDialogElement>) {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
    }

    /** Only a press that both started and ended on the backdrop closes the dialog,
     *  so dragging a selection out of the form does not dismiss it. */
    function closeIfBackdropClicked(event: MouseEvent<HTMLDialogElement>) {
        const startedOnBackdrop = pressStartedOnBackdrop.current;
        pressStartedOnBackdrop.current = false;
        if (!startedOnBackdrop || event.target !== event.currentTarget) {
            return;
        }
        dialogRef.current?.close();
    }

    return (
        <dialog
            ref={dialogRef}
            className={twMerge(
                'border-linguaskill-slate-200 text-linguaskill-slate-900 backdrop:bg-linguaskill-slate-950/40 m-auto w-[min(92vw,42rem)] rounded-2xl border bg-white p-0 shadow-2xl',
                className,
            )}
            aria-labelledby={titleId}
            aria-describedby={describedBy}
            onClose={onClose}
            onMouseDown={rememberPressOrigin}
            onClick={closeIfBackdropClicked}
        >
            <form className="flex flex-col gap-6 p-8" onSubmit={submit} noValidate>
                <div className="flex items-start justify-between gap-4">
                    <h2
                        id={titleId}
                        className="text-vlec-blue-900 inline-flex items-center gap-3 text-2xl font-semibold text-pretty"
                    >
                        <TitleIcon className="size-[0.85em] shrink-0" aria-hidden="true" />
                        {title}
                    </h2>
                    <Button
                        variant="ghost"
                        className="hover:text-linguaskill-slate-900 -mt-2 -mr-2 rounded-lg p-2"
                        aria-label="Close"
                        onClick={close}
                    >
                        <X className="size-6" aria-hidden="true" />
                    </Button>
                </div>
                <div className="flex flex-col gap-5">{children}</div>
                <div className="border-linguaskill-slate-200 flex flex-wrap items-center justify-end gap-2 border-t pt-5">
                    <Button
                        ref={cancelRef}
                        variant="quiet"
                        className="hover:text-linguaskill-slate-900 rounded-lg px-5 py-3 text-lg"
                        onClick={close}
                    >
                        <X className="size-[1em]" aria-hidden="true" />
                        Cancel
                    </Button>
                    <Button
                        variant={destructive ? 'destructive' : 'primary'}
                        className="rounded-lg px-5 py-3 text-lg"
                        type="submit"
                    >
                        {destructive ? (
                            <TriangleAlert className="size-[1em]" aria-hidden="true" />
                        ) : (
                            <Check className="size-[1em]" aria-hidden="true" />
                        )}
                        {submitLabel}
                    </Button>
                </div>
            </form>
        </dialog>
    );
}
