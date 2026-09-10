import { useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";
import { Monitor, Pencil, Plus, X } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { COLUMN_LABEL_CLASSES, FIT_CLASSES, RemainingTime } from "./RemainingTime";
import { SessionControls, describeSession } from "./SessionColumn";
import type { SessionView } from "./SessionColumn";
import { MAX_SESSIONS } from "../config/board";
import { rowHeights, useBoardScale } from "../hooks/useBoardScale";
import type { BoardScaleLayout } from "../hooks/useBoardScale";
import { useUnloadGuard } from "../hooks/useUnloadGuard";
import { densityFor, formatRemaining } from "../lib/format";
import { remainingMs } from "../lib/timer";
import { getSnapshot, removeSession, resetSession, subscribe } from "../store/boardStore";

type BoardProps = {
  onAddSession: () => void;
  onEditSession: (sessionId: string) => void;
  onEditCentreNumber: () => void;
};

type SessionTabProps = {
  view: SessionView;
  onEditSession: (sessionId: string) => void;
  onRequestRemove: (view: SessionView) => void;
};

type ValueCellProps = {
  label: string | null;
  children: ReactNode;
};

type DigitalMarkProps = {
  shown: boolean;
};

type PendingAction = {
  kind: "remove" | "reset";
  sessionId: string;
  examLabel: string;
  partName: string;
  remaining: string;
};

type BoardRow = {
  label: string;
  countdown: boolean;
  cellClassesFor: (column: SessionView) => string;
  rowSpanFor?: (column: SessionView) => number | undefined;
  omitsCell?: (column: SessionView) => boolean;
  render: (column: SessionView) => ReactNode;
};

const LABEL_LANE_FRACTION = 0.3;

const BOARD_CLASSES = "group/board @container/board flex h-full min-h-0 w-full flex-col";

const CENTRE_NUMBER_CLASSES =
  "mb-2 mr-auto inline-flex shrink-0 cursor-pointer items-baseline gap-2 rounded-md px-2 py-1 text-left uppercase tracking-[0.16em] text-linguaskill-slate-500 transition-colors hover:bg-linguaskill-slate-100 hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 text-centre-number";

const CENTRE_NUMBER_VALUE_CLASSES = "font-semibold text-vlec-blue-900";

const CENTRE_NUMBER_ICON_CLASSES = "h-[0.75em] w-[0.75em] shrink-0 self-center";

const REGION_CLASSES = "min-h-0 flex-1 overflow-hidden";

const GRID_CLASSES = "h-full w-full table-fixed border-collapse";

const LABEL_COLUMN_CLASSES = "w-[30%]";

const COLLAPSED_LABEL_COLUMN_CLASSES = "w-0";

const TAB_STRIP_CLASSES = "bg-linguaskill-slate-50";

const TAB_STRIP_CELL_CLASSES = "pl-[var(--tab-flare)] pr-0 pt-2 align-bottom";

const TAB_STRIP_EDGE_CLASSES = "p-0";

const TAB_ROW_CLASSES = "flex items-end";

const TAB_CLASSES =
  "browser-tab group/tab flex min-w-0 items-center gap-1 pb-1.5 pl-4 pr-2 pt-1.5 text-tab";

const TAB_LABEL_CLASSES =
  "inline-flex min-w-0 items-baseline rounded font-medium text-linguaskill-slate-700 transition-colors hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const TAB_CLOSE_CLASSES =
  "inline-flex shrink-0 items-center justify-center rounded-full p-1 text-linguaskill-slate-400 transition-colors hover:bg-linguaskill-slate-200 hover:text-vlec-blue-900 focus-visible:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const ADD_BUTTON_CLASSES =
  "mb-1 ml-auto mr-2 inline-flex shrink-0 items-center justify-center rounded-full p-1.5 text-tab text-linguaskill-slate-400 transition-colors hover:bg-linguaskill-slate-200 hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-linguaskill-slate-300";

const ROW_LABEL_CLASSES = "overflow-hidden text-right align-middle";

const ROW_LABEL_TEXT_CLASSES = `${FIT_CLASSES} pr-[0.35em] font-semibold text-linguaskill-slate-500 after:content-[':']`;

const COLLAPSED_ROW_LABEL_CLASSES = "w-0 p-0";

const VALUE_CELL_CLASSES = "overflow-hidden align-middle";

const CENTRED_VALUE_CLASSES = "text-center";

const ALIGNED_VALUE_CLASSES = "text-left";

const SEPARATOR_CLASSES = "border-r border-dashed border-linguaskill-slate-300";

const CONTROLS_CELL_CLASSES = "px-3 align-middle";

const EXTRA_TIME_CLASSES =
  "ml-[0.35em] align-middle text-[0.5em] font-medium tracking-wide text-linguaskill-slate-500";

const EMPTY_CELL_CLASSES = "";

const EMPTY_BOARD_CLASSES =
  "flex h-full flex-col items-center justify-center gap-8 text-center text-linguaskill-slate-400";

const EMPTY_BOARD_TEXT_CLASSES = "text-pretty text-centre-number tracking-[0.16em] uppercase";

const EMPTY_BOARD_BUTTON_CLASSES =
  "inline-flex items-center gap-3 rounded-full bg-vlec-blue-900 px-8 py-4 text-tab font-medium text-white transition-colors hover:bg-vlec-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-900";

const ICON_CLASSES = "h-[1.15em] w-[1.15em]";

const DIGITAL_MARK_CLASSES =
  "relative ml-[0.3em] inline-block h-[0.72em] w-[0.72em] overflow-hidden rounded-full bg-vlec-red-700 align-baseline text-white";

const DIGITAL_MARK_ICON_CLASSES =
  "absolute left-1/2 top-1/2 h-[0.42em] w-[0.42em] -translate-x-1/2 -translate-y-1/2";

let clockSample = { revision: -1, now: 0 };

function getBoardClock(): number {
  const { revision } = getSnapshot();
  if (clockSample.revision !== revision) {
    clockSample = { revision, now: Date.now() };
  }
  return clockSample.now;
}

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
        {view.examName}
        <DigitalMark shown={view.digital} />
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

function DigitalMark({ shown }: DigitalMarkProps): ReactElement | null {
  if (!shown) {
    return null;
  }
  return (
    <span className={DIGITAL_MARK_CLASSES} role="img" aria-label="Digital">
      <Monitor className={DIGITAL_MARK_ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
    </span>
  );
}

function ValueCell({ label, children }: ValueCellProps): ReactElement {
  return (
    <span data-fit="value" className={FIT_CLASSES}>
      {label === null ? null : <span className={COLUMN_LABEL_CLASSES}>{label}</span>}
      <span className="block">{children}</span>
    </span>
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
  const labelLaneVisible = columns.length === 1;
  const anyColumnCountsDown = columns.some((column) => column.countsDown);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const boardRef = useRef<HTMLElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const tabStripRef = useRef<HTMLTableSectionElement>(null);

  const layout: BoardScaleLayout = {
    columns: Math.max(1, columns.length),
    valueRows: anyColumnCountsDown ? 4 : 3,
    hasControlsRow: anyColumnCountsDown,
    labelLaneFraction: labelLaneVisible ? LABEL_LANE_FRACTION : 0,
  };
  const heights = rowHeights(layout);

  useBoardScale(boardRef, regionRef, tabStripRef, layout);
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

  const valueClasses = labelLaneVisible ? ALIGNED_VALUE_CLASSES : CENTRED_VALUE_CLASSES;
  const perColumnLabel = (label: string): string | null => (labelLaneVisible ? null : label);

  const supportingRows: BoardRow[] = [
    {
      label: "Exam",
      countdown: false,
      cellClassesFor: () => `${VALUE_CELL_CLASSES} ${valueClasses}`,
      render: (column) => (
        <ValueCell label={perColumnLabel("Exam")}>
          {column.examName}
          <DigitalMark shown={column.digital} />
        </ValueCell>
      ),
    },
    {
      label: "Part",
      countdown: false,
      cellClassesFor: () => `${VALUE_CELL_CLASSES} ${valueClasses}`,
      render: (column) => <ValueCell label={perColumnLabel("Part")}>{column.partName}</ValueCell>,
    },
    {
      label: "Time",
      countdown: false,
      cellClassesFor: () => `${VALUE_CELL_CLASSES} ${valueClasses}`,
      render: (column) => (
        <ValueCell label={perColumnLabel("Time")}>
          {column.allowedTime}
          {column.extraMinutes > 0 && (
            <span className={EXTRA_TIME_CLASSES}>+{column.extraMinutes}min</span>
          )}
        </ValueCell>
      ),
    },
  ];

  const countdownRows: BoardRow[] = [
    {
      label: "Remaining",
      countdown: true,
      cellClassesFor: (column) =>
        column.countsDown ? `${VALUE_CELL_CLASSES} ${valueClasses}` : EMPTY_CELL_CLASSES,
      rowSpanFor: (column) => (column.countsDown ? undefined : 2),
      render: (column) =>
        column.countsDown ? (
          <RemainingTime
            label={perColumnLabel("Remaining")}
            align={labelLaneVisible ? "start" : "center"}
            timer={column.timer}
            durationMs={column.durationMs}
            onThresholdCross={handleThresholdCross}
          />
        ) : null,
    },
    {
      label: "Controls",
      countdown: false,
      cellClassesFor: () => `${CONTROLS_CELL_CLASSES} ${valueClasses}`,
      omitsCell: (column) => !column.countsDown,
      render: (column) => <SessionControls view={column} onRequestReset={handleResetRequest} />,
    },
  ];

  const rows = anyColumnCountsDown ? [...supportingRows, ...countdownRows] : supportingRows;

  return (
    <section
      ref={boardRef}
      className={BOARD_CLASSES}
      data-density={density}
      data-columns={columns.length}
    >
      <button
        className={CENTRE_NUMBER_CLASSES}
        type="button"
        aria-label="Edit centre number"
        onClick={onEditCentreNumber}
      >
        <Pencil className={CENTRE_NUMBER_ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
        Centre no:{" "}
        <span className={CENTRE_NUMBER_VALUE_CLASSES}>{board.centreNumber}</span>
      </button>
      {columns.length === 0 ? (
        <div className={EMPTY_BOARD_CLASSES}>
          <p className={EMPTY_BOARD_TEXT_CLASSES}>No sessions yet</p>
          <button className={EMPTY_BOARD_BUTTON_CLASSES} type="button" onClick={onAddSession}>
            <Plus className={ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
            Add Session
          </button>
        </div>
      ) : (
        <div ref={regionRef} className={REGION_CLASSES}>
          <table className={GRID_CLASSES}>
            <caption className="sr-only">Exam sessions</caption>
            <colgroup>
              <col
                className={labelLaneVisible ? LABEL_COLUMN_CLASSES : COLLAPSED_LABEL_COLUMN_CLASSES}
              />
              {columns.map((column) => (
                <col key={column.id} />
              ))}
            </colgroup>
            <thead ref={tabStripRef} className={TAB_STRIP_CLASSES}>
              <tr>
                {labelLaneVisible ? null : <td className={TAB_STRIP_EDGE_CLASSES}></td>}
                {columns.map((column, index) => (
                  <th
                    key={column.id}
                    className={TAB_STRIP_CELL_CLASSES}
                    scope="col"
                    colSpan={labelLaneVisible ? 2 : undefined}
                    aria-label={column.examLabel}
                  >
                    <span className={TAB_ROW_CLASSES}>
                      <SessionTab
                        view={column}
                        onEditSession={onEditSession}
                        onRequestRemove={handleRemoveRequest}
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
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  style={{ height: row.label === "Controls" ? heights.controls : heights.value }}
                >
                  <th
                    className={labelLaneVisible ? ROW_LABEL_CLASSES : COLLAPSED_ROW_LABEL_CLASSES}
                    scope="row"
                  >
                    {labelLaneVisible && row.label !== "Controls" ? (
                      <span data-fit="label" className={ROW_LABEL_TEXT_CLASSES}>
                        {row.label}
                      </span>
                    ) : (
                      <span className="sr-only">{row.label}</span>
                    )}
                  </th>
                  {columns.map((column, index) => {
                    if (row.omitsCell !== undefined && row.omitsCell(column)) {
                      return null;
                    }
                    const rowSpan =
                      row.rowSpanFor === undefined ? undefined : row.rowSpanFor(column);
                    const separator =
                      index === columns.length - 1 ? "" : ` ${SEPARATOR_CLASSES}`;
                    return (
                      <td
                        key={column.id}
                        className={`${row.cellClassesFor(column)}${separator}`}
                        rowSpan={rowSpan}
                      >
                        {row.render(column)}
                      </td>
                    );
                  })}
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
