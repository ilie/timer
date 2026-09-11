import { twMerge } from 'tailwind-merge';
import type { InputHTMLAttributes, ReactElement, Ref, SelectHTMLAttributes } from 'react';

/** Wiring a field's control needs from the surrounding label and message. */
export type FieldControl = {
    id: string;
    invalid: boolean;
    describedBy: string | undefined;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    control: FieldControl;
    ref?: Ref<HTMLSelectElement>;
};

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
    control: FieldControl;
    ref?: Ref<HTMLInputElement>;
};

/**
 * Shared look for the dialogs' controls. Only the border and focus ring differ
 * between the valid and invalid states, so the two cannot drift apart.
 */
function controlClasses(invalid: boolean): string {
    return twMerge(
        'w-full rounded-lg bg-white px-4 py-3 text-lg text-linguaskill-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-linguaskill-slate-200 disabled:bg-linguaskill-slate-50 disabled:text-linguaskill-slate-400',
        invalid
            ? 'border-2 border-vlec-red-700 focus-visible:outline-vlec-red-700'
            : 'border border-linguaskill-slate-300 hover:border-linguaskill-slate-400 focus-visible:outline-vlec-blue-700',
    );
}

/**
 * Both controls take the whole `control` their `DialogField` hands down, so the
 * id, the invalid state and the message it points at always travel together.
 */
export function Select({ control, className, ...props }: SelectProps): ReactElement {
    return (
        <select
            id={control.id}
            aria-invalid={control.invalid}
            aria-describedby={control.describedBy}
            className={twMerge(controlClasses(control.invalid), className)}
            {...props}
        />
    );
}

export function TextInput({ control, className, ...props }: TextInputProps): ReactElement {
    return (
        <input
            id={control.id}
            aria-invalid={control.invalid}
            aria-describedby={control.describedBy}
            className={twMerge(controlClasses(control.invalid), className)}
            {...props}
        />
    );
}
