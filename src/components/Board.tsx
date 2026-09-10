import { useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { RemainingTime } from "./RemainingTime";
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
  cellClasses: string;
  labelledPerColumn: boolean;
  render: (column: SessionView) => ReactNode;
};

const NO_COUNTDOWN = "—";

const BOARD_CLASSES =
  "group/board @container/board flex h-full min-h-0 w-full flex-col gap-1";

const CENTRE_NUMBER_CLASSES =
  "mr-auto shrink-0 cursor-pointer rounded-md px-1 text-left font-semibold uppercase tracking-[0.2em] text-vlec-blue-700 transition-colors hover:bg-vlec-blue-50 hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 text-label group-data-[density=compact]/board:text-column-label";

const GRID_CLASSES = "h-full w-full table-fixed border-collapse";

const GRID_FRAME_CLASSES = "min-h-0 flex-1";

const LABEL_COLUMN_CLASSES = "w-[13%] @max-[60rem]/board:w-[22%]";

const COLLAPSED_LABEL_COLUMN_CLASSES = "w-0";

const ADD_COLUMN_CLASSES = "w-16 @max-[60rem]/board:w-12";

const SESSION_COLUMN_CLASSES = "border-r border-dashed border-linguaskill-slate-300";

const LAST_SESSION_COLUMN_CLASSES = "border-0";

const TAB_CELL_CLASSES = "align-bottom px-1 pt-1";

const TAB_CLASSES =
  "flex w-full items-center justify-between gap-2 rounded-t-xl bg-vlec-blue-900 px-3 py-2 text-left text-white";

const TAB_LABEL_CLASSES =
  "min-w-0 flex-1 truncate rounded-md text-left font-semibold tracking-wide text-tab transition-colors group-data-[density=compact]/board:text-tab-compact hover:text-vlec-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const TAB_CLOSE_CLASSES =
  "inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-vlec-blue-100 transition-colors hover:bg-vlec-red-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const ADD_BUTTON_CLASSES =
  "inline-flex w-full items-center justify-center rounded-xl bg-vlec-blue-700 p-2 text-white transition-colors hover:bg-vlec-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 disabled:cursor-not-allowed disabled:bg-linguaskill-slate-200 disabled:text-linguaskill-slate-500";

const ROW_LABEL_CLASSES =
  "border-b border-vlec-blue-100 bg-vlec-blue-50 px-4 py-1 text-right align-middle font-semibold uppercase tracking-wide text-vlec-blue-900 text-label group-data-[density=compact]/board:text-label-compact";

const COLLAPSED_ROW_LABEL_CLASSES = "w-0 p-0";

const CELL_LABEL_CLASSES =
  "block font-semibold uppercase leading-tight tracking-[0.18em] text-vlec-blue-600 text-column-label group-data-[density=compact]/board:text-column-label-compact";

const ROW_CLASSES = "align-middle";

const VALUE_CELL_CLASSES =
  "border-b border-vlec-blue-100 px-3 py-1 text-center align-middle text-linguaskill-slate-900 text-exam group-data-[density=compact]/board:text-exam-compact";

const REMAINING_CELL_CLASSES = "border-b border-vlec-blue-100 px-2 py-1 text-center align-middle";

const CONTROLS_CELL_CLASSES = "px-3 py-1 text-center align-middle";

const SPACER_CELL_CLASSES = "border-b border-vlec-blue-100";

const EXTRA_TIME_CLASSES =
  "ml-2 rounded-md bg-linguaskill-slate-200 px-2 py-0.5 font-semibold text-linguaskill-slate-900";

const NO_COUNTDOWN_CLASSES =
  "font-semibold text-linguaskill-slate-400 text-exam group-data-[density=compact]/board:text-exam-compact";

const EMPTY_BOARD_CLASSES =
  "flex h-full flex-col items-center justify-center gap-4 rounded-xl bg-vlec-blue-50 text-center font-semibold text-vlec-blue-900 text-exam";

