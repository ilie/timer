import { useId } from 'react';
import { mergeClasses } from '../lib/mergeClasses';
import type { ReactElement, ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Wiring a field's control needs from the surrounding label and message. */
export type DialogControl = {
    id: string;
    invalid: boolean;
    describedBy: string | undefined;
};

type DialogFieldProps = {
    label: string;
    icon: LucideIcon;
    /** Marks the field as required and shows the word beside its label. */
    required?: boolean;
    /** The message to show, or null while the field has nothing to report. */
    error?: string | null;
    /** Standing guidance, shown only while there is no error to show instead. */
    hint?: string;
    children: (control: DialogControl) => ReactNode;
    className?: string;
};

type DialogLabelProps = {
    htmlFor: string;
    icon: LucideIcon;
    children: ReactNode;
    className?: string;
};

type DialogErrorProps = {
    id: string;
    children: ReactNode;
    className?: string;
};

type DialogHintProps = {
    children: ReactNode;
    className?: string;
};

export function DialogHint({ children, className }: DialogHintProps): ReactElement {
    return <p className={mergeClasses('text-linguaskill-slate-500 text-base', className)}>{children}</p>;
}

export function DialogError({ id, children, className }: DialogErrorProps): ReactElement {
    return (
        <p
            id={id}
            role="alert"
            className={mergeClasses(
                'text-vlec-red-700 inline-flex items-center gap-2 text-base font-semibold',
                className,
            )}
        >
            <CircleAlert className="size-[1em] shrink-0" aria-hidden="true" />
            {children}
        </p>
    );
}

function DialogLabel({ htmlFor, icon: LabelIcon, children, className }: DialogLabelProps): ReactElement {
    return (
        <label
            htmlFor={htmlFor}
            className={mergeClasses(
                'text-linguaskill-slate-700 inline-flex items-center gap-2 text-base font-medium',
                className,
            )}
        >
            <LabelIcon className="text-linguaskill-slate-400 size-[1em] shrink-0" aria-hidden="true" />
            {children}
        </label>
    );
}

/**
 * One labelled control in a dialog, with its required mark, hint and error
 * message. The control itself is supplied the ids and validity it must carry.
 */
export function DialogField({
    label,
    icon,
    required = false,
    error = null,
    hint,
    children,
    className,
}: DialogFieldProps): ReactElement {
    const id = useId();
    const errorId = useId();
    const invalid = error !== null;

    return (
        <div className={mergeClasses('flex flex-col gap-2', className)}>
            {required ? (
                <div className="flex items-baseline gap-2">
                    <DialogLabel htmlFor={id} icon={icon}>
                        {label}
                    </DialogLabel>
                    <span className="text-linguaskill-slate-500 text-sm" aria-hidden="true">
                        required
                    </span>
                </div>
            ) : (
                <DialogLabel htmlFor={id} icon={icon}>
                    {label}
                </DialogLabel>
            )}
            {children({ id, invalid, describedBy: invalid ? errorId : undefined })}
            {error !== null && <DialogError id={errorId}>{error}</DialogError>}
            {error === null && hint !== undefined && <DialogHint>{hint}</DialogHint>}
        </div>
    );
}
