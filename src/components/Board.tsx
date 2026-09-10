import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { RemainingTime } from "./RemainingTime";
import { SessionControls, describeSession } from "./SessionColumn";
import { MAX_SESSIONS } from "../config/board";
import { densityFor } from "../lib/format";
import { addSession, getSnapshot, removeSession, subscribe } from "../store/boardStore";

type RemoveSessionButtonProps = {
  id: string;
  label: string;
};

const NO_COUNTDOWN = "—";

let clockSample = { revision: -1, now: 0 };

function getBoardClock(): number {
  const { revision } = getSnapshot();
  if (clockSample.revision !== revision) {
    clockSample = { revision, now: Date.now() };
  }
  return clockSample.now;
}

function RemoveSessionButton({ id, label }: RemoveSessionButtonProps): ReactElement {
  function handleRemove() {
    removeSession(id);
  }

  return (
    <button className="remove-session" type="button" aria-label={label} onClick={handleRemove}>
      ×
    </button>
  );
}

export function Board(): ReactElement {
  const board = useSyncExternalStore(subscribe, getSnapshot);
  const now = useSyncExternalStore(subscribe, getBoardClock);
  const density = densityFor(board.sessions.length);
  const columns = board.sessions.map((session, index) =>
    describeSession(session, index + 1, density, now),
  );

  function handleAddSession() {
    addSession();
  }

  function handleThresholdCross() {}

  return (
    <section className="board">
      <p className="centre-number">Centre no: {board.centreNumber}</p>
      {columns.length === 0 ? (
        <p className="board-empty">No sessions yet.</p>
      ) : (
        <table className="board-grid">
          <caption className="sr-only">Exam sessions</caption>
          <thead>
            <tr>
              <td></td>
              {columns.map((column) => (
                <th key={column.id} scope="col">
                  <span className="session-name">Session {column.number}</span>
                  <RemoveSessionButton
                    id={column.id}
                    label={`Remove session ${column.number}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Exam</th>
              {columns.map((column) => (
                <td key={column.id}>{column.examLabel}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Part</th>
              {columns.map((column) => (
                <td key={column.id}>{column.partName}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Time</th>
              {columns.map((column) => (
                <td key={column.id}>{column.allowedTime}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Remaining</th>
              {columns.map((column) => (
                <td key={column.id}>
                  {column.countsDown ? (
                    <RemainingTime
                      timer={column.timer}
                      durationMs={column.durationMs}
                      onThresholdCross={handleThresholdCross}
                    />
                  ) : (
                    NO_COUNTDOWN
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Controls</th>
              {columns.map((column) => (
                <td key={column.id}>
                  <SessionControls view={column} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
      <p className="board-actions">
        <button
          className="add-session"
          type="button"
          onClick={handleAddSession}
          disabled={columns.length >= MAX_SESSIONS}
        >
          + Add session
        </button>
      </p>
    </section>
  );
}
