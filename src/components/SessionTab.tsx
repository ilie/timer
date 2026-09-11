import type { DragEvent, KeyboardEvent, ReactElement } from "react";
import { X } from "lucide-react";
import { ExamName } from "./ExamName";
import type { SessionView } from "../lib/sessionView";

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
};

const TAB_CLASSES =
  "browser-tab group/tab flex min-w-0 cursor-grab items-center gap-1 pb-1.5 pl-4 pr-2 pt-1.5 text-tab active:cursor-grabbing";

const TAB_DRAGGING_CLASSES = "opacity-50";

const LABEL_CLASSES =
  "inline-flex min-w-0 items-baseline rounded font-medium text-linguaskill-slate-700 transition-colors hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const CLOSE_CLASSES =
  "inline-flex shrink-0 items-center justify-center rounded-full p-1 text-linguaskill-slate-400 transition-colors hover:bg-linguaskill-slate-200 hover:text-vlec-blue-900 focus-visible:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const ICON_CLASSES = "h-[1.15em] w-[1.15em]";

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
}: SessionTabProps): ReactElement {
  function handleDragStart(event: DragEvent<HTMLSpanElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", view.id);
    onDragStateChange(view.id);
  }

  function handleDragOver(event: DragEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
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
    if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {
      return;
    }
    // Alt+Arrow is the browser's own back/forward, so keep it to ourselves.
    event.preventDefault();
    onMoveSession(view.id, index + (event.key === "ArrowLeft" ? -1 : 1));
  }

  return (
    <span
      className={draggingId === view.id ? `${TAB_CLASSES} ${TAB_DRAGGING_CLASSES}` : TAB_CLASSES}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      <button
        className={LABEL_CLASSES}
        type="button"
        aria-label={`Configure ${view.examLabel}`}
        aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
        onClick={() => {
          onEditSession(view.id);
        }}
        onKeyDown={handleKeyDown}
      >
        <ExamName name={view.examName} digital={view.digital} centred={false} />
      </button>
      <button
        className={CLOSE_CLASSES}
        type="button"
        aria-label={`Remove ${view.examLabel}`}
        onClick={() => {
          onRequestRemove(view);
        }}
      >
        <X className={ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </span>
  );
}
