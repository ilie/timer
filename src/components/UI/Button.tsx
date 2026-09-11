import type { ButtonHTMLAttributes, ReactElement, Ref } from 'react';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'primary' | 'destructive' | 'quiet' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    ref?: Ref<HTMLButtonElement>;
};

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-vlec-blue-900 text-white hover:bg-vlec-blue-700 focus-visible:outline-vlec-blue-900',
    destructive: 'bg-vlec-red-700 text-white hover:bg-vlec-red-800 focus-visible:outline-vlec-red-700',
    quiet: 'text-linguaskill-slate-500 hover:bg-linguaskill-slate-100 hover:text-vlec-blue-900 focus-visible:outline-linguaskill-slate-500',
    ghost: 'text-linguaskill-slate-400 hover:bg-linguaskill-slate-200 hover:text-vlec-blue-900 focus-visible:text-vlec-blue-900 focus-visible:outline-vlec-blue-700',
};

/**
 * Every button on the board, so the focus ring and the colour states are
 * written once. Size and shape come from `className`, merged with
 * `tailwind-merge` so an override always wins over the variant.
 */
export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps): ReactElement {
    return (
        <button
            type={type}
            className={twMerge(
                'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
                variantClasses[variant],
                className,
            )}
            {...props}
        />
    );
}
