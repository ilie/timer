import type { ReactElement } from 'react';
import { Monitor } from 'lucide-react';
import { mergeClasses } from '../lib/mergeClasses';

type ExamNameProps = {
    name: string;
    /** Whether to mark the name as a digital sitting of an otherwise paper exam. */
    digital: boolean;
    /** Balances the trailing badge with an invisible one so the name stays centred. */
    centred: boolean;
};

type DigitalBadgeProps = {
    /** Renders the badge as an invisible spacer on the name's other side. */
    balancing?: boolean;
    className?: string;
};

/**
 * The dot marking a digital sitting.
 *
 * overflow-hidden keeps the badge's baseline at its bottom edge, which is what
 * lines it up with the text in both the tab strip and the board.
 */
function DigitalBadge({ balancing = false, className }: DigitalBadgeProps): ReactElement {
    return (
        <span
            className={mergeClasses(
                'bg-vlec-red-700 inline-flex size-[0.72em] items-center justify-center overflow-hidden rounded-full align-baseline text-white',
                balancing ? 'invisible mr-[0.3em]' : 'ml-[0.3em]',
                className,
            )}
            role={balancing ? undefined : 'img'}
            aria-label={balancing ? undefined : 'Digital'}
            aria-hidden={balancing ? true : undefined}
        >
            {!balancing && <Monitor className="size-[0.5em]" strokeWidth={2.25} aria-hidden="true" />}
        </span>
    );
}

export function ExamName({ name, digital, centred }: ExamNameProps): ReactElement {
    if (!digital) {
        return <>{name}</>;
    }
    return (
        <>
            {centred && <DigitalBadge balancing />}
            {name}
            <DigitalBadge />
        </>
    );
}
