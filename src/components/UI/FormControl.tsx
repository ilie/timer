import type { InputHTMLAttributes, ReactElement, Ref, SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    invalid?: boolean;
    ref?: Ref<HTMLSelectElement>;
};

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
    invalid?: boolean;
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

export function Select({ invalid = false, className, ...props }: SelectProps): ReactElement {
    return <select className={twMerge(controlClasses(invalid), className)} {...props} />;
}

export function TextInput({ invalid = false, className, ...props }: TextInputProps): ReactElement {
    return <input className={twMerge(controlClasses(invalid), className)} {...props} />;
}
