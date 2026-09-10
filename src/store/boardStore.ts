import { DEFAULT_CENTRE_NUMBER, MAX_SESSIONS } from "../config/board";
import { exams } from "../config/exams";
import type { Exam, Mode } from "../config/exams";
import { STORAGE_KEY } from "../config/storage";
import { pause, reset, restore, resume, start } from "../lib/timer";
import type { TimerState } from "../lib/timer";

export type SessionConfig = {
  examName: string;
  partIndex: number;
  mode: Mode;
  extraMinutes: number;
};

export type Session = SessionConfig & {
  id: string;
  timer: TimerState;
};

export type BreakState = {
  timer: TimerState;
  minutes: number;
};

export type BoardState = {
  centreNumber: string;
  sessions: Session[];
  break: BreakState;
  clockJumpDetected: boolean;
  persistFailed: boolean;
  restoreDiscarded: boolean;
  revision: number;
};

type StoredBoard = {
  centreNumber: string;
  sessions: Session[];
  break: BreakState;
};

const DEFAULT_BREAK_MINUTES = 15;

const MS_PER_MINUTE = 60_000;

const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

const emptyBoard = (): BoardState => ({
  centreNumber: DEFAULT_CENTRE_NUMBER,
  sessions: [],
  break: { timer: reset(), minutes: DEFAULT_BREAK_MINUTES },
  clockJumpDetected: false,
  persistFailed: false,
  restoreDiscarded: false,
  revision: 0,
});

let snapshot: BoardState = emptyBoard();

const listeners = new Set<() => void>();

let expiryTimeout: ReturnType<typeof setTimeout> | null = null;

const findExam = (examName: string): Exam | undefined =>
  exams.find((candidate) => candidate.examName === examName);

export const sessionDurationMs = (session: Session): number => {
  const part = findExam(session.examName)?.examParts[session.partIndex];
  if (part === undefined) {
    return 0;
  }
  return (part.minutes + session.extraMinutes) * MS_PER_MINUTE;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isWholeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value);

const parseTimerState = (value: unknown): TimerState | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (value.status === "idle") {
    return { status: "idle" };
  }
  if (value.status === "running" && typeof value.endsAt === "number" && Number.isFinite(value.endsAt)) {
    return { status: "running", endsAt: value.endsAt };
  }
  if (
    value.status === "paused" &&
    typeof value.remainingMs === "number" &&
    Number.isFinite(value.remainingMs)
  ) {
    return { status: "paused", remainingMs: value.remainingMs };
  }
  return null;
};

const pausedRemainingFitsDuration = (timer: TimerState, durationMs: number): boolean =>
  timer.status !== "paused" || timer.remainingMs <= durationMs;

const parseMode = (value: unknown): Mode | null =>
  value === "paper" || value === "digital" ? value : null;

const parseSession = (value: unknown): Session | null => {
  if (!isRecord(value)) {
    return null;
  }
  const { id, examName, partIndex, extraMinutes } = value;
  const mode = parseMode(value.mode);
  const timer = parseTimerState(value.timer);
  if (
    typeof id !== "string" ||
    typeof examName !== "string" ||
    !isWholeNumber(partIndex) ||
    partIndex < 0 ||
    !isWholeNumber(extraMinutes) ||
    extraMinutes < 0 ||
    mode === null ||
    timer === null
  ) {
    return null;
  }
  const exam = findExam(examName);
  if (exam === undefined || exam.examParts[partIndex] === undefined) {
    return null;
  }
  const session: Session = { id, examName, partIndex, mode, extraMinutes, timer };
  if (!pausedRemainingFitsDuration(timer, sessionDurationMs(session))) {
    return null;
  }
  return session;
};

const parseBreak = (value: unknown): BreakState | null => {
  if (!isRecord(value)) {
    return null;
  }
  const timer = parseTimerState(value.timer);
  const { minutes } = value;
  if (timer === null || typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0) {
    return null;
  }
  if (!pausedRemainingFitsDuration(timer, minutes * MS_PER_MINUTE)) {
    return null;
  }
  return { timer, minutes };
};

const parseStoredBoard = (raw: string): StoredBoard | null => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }
  const { centreNumber } = value;
  const breakState = parseBreak(value.break);
  if (typeof centreNumber !== "string" || breakState === null || !Array.isArray(value.sessions)) {
    return null;
  }
  if (value.sessions.length > MAX_SESSIONS) {
    return null;
  }
  const sessions: Session[] = [];
  for (const candidate of value.sessions) {
    const session = parseSession(candidate);
    if (session === null) {
      return null;
    }
    sessions.push(session);
  }
  return { centreNumber, sessions, break: breakState };
};

