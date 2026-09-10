import type { ReactElement } from "react";
import { ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { exams } from "../config/exams";
import {
  composeExamLabel,
  examDisplayName,
  formatAllowedTime,
  marksDigitalMode,
  partLabel,
} from "../lib/format";
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
  examName: string;
  digital: boolean;
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

const CONTROLS_CLASSES = "inline-flex flex-wrap items-center justify-center gap-3";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex min-w-[7.5em] items-center justify-center gap-2 rounded-full bg-vlec-blue-900 px-6 py-2.5 font-medium text-white text-control transition-colors hover:bg-vlec-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-900";

const SECONDARY_BUTTON_CLASSES =
  "inline-flex min-w-[6em] items-center justify-center gap-2 rounded-full px-5 py-2.5 font-medium text-linguaskill-slate-500 text-control transition-colors hover:bg-linguaskill-slate-100 hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-linguaskill-slate-500";

const ICON_CLASSES = "h-[1.15em] w-[1.15em]";

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
      examName: "Not configured",
      digital: session.mode === "digital",
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
  const countsDown = part.qualifier === "exact" && session.mode === "paper";

  return {
    id: session.id,
    number,
    examLabel: composeExamLabel(exam, session.mode, density),
    examName: examDisplayName(exam, density),
    digital: marksDigitalMode(exam, session.mode),
    partName: partLabel(part.name, density),
    allowedTime: formatAllowedTime(part.minutes + session.extraMinutes, part.qualifier),
    extraMinutes: session.extraMinutes,
    countsDown,
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
        <RotateCcw className={ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
        Reset
      </button>
      {runControlLabel !== null && (
        <button className={PRIMARY_BUTTON_CLASSES} type="button" onClick={handleRunControl}>
          {view.status === "running" ? (
            <Pause className={ICON_CLASSES} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Play className={ICON_CLASSES} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
          )}
          {runControlLabel}
        </button>
      )}
      {view.status === "finished" && view.nextPartName !== null && (
        <button className={PRIMARY_BUTTON_CLASSES} type="button" onClick={handleAdvance}>
          <ChevronRight className={ICON_CLASSES} strokeWidth={2.5} aria-hidden="true" />
          Next: {view.nextPartName}
        </button>
      )}
    </div>
  );
}
