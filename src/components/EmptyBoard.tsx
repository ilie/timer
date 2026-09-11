import type { ReactElement } from 'react';
import { Plus } from 'lucide-react';
import { mergeClasses } from '../lib/mergeClasses';
import { Button } from './UI/Button';

type EmptyBoardProps = {
    onAddSession: () => void;
    className?: string;
};

export function EmptyBoard({ onAddSession, className }: EmptyBoardProps): ReactElement {
    return (
        <div
            className={mergeClasses(
                'text-linguaskill-slate-500 flex h-full flex-col items-center justify-center gap-6',
                className,
            )}
        >
            <p className="text-centre-number tracking-[0.16em] text-pretty uppercase">No sessions yet</p>
            <Button className="text-tab gap-3 rounded-full px-8 py-4" onClick={onAddSession}>
                <Plus className="size-[1.15em]" strokeWidth={2.25} aria-hidden="true" />
                Add Session
            </Button>
        </div>
    );
}