const readStoredPayload = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStoredPayload = (state: BoardState): boolean => {
  const stored: StoredBoard = {
    centreNumber: state.centreNumber,
    sessions: state.sessions,
    break: state.break,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
};

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const nextExpiryAt = (state: BoardState, now: number): number | null => {
  const timers = [...state.sessions.map((session) => session.timer), state.break.timer];
  let earliest: number | null = null;
  for (const timer of timers) {
    if (timer.status !== "running" || timer.endsAt <= now) {
      continue;
    }
    if (earliest === null || timer.endsAt < earliest) {
      earliest = timer.endsAt;
    }
  }
  return earliest;
};

const scheduleExpiry = (): void => {
  if (expiryTimeout !== null) {
    clearTimeout(expiryTimeout);
    expiryTimeout = null;
  }
  const now = Date.now();
  const expiryAt = nextExpiryAt(snapshot, now);
  if (expiryAt === null) {
    return;
  }
  expiryTimeout = setTimeout(announceExpiry, Math.min(expiryAt - now, MAX_TIMEOUT_DELAY_MS));
};

const applySnapshot = (next: BoardState): void => {
  snapshot = { ...next, revision: snapshot.revision + 1 };
  scheduleExpiry();
  notify();
};

const commit = (next: BoardState): void => {
  applySnapshot({ ...next, persistFailed: !writeStoredPayload(next) });
};

const announceExpiry = (): void => {
  applySnapshot(snapshot);
};

const restoreSessions = (
  sessions: Session[],
  now: number,
): { sessions: Session[]; clamped: boolean } => {
  let clamped = false;
  const restored = sessions.map((session) => {
    const result = restore(session.timer, sessionDurationMs(session), now, { clamp: true });
    if (result.clamped) {
      clamped = true;
    }
    return { ...session, timer: result.state };
  });
  return { sessions: restored, clamped };
};

export const hydrateFromStorage = (): void => {
  const stickyFailures = {
    clockJumpDetected: snapshot.clockJumpDetected,
    persistFailed: snapshot.persistFailed,
  };
  const payload = readStoredPayload();
  const stored = payload === null ? null : parseStoredBoard(payload);
  if (stored === null) {
    applySnapshot({ ...emptyBoard(), ...stickyFailures, restoreDiscarded: payload !== null });
    return;
  }
  const now = Date.now();
  const restoredSessions = restoreSessions(stored.sessions, now);
  const restoredBreak = restore(stored.break.timer, stored.break.minutes * MS_PER_MINUTE, now, {
    clamp: false,
  });
  applySnapshot({
    ...emptyBoard(),
    ...stickyFailures,
    centreNumber: stored.centreNumber,
    sessions: restoredSessions.sessions,
    break: { ...stored.break, timer: restoredBreak.state },
    clockJumpDetected: stickyFailures.clockJumpDetected || restoredSessions.clamped,
  });
};

const handleStorageEvent = (event: StorageEvent): void => {
  if (event.key !== null && event.key !== STORAGE_KEY) {
    return;
  }
  hydrateFromStorage();
};

export const subscribe = (listener: () => void): (() => void) => {
  if (listeners.size === 0) {
    window.addEventListener("storage", handleStorageEvent);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
};

export const getSnapshot = (): BoardState => snapshot;

const replaceSession = (id: string, replacement: (session: Session) => Session): void => {
  let changed = false;
  const sessions = snapshot.sessions.map((session) => {
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
  commit({ ...snapshot, sessions });
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
  if (snapshot.sessions.length >= MAX_SESSIONS) {
    return;
  }
  const session: Session = {
    id: unusedSessionId(snapshot.sessions),
    ...config,
    timer: reset(),
  };
  commit({ ...snapshot, sessions: [...snapshot.sessions, session] });
};

export const removeSession = (id: string): void => {
  const sessions = snapshot.sessions.filter((session) => session.id !== id);
  if (sessions.length === snapshot.sessions.length) {
    return;
  }
  commit({ ...snapshot, sessions });
};

const matchesConfig = (session: Session, config: SessionConfig): boolean =>
  session.examName === config.examName &&
  session.partIndex === config.partIndex &&
  session.mode === config.mode &&
  session.extraMinutes === config.extraMinutes;

export const setSessionConfig = (id: string, config: SessionConfig): void => {
  replaceSession(id, (session) =>
    matchesConfig(session, config) ? session : { ...session, ...config, timer: reset() },
  );
};

export const setCentreNumber = (centreNumber: string): void => {
  if (snapshot.centreNumber === centreNumber) {
    return;
  }
  commit({ ...snapshot, centreNumber });
};

export const advanceComponent = (id: string): void => {
  replaceSession(id, (session) => {
    const nextPartIndex = session.partIndex + 1;
    if (findExam(session.examName)?.examParts[nextPartIndex] === undefined) {
      return session;
    }
    return { ...session, partIndex: nextPartIndex, timer: reset() };
  });
};

export const setClockJumpDetected = (detected: boolean): void => {
  if (snapshot.clockJumpDetected === detected) {
    return;
  }
  applySnapshot({ ...snapshot, clockJumpDetected: detected });
};

hydrateFromStorage();
