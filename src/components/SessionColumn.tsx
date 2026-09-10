import type { ReactElement } from "react";
import { exams } from "../config/exams";
import { composeExamLabel, formatAllowedTime, partLabel } from "../lib/format";
import type { Density } from "../lib/format";
import { statusOf } from "../lib/timer";
import type { TimerState, TimerStatus } from "../lib/timer";
import {
  advanceComponent,
  pauseSession,
  resetSession,
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
  countsDown: boolean;
  timer: TimerState;
  durationMs: number;
  status: TimerStatus;
  nextPartName: string | null;
};

type SessionControlsProps = {
  view: SessionView;
};

const NOT_APPLICABLE = "—";

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
    countsDown: part.qualifier === "exact" && session.mode === "paper",
    timer: session.timer,
    durationMs: sessionDurationMs(session),
    status: statusOf(session.timer, now),
    nextPartName: nextPart === undefined ? null : partLabel(nextPart.name, density),
  };
}

export function SessionControls({ view }: SessionControlsProps): ReactElement | null {
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
    resetSession(view.id);
  }

  function handleAdvance() {
    advanceComponent(view.id);
  }

  return (
    <div className="controls">
      <button className="reset-btn" type="button" onClick={handleReset}>
        Reset
      </button>
      {runControlLabel !== null && (
        <button className="play-btn" type="button" onClick={handleRunControl}>
          {runControlLabel}
        </button>
      )}
      {view.status === "finished" && view.nextPartName !== null && (
        <button className="advance-btn" type="button" onClick={handleAdvance}>
          Next: {view.nextPartName}
        </button>
      )}
    </div>
  );
}
