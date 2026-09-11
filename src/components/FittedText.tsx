import type { ReactElement, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type FittedTextProps = {
    /** Which measurement group this belongs to; `useBoardScale` reads both. */
    measureAs: 'value' | 'label';
    className?: string;
    children: ReactNode;
};

/**
 * Text the board scales to fit the screen. `useBoardScale` measures every one
 * of these and sets the font size they all read from.
 */
export function FittedText({ measureAs, className, children }: FittedTextProps): ReactElement {
    return (
        <span
            data-fit={measureAs}
            className={twMerge(
                'inline-block align-middle text-[length:var(--board-value-size,1.75rem)] leading-none whitespace-nowrap',
                className,
            )}
        >
            {children}
        </span>
    );
}
