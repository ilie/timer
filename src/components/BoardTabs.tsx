import type { ReactElement, Ref } from "react";
import { Plus, X } from "lucide-react";
import { ExamName } from "./ExamName";
import { MAX_SESSIONS } from "../config/board";
import type { SessionView } from "../lib/sessionView";

type BoardTabsProps = {
  columns: readonly SessionView[];
  /** True while the single column shares the board's row-label lane. */
  labelLaneVisible: boolean;
  onEditSession: (sessionId: string) => void;
  onRequestRemove: (view: SessionView) => void;
  onAddSession: () => void;
  ref: Ref<HTMLTableSectionElement>;
};

type SessionTabProps = {
  view: SessionView;
  onEditSession: (sessionId: string) => void;
  onRequestRemove: (view: SessionView) => void;
};

const STRIP_CLASSES = "bg-vlec-blue-50";

const STRIP_CELL_CLASSES = "pl-(--tab-flare) pr-0 pt-2 align-bottom";

const STRIP_EDGE_CLASSES = "p-0";

const TAB_ROW_CLASSES = "flex items-end";

const TAB_CLASSES =
  "browser-tab group/tab flex min-w-0 items-center gap-1 pb-1.5 pl-4 pr-2 pt-1.5 text-tab";

const TAB_LABEL_CLASSES =
  "inline-flex min-w-0 items-baseline rounded font-medium text-linguaskill-slate-700 transition-colors hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const TAB_CLOSE_CLASSES =
  "inline-flex shrink-0 items-center justify-center rounded-full p-1 text-linguaskill-slate-400 transition-colors hover:bg-linguaskill-slate-200 hover:text-vlec-blue-900 focus-visible:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const ADD_BUTTON_CLASSES =
  "mb-1 ml-auto mr-4 inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-tab text-linguaskill-slate-500 transition-colors hover:bg-linguaskill-slate-200 hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-linguaskill-slate-300";

const ICON_CLASSES = "h-[1.15em] w-[1.15em]";

function SessionTab({ view, onEditSession, onRequestRemove }: SessionTabProps): ReactElement {
  function handleConfigure() {
    onEditSession(view.id);
  }

  function handleRemove() {
    onRequestRemove(view);
  }

  return (
    <span className={TAB_CLASSES}>
      <button
        className={TAB_LABEL_CLASSES}
        type="button"
        aria-label={`Configure ${view.examLabel}`}
        onClick={handleConfigure}
      >
        <ExamName name={view.examName} digital={view.digital} centred={false} />
      </button>
      <button
        className={TAB_CLOSE_CLASSES}
        type="button"
        aria-label={`Remove ${view.examLabel}`}
        onClick={handleRemove}
      >
        <X className={ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </span>
  );
}

/** The strip of browser-style tabs heading the board, one per session. */
export function BoardTabs({
  columns,
  labelLaneVisible,
  onEditSession,
  onRequestRemove,
  onAddSession,
  ref,
}: BoardTabsProps): ReactElement {
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
                onEditSession={onEditSession}
                onRequestRemove={onRequestRemove}
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