const EMPTY_BOARD_BUTTON_CLASSES =
  "inline-flex items-center gap-3 rounded-xl bg-vlec-blue-700 px-6 py-3 text-white transition-colors hover:bg-vlec-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const TAB_ICON_CLASSES =
  "h-[1em] w-[1em] text-tab group-data-[density=compact]/board:text-tab-compact";

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

  const rows: BoardRowSpec[] = [
    {
      label: "Exam",
      cellClasses: VALUE_CELL_CLASSES,
      labelledPerColumn: true,
      render: (column) => column.examLabel,
    },
    {
      label: "Part",
      cellClasses: VALUE_CELL_CLASSES,
      labelledPerColumn: true,
      render: (column) => column.partName,
    },
    {
      label: "Time",
      cellClasses: VALUE_CELL_CLASSES,
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
    {
      label: "Remaining",
      cellClasses: REMAINING_CELL_CLASSES,
      labelledPerColumn: true,
      render: (column) =>
        column.countsDown ? (
          <RemainingTime
            timer={column.timer}
            durationMs={column.durationMs}
            onThresholdCross={handleThresholdCross}
          />
        ) : (
          <span className={NO_COUNTDOWN_CLASSES}>{NO_COUNTDOWN}</span>
        ),
    },
    {
      label: "Controls",
      cellClasses: CONTROLS_CELL_CLASSES,
      labelledPerColumn: false,
      render: (column) => <SessionControls view={column} onRequestReset={handleResetRequest} />,
    },
  ];

  return (
    <section className={BOARD_CLASSES} data-density={density} data-columns={columns.length}>
      <button
        className={CENTRE_NUMBER_CLASSES}
        type="button"
        aria-label="Edit centre number"
        onClick={onEditCentreNumber}
      >
        Centre no: {board.centreNumber}
      </button>
      {columns.length === 0 ? (
        <div className={EMPTY_BOARD_CLASSES}>
          <p>No sessions yet.</p>
          <button className={EMPTY_BOARD_BUTTON_CLASSES} type="button" onClick={onAddSession}>
            <Plus className="h-[1em] w-[1em]" aria-hidden="true" />
            Add session
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
              <tr className="h-px">
                <td className="p-0"></td>
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
                <td className="align-bottom pb-1 pl-1">
                  <button
                    className={ADD_BUTTON_CLASSES}
                    type="button"
                    aria-label="Add session"
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
                <tr key={row.label} className={ROW_CLASSES}>
                  <th
                    className={labelColumnVisible ? ROW_LABEL_CLASSES : COLLAPSED_ROW_LABEL_CLASSES}
                    scope="row"
                  >
                    {labelColumnVisible ? row.label : <span className="sr-only">{row.label}</span>}
                  </th>
                  {columns.map((column) => (
                    <td key={column.id} className={row.cellClasses}>
                      {!labelColumnVisible && row.labelledPerColumn ? (
                        <span aria-hidden="true" className={CELL_LABEL_CLASSES}>
                          {row.label}
                        </span>
                      ) : null}
                      {row.render(column)}
                    </td>
                  ))}
                  <td className={SPACER_CELL_CLASSES}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pendingAction !== null && (
        <ConfirmDialog
          title={pendingAction.kind === "remove" ? "Close this session?" : "Reset this countdown?"}
          message={
            pendingAction.kind === "remove"
              ? "Closing removes the column and its countdown from the board."
              : "Resetting returns the countdown to the full allowed time."
          }
          detail={`${pendingAction.examLabel} — ${pendingAction.partName} still has ${pendingAction.remaining} left.`}
          confirmLabel={pendingAction.kind === "remove" ? "Close session" : "Reset countdown"}
          onConfirm={handleConfirmPendingAction}
          onClose={handleClosePendingAction}
        />
      )}
    </section>
  );
}
