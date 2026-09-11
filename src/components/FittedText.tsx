import { twMerge } from 'tailwind-merge';
import type { ReactElement, ReactNode } from 'react';

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
            className={twMerge('board-value-text inline-block align-middle leading-none whitespace-nowrap', className)}
        >
            {children}
        </span>
    );
}
