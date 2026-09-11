import { useState } from "react";
import type { ReactElement, Ref } from "react";
import { Plus } from "lucide-react";
import { SessionTab } from "./SessionTab";
import { MAX_SESSIONS } from "../config/board";
import type { SessionView } from "../lib/sessionView";

type BoardTabsProps = {
  columns: readonly SessionView[];
  /** True while the single column shares the board's row-label lane. */
  labelLaneVisible: boolean;
  onEditSession: (sessionId: string) => void;
  onRequestRemove: (view: SessionView) => void;
  onMoveSession: (sessionId: string, toIndex: number) => void;
  onAddSession: () => void;
  ref: Ref<HTMLTableSectionElement>;
};

const STRIP_CLASSES = "bg-vlec-blue-50";

const STRIP_CELL_CLASSES = "pl-(--tab-flare) pr-0 pt-2 align-bottom";

const STRIP_EDGE_CLASSES = "p-0";

const TAB_ROW_CLASSES = "flex items-end";

const ADD_BUTTON_CLASSES =
  "mb-1 ml-auto mr-4 inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-tab text-linguaskill-slate-500 transition-colors hover:bg-linguaskill-slate-200 hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-linguaskill-slate-300";

const ICON_CLASSES = "h-[1.15em] w-[1.15em]";

/** The strip of browser-style tabs heading the board, one per session. */
export function BoardTabs({
  columns,
  labelLaneVisible,
  onEditSession,
  onRequestRemove,
  onMoveSession,
  onAddSession,
  ref,
}: BoardTabsProps): ReactElement {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <thead ref={ref} className={STRIP_CLASSES}>
      <tr>
        {labelLaneVisible ? null : <td className={STRIP_EDGE_CLASSES}></td>}
        {columns.map((column, index) => (
          <th
            key={column.id}
            className={STRIP_CELL_CLASSES}
            scope="col"
            colSpan={labelLaneVisible ? 2 : undefined}
            aria-label={column.examLabel}
          >
            <span className={TAB_ROW_CLASSES}>
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
                <button
                  className={ADD_BUTTON_CLASSES}
                  type="button"
                  aria-label="Add Session"
                  onClick={onAddSession}
                  disabled={columns.length >= MAX_SESSIONS}
                >
                  <Plus className={ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
                </button>
              )}
            </span>
          </th>
        ))}
      </tr>
    </thead>
  );
}
