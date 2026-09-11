import type { ReactElement, ReactNode } from 'react';
import { FittedText } from './FittedText';

type BoardValueProps = {
    /** The per-column caption, or null while the shared label lane carries it. */
    label: string | null;
    children: ReactNode;
    className?: string;
};

/** One value on the board, sized by the fitter and captioned when it stands alone. */
export function BoardValue({ label, children, className }: BoardValueProps): ReactElement {
    return (
        <FittedText measureAs="value" className={className}>
            {label !== null && (
                <span className="text-linguaskill-slate-400 mb-[0.35em] block text-[0.28em] leading-tight font-semibold tracking-[0.2em] uppercase">
                    {label}
                </span>
            )}
            {children}
        </FittedText>
    );
}
