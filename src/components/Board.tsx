import { useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { Pencil, Plus } from "lucide-react";
import { BoardGrid } from "./BoardGrid";
import { ConfirmDialog } from "./ConfirmDialog";
import { rowHeights, useBoardScale } from "../hooks/useBoardScale";
import type { BoardScaleLayout } from "../hooks/useBoardScale";
import { useUnloadGuard } from "../hooks/useUnloadGuard";
import { densityFor, formatRemaining } from "../lib/format";
import { describeSession } from "../lib/sessionView";
import type { SessionView } from "../lib/sessionView";
import { remainingMs } from "../lib/timer";
import {
  getClockSnapshot,
  getSnapshot,
  removeSession,
  resetSession,
  subscribe,
} from "../store/boardStore";

type BoardProps = {
  onAddSession: () => void;
  onEditSession: (sessionId: string) => void;
  onEditCentreNumber: () => void;
};

type EmptyBoardProps = {
  onAddSession: () => void;
};

type PendingActionKind = "remove" | "reset";

/** A destructive request held back until the invigilator confirms it. */
type PendingAction = {
  kind: PendingActionKind;
  sessionId: string;
  examLabel: string;
  partName: string;
  remaining: string;
};

type PendingActionDialogProps = {
  action: PendingAction;
  onConfirm: () => void;
  onClose: () => void;
};

const CONFIRMATIONS: Record<
  PendingActionKind,
  { title: string; message: string; confirmLabel: string }
> = {
  remove: {
    title: "Close This Session?",
    message: "Closing removes the column and its countdown from the board.",
    confirmLabel: "Close Session",
  },
  reset: {
    title: "Reset This Countdown?",
    message: "Resetting returns the countdown to the full allowed time.",
    confirmLabel: "Reset Countdown",
  },
};

const BOARD_CLASSES = "flex h-full min-h-0 w-full flex-col";

const CENTRE_NUMBER_CLASSES =
  "mb-2 ml-6 mr-auto inline-flex shrink-0 cursor-pointer items-baseline gap-2 rounded-md px-2 py-1 text-left uppercase tracking-[0.16em] text-linguaskill-slate-500 transition-colors hover:bg-linguaskill-slate-100 hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 text-centre-number";

const CENTRE_NUMBER_VALUE_CLASSES = "font-semibold text-vlec-blue-900";

const CENTRE_NUMBER_ICON_CLASSES = "h-[0.75em] w-[0.75em] shrink-0 self-center";

const EMPTY_BOARD_CLASSES =
  "flex h-full flex-col items-center justify-center gap-8 text-center text-linguaskill-slate-400";

const EMPTY_BOARD_TEXT_CLASSES = "text-pretty text-centre-number tracking-[0.16em] uppercase";

const EMPTY_BOARD_BUTTON_CLASSES =
  "inline-flex items-center gap-3 rounded-full bg-vlec-blue-900 px-8 py-4 text-tab font-medium text-white transition-colors hover:bg-vlec-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-900";

const ICON_CLASSES = "h-[1.15em] w-[1.15em]";

const SUPPORTING_ROWS = 3;

const COUNTDOWN_ROWS = 4;

/** What the countdown reads when the action is taken, for the confirmation to quote. */
function pendingActionFor(kind: PendingActionKind, view: SessionView): PendingAction {
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

function EmptyBoard({ onAddSession }: EmptyBoardProps): ReactElement {
  return (
    <div className={EMPTY_BOARD_CLASSES}>
      <p className={EMPTY_BOARD_TEXT_CLASSES}>No sessions yet</p>
      <button className={EMPTY_BOARD_BUTTON_CLASSES} type="button" onClick={onAddSession}>
        <Plus className={ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
        Add Session
      </button>
    </div>
  );
}

function PendingActionDialog({
  action,
  onConfirm,
  onClose,
}: PendingActionDialogProps): ReactElement {
  const { title, message, confirmLabel } = CONFIRMATIONS[action.kind];

  return (
    <ConfirmDialog
      title={title}
      message={message}
      detail={`${action.examLabel} — ${action.partName} still has ${action.remaining} left.`}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

export function Board({
  onAddSession,
  onEditSession,
  onEditCentreNumber,
}: BoardProps): ReactElement {
  const board = useSyncExternalStore(subscribe, getSnapshot);
  const now = useSyncExternalStore(subscribe, getClockSnapshot);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const boardRef = useRef<HTMLElement>(null);
  const focusBoardAfterClose = useRef(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const tabStripRef = useRef<HTMLTableSectionElement>(null);

  const density = densityFor(board.sessions.length);
  const columns = board.sessions.map((session) => describeSession(session, density, now));
  const labelLaneVisible = columns.length === 1;
  const showsCountdown = columns.some((column) => column.countsDown);

  const layout: BoardScaleLayout = {
    columns: Math.max(1, columns.length),
    valueRows: showsCountdown ? COUNTDOWN_ROWS : SUPPORTING_ROWS,
    hasControlsRow: showsCountdown,
    labelLane: labelLaneVisible,
  };

  useBoardScale(boardRef, regionRef, tabStripRef, layout);
  useUnloadGuard(columns.some((column) => column.status === "running"));

  /** Removing a column destroys the button that had focus, so take it back. */
  function focusBoard() {
    boardRef.current?.focus();
  }

  function handleRemoveRequest(view: SessionView) {
    if (view.status === "idle") {
      removeSession(view.id);
      focusBoard();
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
      focusBoardAfterClose.current = true;
      return;
    }
    resetSession(pendingAction.sessionId);
  }

  function handleClosePendingAction() {
    setPendingAction(null);
    if (focusBoardAfterClose.current) {
      focusBoardAfterClose.current = false;
      focusBoard();
    }
  }

  return (
    <section
      ref={boardRef}
      tabIndex={-1}
      className={BOARD_CLASSES}
      data-density={density}
      data-columns={columns.length}
    >
      <button
        className={CENTRE_NUMBER_CLASSES}
        type="button"
        aria-label={`Edit centre no: ${board.centreNumber}`}
        onClick={onEditCentreNumber}
      >
        <Pencil className={CENTRE_NUMBER_ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
        Centre no: <span className={CENTRE_NUMBER_VALUE_CLASSES}>{board.centreNumber}</span>
      </button>
      {columns.length === 0 ? (
        <EmptyBoard onAddSession={onAddSession} />
      ) : (
        <BoardGrid
          columns={columns}
          labelLaneVisible={labelLaneVisible}
          showsCountdown={showsCountdown}
          heights={rowHeights(layout)}
          onAddSession={onAddSession}
          onEditSession={onEditSession}
          onRequestRemove={handleRemoveRequest}
          onRequestReset={handleResetRequest}
          regionRef={regionRef}
          tabStripRef={tabStripRef}
        />
      )}
      {pendingAction !== null && (
        <PendingActionDialog
          action={pendingAction}
          onConfirm={handleConfirmPendingAction}
          onClose={handleClosePendingAction}
        />
      )}
    </section>
  );
}
