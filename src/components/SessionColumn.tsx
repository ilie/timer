import type { ReactElement } from "react";
import { RemainingTime } from "./RemainingTime";
import { exams } from "../config/exams";
import { composeExamLabel, formatAllowedTime, partLabel } from "../lib/format";
import type { Density } from "../lib/format";
import type { Threshold } from "../lib/timer";
import {
  pauseSession,
  resetSession,
  resumeSession,
  sessionDurationMs,
  startSession,
} from "../store/boardStore";
import type { Session } from "../store/boardStore";

type SessionColumnProps = {
  session: Session;
  density: Density;
  onThresholdCross: (threshold: Threshold) => void;
};

const runControlLabels = {
  idle: "Start",
  running: "Pause",
  paused: "Resume",
} as const;

export function SessionColumn({
  session,
  density,
  onThresholdCross,
}: SessionColumnProps): ReactElement {
  const exam = exams.find((candidate) => candidate.examName === session.examName);
  const part = exam?.examParts[session.partIndex];

  if (exam === undefined || part === undefined) {
    return <p className="session-column">This session is no longer configured.</p>;
  }

  const countsDown = part.qualifier === "exact" && session.mode === "paper";
  const allowedMinutes = part.minutes + session.extraMinutes;

  function handleRunControl() {
    switch (session.timer.status) {
      case "idle":
        startSession(session.id);
        return;
      case "running":
        pauseSession(session.id);
        return;
      case "paused":
        resumeSession(session.id);
    }
  }

  function handleReset() {
    resetSession(session.id);
  }

  return (
    <div className="session-column">
      <div className="content">
        <div className="lables">
          <p>Exam:</p>
          <p>Part:</p>
          <p>Time:</p>
          {countsDown && <p>Remaining Time:</p>}
        </div>
        <div className="values">
          <p>{composeExamLabel(exam, session.mode, density)}</p>
          <p>{partLabel(part.name, density)}</p>
          <p>{formatAllowedTime(allowedMinutes, part.qualifier)}</p>
          {countsDown && (
            <RemainingTime
              timer={session.timer}
              durationMs={sessionDurationMs(session)}
              onThresholdCross={onThresholdCross}
            />
          )}
        </div>
      </div>
      {countsDown && (
        <div className="controls">
          <button className="reset-btn" type="button" onClick={handleReset}>
            Reset
          </button>
          <button className="play-btn" type="button" onClick={handleRunControl}>
            {runControlLabels[session.timer.status]}
          </button>
        </div>
      )}
    </div>
  );
}
