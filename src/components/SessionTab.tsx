import type { DragEvent, KeyboardEvent, ReactElement } from 'react';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { ExamName } from './ExamName';
import { Button } from './UI/Button';
import type { SessionView } from '../lib/sessionView';

type SessionTabProps = {
    view: SessionView;
    index: number;
    /** The session being dragged, if any. Read from state, not from the event:
     *  dataTransfer is unreadable during dragenter in every browser. */
    draggingId: string | null;
    onEditSession: (sessionId: string) => void;
    onRequestRemove: (view: SessionView) => void;
    onMoveSession: (sessionId: string, toIndex: number) => void;
    onDragStateChange: (sessionId: string | null) => void;
    className?: string;
};

/**
 * One session's tab, draggable along the strip the way a browser tab is.
 *
 * The reorder happens as the tab passes over its neighbour rather than on drop,
 * so the strip rearranges under the cursor while the drag is still in progress.
 */
export function SessionTab({
    view,
    index,
    draggingId,
    onEditSession,
    onRequestRemove,
    onMoveSession,
    onDragStateChange,
    className,
}: SessionTabProps): ReactElement {
    function handleDragStart(event: DragEvent<HTMLSpanElement>) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', view.id);
        onDragStateChange(view.id);
    }

    function handleDragOver(event: DragEvent<HTMLSpanElement>) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter() {
        if (draggingId !== null && draggingId !== view.id) {
            onMoveSession(draggingId, index);
        }
    }

    function handleDrop(event: DragEvent<HTMLSpanElement>) {
        event.preventDefault();
        onDragStateChange(null);
    }

    function handleDragEnd() {
        onDragStateChange(null);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
            return;
        }
        // Alt+Arrow is the browser's own back/forward, so keep it to ourselves.
        event.preventDefault();
        onMoveSession(view.id, index + (event.key === 'ArrowLeft' ? -1 : 1));
    }

    return (
        <span
            className={twMerge(
                'browser-tab group/tab text-tab flex min-w-0 cursor-grab items-center gap-1 pt-1.5 pr-2 pb-1.5 pl-4 active:cursor-grabbing',
                draggingId === view.id && 'opacity-50',
                className,
            )}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
        >
            <Button
                variant="quiet"
                className="text-linguaskill-slate-700 hover:text-vlec-blue-900 focus-visible:outline-vlec-blue-700 inline-flex min-w-0 items-baseline gap-0 rounded bg-transparent hover:bg-transparent"
                aria-label={`Configure ${view.examLabel}`}
                aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
                onClick={() => {
                    onEditSession(view.id);
                }}
                onKeyDown={handleKeyDown}
            >
                <ExamName name={view.examName} digital={view.digital} centred={false} />
            </Button>
            <Button
                variant="ghost"
                className="rounded-full p-1"
                aria-label={`Remove ${view.examLabel}`}
                onClick={() => {
                    onRequestRemove(view);
                }}
            >
                <X className="size-[1.15em]" strokeWidth={2.25} aria-hidden="true" />
            </Button>
        </span>
    );
}
