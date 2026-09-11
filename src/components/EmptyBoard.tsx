import { twMerge } from 'tailwind-merge';
import type { ReactElement } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './UI/Button';

type EmptyBoardProps = {
    onAddSession: () => void;
    className?: string;
};

export function EmptyBoard({ onAddSession, className }: EmptyBoardProps): ReactElement {
    return (
        <div
            className={twMerge(
                'text-linguaskill-slate-500 flex h-full flex-col items-center justify-center gap-6',
                className,
            )}
        >
            <p className="centre-number-text tracking-[0.16em] text-pretty uppercase">No sessions yet</p>
            <Button className="tab-text gap-3 rounded-full px-8 py-4" onClick={onAddSession}>
                <Plus className="size-[1.15em]" strokeWidth={2.25} aria-hidden="true" />
                Add Session
            </Button>
        </div>
    );
}
