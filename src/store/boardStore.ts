import { MAX_SESSIONS } from "../config/board";
import { examByName } from "../config/exams";
import { MS_PER_MINUTE } from "../lib/time";
import { extend, pause, reanchor, reset, resume, start } from "../lib/timer";
import type { TimerState } from "../lib/timer";
import { applySnapshot, commit, getSnapshot } from "./boardState";
import type { BoardState } from "./boardState";
import { sessionDurationMs } from "./session";
import type { Session, SessionConfig } from "./session";

export type { BoardState } from "./boardState";
export type { BreakState, Session, SessionConfig } from "./session";
export { sessionDurationMs };
export { getClockSnapshot, getSnapshot, hydrateFromStorage, subscribe } from "./boardState";

const replaceSession = (id: string, replacement: (session: Session) => Session): void => {
  let changed = false;
  const sessions = getSnapshot().sessions.map((session) => {
    if (session.id !== id) {
      return session;
    }
    const next = replacement(session);
    if (next === session) {
      return session;
    }
    changed = true;
    return next;
  });
  if (!changed) {
    return;
  }
  commit({ ...getSnapshot(), sessions });
};

const updateSessionTimer = (
  id: string,
  nextTimer: (session: Session, now: number) => TimerState,
): void => {
  const now = Date.now();
  replaceSession(id, (session) => {
    const timer = nextTimer(session, now);
    return timer === session.timer ? session : { ...session, timer };
  });
};

export const startSession = (id: string): void => {
  updateSessionTimer(id, (session, now) =>
    session.timer.status === "running" ? session.timer : start(sessionDurationMs(session), now),
  );
};

export const pauseSession = (id: string): void => {
  updateSessionTimer(id, (session, now) => pause(session.timer, now));
};

export const resumeSession = (id: string): void => {
  updateSessionTimer(id, (session, now) => resume(session.timer, now));
};

export const resetSession = (id: string): void => {
  updateSessionTimer(id, (session) => (session.timer.status === "idle" ? session.timer : reset()));
};

const unusedSessionId = (sessions: readonly Session[]): string => {
  const takenIds = new Set(sessions.map((session) => session.id));
  let index = 1;
  while (takenIds.has(`session-${index}`)) {
    index += 1;
  }
  return `session-${index}`;
};

export const addSession = (config: SessionConfig): void => {
  if (getSnapshot().sessions.length >= MAX_SESSIONS) {
    return;
  }
  const session: Session = {
    id: unusedSessionId(getSnapshot().sessions),
    ...config,
    timer: reset(),
  };
  commit({ ...getSnapshot(), sessions: [...getSnapshot().sessions, session] });
};

export const removeSession = (id: string): void => {
  const sessions = getSnapshot().sessions.filter((session) => session.id !== id);
  if (sessions.length === getSnapshot().sessions.length) {
    return;
  }
  commit({ ...getSnapshot(), sessions });
};

/** Reorders the columns. Timers travel with their session untouched. */
export const moveSession = (id: string, toIndex: number): void => {
  const from = getSnapshot().sessions.findIndex((session) => session.id === id);
  if (from === -1) {
    return;
  }
  const to = Math.max(0, Math.min(toIndex, getSnapshot().sessions.length - 1));
  if (to === from) {
    return;
  }
  const sessions = [...getSnapshot().sessions];
  const [moved] = sessions.splice(from, 1);
  if (moved === undefined) {
    return;
  }
  sessions.splice(to, 0, moved);
  commit({ ...getSnapshot(), sessions });
};

const matchesConfig = (session: Session, config: SessionConfig): boolean =>
  session.examName === config.examName &&
  session.partIndex === config.partIndex &&
  session.mode === config.mode &&
  session.extraMinutes === config.extraMinutes;

const onlyExtraMinutesDiffer = (session: Session, config: SessionConfig): boolean =>
  session.examName === config.examName &&
  session.partIndex === config.partIndex &&
  session.mode === config.mode &&
  session.extraMinutes !== config.extraMinutes;

/**
 * Re-configuring a session normally re-seeds its timer, because a different
 * component means a different duration from a standing start. Granting extra
 * time is the exception: it happens mid-component for access arrangements, so
 * the time already served has to survive it.
 */
export const setSessionConfig = (id: string, config: SessionConfig): void => {
  replaceSession(id, (session) => {
    if (matchesConfig(session, config)) {
      return session;
    }
    if (session.timer.status !== "idle" && onlyExtraMinutesDiffer(session, config)) {
      const deltaMs = (config.extraMinutes - session.extraMinutes) * MS_PER_MINUTE;
      return { ...session, ...config, timer: extend(session.timer, deltaMs) };
    }
    return { ...session, ...config, timer: reset() };
  });
};

export const setCentreNumber = (centreNumber: string): void => {
  if (getSnapshot().centreNumber === centreNumber) {
    return;
  }
  commit({ ...getSnapshot(), centreNumber });
};

export const advanceComponent = (id: string): void => {
  replaceSession(id, (session) => {
    const nextPartIndex = session.partIndex + 1;
    if (examByName(session.examName)?.examParts[nextPartIndex] === undefined) {
      return session;
    }
    return { ...session, partIndex: nextPartIndex, timer: reset() };
  });
};

const hasRunningTimer = (state: BoardState): boolean =>
  state.break.timer.status === "running" ||
  state.sessions.some((session) => session.timer.status === "running");

/**
 * The wall clock moved by a known amount while we were demonstrably running, so
 * every running deadline moves with it and the time remaining is untouched.
 */
export const applyClockStep = (skewMs: number): void => {
  if (!hasRunningTimer(getSnapshot())) {
    return;
  }
  const sessions = getSnapshot().sessions.map((session) => {
    const timer = reanchor(session.timer, skewMs);
    return timer === session.timer ? session : { ...session, timer };
  });
  commit({
    ...getSnapshot(),
    sessions,
    break: { ...getSnapshot().break, timer: reanchor(getSnapshot().break.timer, skewMs) },
    clockJumpDetected: true,
    clockSkewMs: skewMs,
    clockTimesPreserved: true,
  });
};

/**
 * The clocks disagree but we cannot prove why, so nothing is adjusted and the
 * invigilator is asked to check the board against a trusted clock.
 */
export const reportUnverifiedClockJump = (skewMs: number): void => {
  if (!hasRunningTimer(getSnapshot())) {
    return;
  }
  applySnapshot({
    ...getSnapshot(),
    clockJumpDetected: true,
    clockSkewMs: skewMs,
    clockTimesPreserved: false,
  });
};

export const setClockJumpDetected = (detected: boolean): void => {
  if (getSnapshot().clockJumpDetected === detected) {
    return;
  }
  applySnapshot({
    ...getSnapshot(),
    clockJumpDetected: detected,
    clockSkewMs: detected ? getSnapshot().clockSkewMs : 0,
    clockTimesPreserved: detected ? getSnapshot().clockTimesPreserved : false,
  });
};
