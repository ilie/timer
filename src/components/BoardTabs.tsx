import { twMerge } from 'tailwind-merge';
import { useState } from 'react';
import type { ReactElement, Ref } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './UI/Button';
import { SessionTab } from './SessionTab';
import { maxSessions } from '../config/board';
import type { SessionView } from '../lib/sessionView';

type BoardTabsProps = {
    columns: readonly SessionView[];
    /** True while the single column shares the board's row-label lane. */
    labelLaneVisible: boolean;
    onEditSession: (sessionId: string) => void;
    onRequestRemove: (view: SessionView) => void;
    onMoveSession: (sessionId: string, toIndex: number) => void;
    onAddSession: () => void;
    ref: Ref<HTMLTableSectionElement>;
    className?: string;
};

/** The strip of browser-style tabs heading the board, one per session. */
export function BoardTabs({
    columns,
    labelLaneVisible,
    onEditSession,
    onRequestRemove,
    onMoveSession,
    onAddSession,
    ref,
    className,
}: BoardTabsProps): ReactElement {
    const [draggingId, setDraggingId] = useState<string | null>(null);

    return (
        <thead ref={ref} className={twMerge('bg-vlec-blue-50', className)}>
            <tr>
                {labelLaneVisible ? null : <td className="p-0"></td>}
                {columns.map((column, index) => (
                    <th
                        key={column.id}
                        className="pt-2 pr-0 pl-(--tab-flare) align-bottom"
                        scope="col"
                        colSpan={labelLaneVisible ? 2 : undefined}
                        aria-label={column.examLabel}
                    >
                        <span className="flex items-end">
                            <SessionTab
                                view={column}
                                index={index}
                                draggingId={draggingId}
                                onEditSession={onEditSession}
                                onRequestRemove={onRequestRemove}
                                onMoveSession={onMoveSession}
                                onDragStateChange={setDraggingId}
                            />
                            {index === columns.length - 1 && (
                                <Button
                                    variant="quiet"
                                    className="hover:bg-linguaskill-slate-200 focus-visible:outline-vlec-blue-700 disabled:text-linguaskill-slate-300 tab-text mr-4 mb-1 ml-auto rounded-full p-1.5 disabled:cursor-not-allowed disabled:bg-transparent"
                                    aria-label="Add Session"
                                    onClick={onAddSession}
                                    disabled={columns.length >= maxSessions}
                                >
                                    <Plus className="size-[1.15em]" strokeWidth={2.25} aria-hidden="true" />
                                </Button>
                            )}
                        </span>
                    </th>
                ))}
            </tr>
        </thead>
    );
}
