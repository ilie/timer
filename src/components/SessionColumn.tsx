import type { ReactElement } from "react";
import { ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { exams } from "../config/exams";
import { composeExamLabel, formatAllowedTime, partLabel } from "../lib/format";
import type { Density } from "../lib/format";
import { statusOf } from "../lib/timer";
import type { TimerState, TimerStatus } from "../lib/timer";
import {
  advanceComponent,
  pauseSession,
  resumeSession,
  sessionDurationMs,
  startSession,
} from "../store/boardStore";
import type { Session } from "../store/boardStore";

export type SessionView = {
  id: string;
  number: number;
  examLabel: string;
  partName: string;
  allowedTime: string;
  extraMinutes: number;
  countsDown: boolean;
  timer: TimerState;
  durationMs: number;
  status: TimerStatus;
  nextPartName: string | null;
};

type SessionControlsProps = {
  view: SessionView;
  onRequestReset: (view: SessionView) => void;
};

const NOT_APPLICABLE = "—";

const CONTROLS_CLASSES = "flex flex-wrap items-center justify-center gap-2 py-1";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-lg bg-vlec-blue-900 px-3 py-1.5 font-semibold text-white text-label transition-colors group-data-[density=compact]/board:text-label-compact hover:bg-vlec-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-900";

const SECONDARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-lg bg-linguaskill-slate-200 px-3 py-1.5 font-semibold text-linguaskill-slate-900 text-label transition-colors group-data-[density=compact]/board:text-label-compact hover:bg-linguaskill-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-linguaskill-slate-600";

const ICON_CLASSES = "h-[1em] w-[1em]";

const runControlLabels = {
  idle: "Start",
  running: "Pause",
  paused: "Resume",
} as const;

export function describeSession(
  session: Session,
  number: number,
  density: Density,
  now: number,
): SessionView {
  const exam = exams.find((candidate) => candidate.examName === session.examName);
  const part = exam?.examParts[session.partIndex];

  if (exam === undefined || part === undefined) {
    return {
      id: session.id,
      number,
      examLabel: "Not configured",
      partName: NOT_APPLICABLE,
      allowedTime: NOT_APPLICABLE,
      extraMinutes: session.extraMinutes,
      countsDown: false,
      timer: session.timer,
      durationMs: 0,
      status: "idle",
      nextPartName: null,
    };
  }

  const nextPart = exam.examParts[session.partIndex + 1];

  return {
    id: session.id,
    number,
    examLabel: composeExamLabel(exam, session.mode, density),
    partName: partLabel(part.name, density),
    allowedTime: formatAllowedTime(part.minutes + session.extraMinutes, part.qualifier),
    extraMinutes: session.extraMinutes,
    countsDown: part.qualifier === "exact" && session.mode === "paper",
    timer: session.timer,
    durationMs: sessionDurationMs(session),
    status: statusOf(session.timer, now),
    nextPartName: nextPart === undefined ? null : partLabel(nextPart.name, density),
  };
}

export function SessionControls({
  view,
  onRequestReset,
}: SessionControlsProps): ReactElement | null {
  if (!view.countsDown) {
    return null;
  }

  const runControlLabel = view.status === "finished" ? null : runControlLabels[view.status];

  function handleRunControl() {
    switch (view.status) {
      case "idle":
        startSession(view.id);
        return;
      case "running":
        pauseSession(view.id);
        return;
      case "paused":
        resumeSession(view.id);
        return;
      case "finished":
        return;
    }
  }

  function handleReset() {
    onRequestReset(view);
  }

  function handleAdvance() {
    advanceComponent(view.id);
  }

  return (
    <div className={CONTROLS_CLASSES}>
      <button className={SECONDARY_BUTTON_CLASSES} type="button" onClick={handleReset}>
        <RotateCcw className={ICON_CLASSES} aria-hidden="true" />
        Reset
      </button>
      {runControlLabel !== null && (
        <button className={PRIMARY_BUTTON_CLASSES} type="button" onClick={handleRunControl}>
          {view.status === "running" ? (
            <Pause className={ICON_CLASSES} aria-hidden="true" />
          ) : (
            <Play className={ICON_CLASSES} aria-hidden="true" />
          )}
          {runControlLabel}
        </button>
      )}
      {view.status === "finished" && view.nextPartName !== null && (
        <button className={PRIMARY_BUTTON_CLASSES} type="button" onClick={handleAdvance}>
          <ChevronRight className={ICON_CLASSES} aria-hidden="true" />
          Next: {view.nextPartName}
        </button>
      )}
    </div>
  );
}
