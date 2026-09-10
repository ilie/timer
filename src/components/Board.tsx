import { useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { COLUMN_LABEL_CLASSES, RemainingTime } from "./RemainingTime";
import { SessionControls, describeSession } from "./SessionColumn";
import type { SessionView } from "./SessionColumn";
import { MAX_SESSIONS } from "../config/board";
import { useUnloadGuard } from "../hooks/useUnloadGuard";
import { densityFor, formatRemaining } from "../lib/format";
import { remainingMs } from "../lib/timer";
import { getSnapshot, removeSession, resetSession, subscribe } from "../store/boardStore";

type BoardProps = {
  onAddSession: () => void;
  onEditSession: (sessionId: string) => void;
  onEditCentreNumber: () => void;
};

type ConfigureSessionButtonProps = {
  id: string;
  examLabel: string;
  onEditSession: (sessionId: string) => void;
};

type RemoveSessionButtonProps = {
  view: SessionView;
  onRequestRemove: (view: SessionView) => void;
};

type PendingAction = {
  kind: "remove" | "reset";
  sessionId: string;
  examLabel: string;
  partName: string;
  remaining: string;
};

type BoardRowSpec = {
  label: string;
  labelledPerColumn: boolean;
  cellClassesFor: (column: SessionView) => string;
  rowSpanFor?: (column: SessionView) => number | undefined;
  omitsCell?: (column: SessionView) => boolean;
  render: (column: SessionView) => ReactNode;
};

const BOARD_CLASSES =
  "group/board @container/board flex h-full min-h-0 w-full flex-col gap-1";

const CENTRE_NUMBER_CLASSES =
  "mr-auto inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left font-medium uppercase tracking-[0.14em] text-linguaskill-slate-400 transition-colors hover:bg-linguaskill-slate-100 hover:text-linguaskill-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 text-column-label";

const CENTRE_NUMBER_ICON_CLASSES = "h-[0.7em] w-[0.7em] shrink-0";

const GRID_CLASSES = "h-full w-full table-fixed border-collapse";

const GRID_FRAME_CLASSES = "min-h-0 flex-1";

const LABEL_COLUMN_CLASSES = "w-[13%] @max-[60rem]/board:w-[22%]";

const COLLAPSED_LABEL_COLUMN_CLASSES = "w-0";

const ADD_COLUMN_CLASSES = "w-16 @max-[60rem]/board:w-12";

const SESSION_COLUMN_CLASSES = "border-r border-dashed border-linguaskill-slate-200";

const LAST_SESSION_COLUMN_CLASSES = "border-0";

const TAB_CELL_CLASSES = "border-b border-linguaskill-slate-200 px-1 pt-2 align-bottom";

const STRIP_EDGE_CLASSES = "border-b border-linguaskill-slate-200 p-0";

const ADD_CELL_CLASSES = "border-b border-linguaskill-slate-200 px-1 pt-2 align-bottom";

const TAB_CLASSES =
  "group/tab -mb-px flex w-full items-center justify-between gap-1 rounded-t-lg border border-b-0 border-linguaskill-slate-200 bg-linguaskill-slate-50 px-3 py-2 text-left text-column-label";

const TAB_LABEL_CLASSES =
  "min-w-0 flex-1 truncate rounded text-left font-medium text-linguaskill-slate-600 transition-colors hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const TAB_CLOSE_CLASSES =
  "inline-flex shrink-0 items-center justify-center rounded p-1 text-linguaskill-slate-300 transition-colors group-hover/tab:text-linguaskill-slate-500 hover:bg-linguaskill-slate-200 hover:text-linguaskill-slate-900 focus-visible:text-linguaskill-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const ADD_BUTTON_CLASSES =
  "-mb-px inline-flex w-full items-center justify-center rounded-t-lg border border-b-0 border-transparent px-3 py-2 text-column-label text-linguaskill-slate-400 transition-colors hover:border-linguaskill-slate-200 hover:bg-linguaskill-slate-50 hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-linguaskill-slate-200";

const ROW_LABEL_CLASSES =
  "px-5 py-2 text-right align-middle font-medium uppercase tracking-[0.14em] text-linguaskill-slate-400 text-column-label";

const COLLAPSED_ROW_LABEL_CLASSES = "w-0 p-0";

const ROW_CLASSES = "align-middle";

const COUNTDOWN_ROW_CLASSES = "h-[45%] align-middle";

const VALUE_CELL_CLASSES =
  "px-3 py-2 text-center align-middle text-balance text-linguaskill-slate-900 text-exam group-data-[density=compact]/board:text-exam-compact";

const REMAINING_CELL_CLASSES = "relative";

const CONTROLS_CELL_CLASSES = "px-3 py-2 text-center align-middle";

const SPACER_CELL_CLASSES = "";

const EXTRA_TIME_CLASSES =
  "ml-2 rounded-md bg-linguaskill-slate-100 px-2 py-0.5 font-medium text-linguaskill-slate-600";

const NO_COUNTDOWN_CELL_CLASSES = "";

const EMPTY_BOARD_CLASSES =
  "flex h-full flex-col items-center justify-center gap-6 text-center text-linguaskill-slate-400 text-exam";

const EMPTY_BOARD_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-lg bg-vlec-blue-900 px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-vlec-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-900";

const TAB_ICON_CLASSES = "h-[1.15em] w-[1.15em]";

let clockSample = { revision: -1, now: 0 };

function getBoardClock(): number {
  const { revision } = getSnapshot();
  if (clockSample.revision !== revision) {
    clockSample = { revision, now: Date.now() };
  }
  return clockSample.now;
}

function ConfigureSessionButton({
  id,
  examLabel,
  onEditSession,
}: ConfigureSessionButtonProps): ReactElement {
  function handleConfigure() {
    onEditSession(id);
  }

  return (
    <button
      className={TAB_LABEL_CLASSES}
      type="button"
      aria-label={`Configure ${examLabel}`}
      onClick={handleConfigure}
    >
      {examLabel}
    </button>
  );
}

function RemoveSessionButton({ view, onRequestRemove }: RemoveSessionButtonProps): ReactElement {
  function handleRemove() {
    onRequestRemove(view);
  }

  return (
    <button
      className={TAB_CLOSE_CLASSES}
      type="button"
      aria-label={`Remove ${view.examLabel}`}
      onClick={handleRemove}
    >
      <X className={TAB_ICON_CLASSES} aria-hidden="true" />
    </button>
  );
}

function pendingActionFor(kind: PendingAction["kind"], view: SessionView): PendingAction {
  const remaining =
    view.timer.status === "idle"
      ? view.durationMs
      : Math.max(0, Math.min(remainingMs(view.timer, Date.now()), view.durationMs));
  return {
    kind,
    sessionId: view.id,
    examLabel: view.examLabel,
    partName: view.partName,
    remaining: formatRemaining(remaining),
  };
}

export function Board({
  onAddSession,
  onEditSession,
  onEditCentreNumber,
}: BoardProps): ReactElement {
  const board = useSyncExternalStore(subscribe, getSnapshot);
  const now = useSyncExternalStore(subscribe, getBoardClock);
  const density = densityFor(board.sessions.length);
  const columns = board.sessions.map((session, index) =>
    describeSession(session, index + 1, density, now),
  );
  const labelColumnVisible = columns.length === 1;
  const anyColumnCountsDown = columns.some((column) => column.countsDown);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useUnloadGuard(columns.some((column) => column.status === "running"));

  function handleThresholdCross() {}

  function handleRemoveRequest(view: SessionView) {
    if (view.status === "idle") {
      removeSession(view.id);
      return;
    }
    setPendingAction(pendingActionFor("remove", view));
  }

  function handleResetRequest(view: SessionView) {
    if (view.status !== "running" && view.status !== "paused") {
      resetSession(view.id);
      return;
    }
    setPendingAction(pendingActionFor("reset", view));
  }

  function handleConfirmPendingAction() {
    if (pendingAction === null) {
      return;
    }
    if (pendingAction.kind === "remove") {
      removeSession(pendingAction.sessionId);
      return;
    }
    resetSession(pendingAction.sessionId);
  }

  function handleClosePendingAction() {
    setPendingAction(null);
  }

  const supportingRows: BoardRowSpec[] = [
    {
      label: "Exam",
      cellClassesFor: () => VALUE_CELL_CLASSES,
      labelledPerColumn: true,
      render: (column) => column.examLabel,
    },
    {
      label: "Part",
      cellClassesFor: () => VALUE_CELL_CLASSES,
      labelledPerColumn: true,
      render: (column) => column.partName,
    },
    {
      label: "Time",
      cellClassesFor: () => VALUE_CELL_CLASSES,
      labelledPerColumn: true,
      render: (column) =>
        column.extraMinutes > 0 ? (
          <span>
            {column.allowedTime}
            <span className={EXTRA_TIME_CLASSES}>+{column.extraMinutes}min</span>
          </span>
        ) : (
          column.allowedTime
        ),
    },
  ];

  const countdownRows: BoardRowSpec[] = [
    {
      label: "Remaining",
      cellClassesFor: (column) =>
        column.countsDown ? REMAINING_CELL_CLASSES : NO_COUNTDOWN_CELL_CLASSES,
      rowSpanFor: (column) => (column.countsDown ? undefined : 2),
      labelledPerColumn: false,
      render: (column) =>
        column.countsDown ? (
          <RemainingTime
            label={labelColumnVisible ? null : "Remaining"}
            timer={column.timer}
            durationMs={column.durationMs}
            onThresholdCross={handleThresholdCross}
          />
        ) : null,
    },
    {
      label: "Controls",
      cellClassesFor: () => CONTROLS_CELL_CLASSES,
      omitsCell: (column) => !column.countsDown,
      labelledPerColumn: false,
      render: (column) => <SessionControls view={column} onRequestReset={handleResetRequest} />,
    },
  ];

  const rows = anyColumnCountsDown ? [...supportingRows, ...countdownRows] : supportingRows;

  return (
    <section className={BOARD_CLASSES} data-density={density} data-columns={columns.length}>
      <button
        className={CENTRE_NUMBER_CLASSES}
        type="button"
        aria-label="Edit centre number"
        onClick={onEditCentreNumber}
      >
        <Pencil className={CENTRE_NUMBER_ICON_CLASSES} aria-hidden="true" />
        Centre no: {board.centreNumber}
      </button>
      {columns.length === 0 ? (
        <div className={EMPTY_BOARD_CLASSES}>
          <p className="text-pretty">No sessions yet.</p>
          <button className={EMPTY_BOARD_BUTTON_CLASSES} type="button" onClick={onAddSession}>
            <Plus className="h-[1.15em] w-[1.15em]" aria-hidden="true" />
            Add Session
          </button>
        </div>
      ) : (
        <div className={GRID_FRAME_CLASSES}>
          <table className={GRID_CLASSES}>
            <caption className="sr-only">Exam sessions</caption>
            <colgroup>
              <col
                className={
                  labelColumnVisible ? LABEL_COLUMN_CLASSES : COLLAPSED_LABEL_COLUMN_CLASSES
                }
              />
              {columns.map((column, index) => (
                <col
                  key={column.id}
                  className={
                    index === columns.length - 1
                      ? LAST_SESSION_COLUMN_CLASSES
                      : SESSION_COLUMN_CLASSES
                  }
                />
              ))}
              <col className={ADD_COLUMN_CLASSES} />
            </colgroup>
            <thead>
              <tr>
                <td className={STRIP_EDGE_CLASSES}></td>
                {columns.map((column) => (
                  <th key={column.id} className={TAB_CELL_CLASSES} scope="col">
                    <span className={TAB_CLASSES}>
                      <ConfigureSessionButton
                        id={column.id}
                        examLabel={column.examLabel}
                        onEditSession={onEditSession}
                      />
                      <RemoveSessionButton view={column} onRequestRemove={handleRemoveRequest} />
                    </span>
                  </th>
                ))}
                <td className={ADD_CELL_CLASSES}>
                  <button
                    className={ADD_BUTTON_CLASSES}
                    type="button"
                    aria-label="Add Session"
                    onClick={onAddSession}
                    disabled={columns.length >= MAX_SESSIONS}
                  >
                    <Plus className={TAB_ICON_CLASSES} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={
                    row.label === "Remaining" && anyColumnCountsDown
                      ? COUNTDOWN_ROW_CLASSES
                      : ROW_CLASSES
                  }
                >
                  <th
                    className={labelColumnVisible ? ROW_LABEL_CLASSES : COLLAPSED_ROW_LABEL_CLASSES}
                    scope="row"
                  >
                    {labelColumnVisible ? row.label : <span className="sr-only">{row.label}</span>}
                  </th>
                  {columns.map((column) => {
                    if (row.omitsCell !== undefined && row.omitsCell(column)) {
                      return null;
                    }
                    const rowSpan = row.rowSpanFor === undefined ? undefined : row.rowSpanFor(column);
                    return (
                      <td key={column.id} className={row.cellClassesFor(column)} rowSpan={rowSpan}>
                        {!labelColumnVisible && row.labelledPerColumn && rowSpan === undefined ? (
                          <span aria-hidden="true" className={COLUMN_LABEL_CLASSES}>
                            {row.label}
                          </span>
                        ) : null}
                        {row.render(column)}
                      </td>
                    );
                  })}
                  <td className={SPACER_CELL_CLASSES}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pendingAction !== null && (
        <ConfirmDialog
          title={pendingAction.kind === "remove" ? "Close This Session?" : "Reset This Countdown?"}
          message={
            pendingAction.kind === "remove"
              ? "Closing removes the column and its countdown from the board."
              : "Resetting returns the countdown to the full allowed time."
          }
          detail={`${pendingAction.examLabel} — ${pendingAction.partName} still has ${pendingAction.remaining} left.`}
          confirmLabel={pendingAction.kind === "remove" ? "Close Session" : "Reset Countdown"}
          onConfirm={handleConfirmPendingAction}
          onClose={handleClosePendingAction}
        />
      )}
    </section>
  );
}
