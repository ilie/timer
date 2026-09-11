import { MAX_BREAK_MINUTES, MAX_EXTRA_MINUTES, MAX_SESSIONS } from "../config/board";
import { examByName } from "../config/exams";
import type { Mode } from "../config/exams";
import { MS_PER_MINUTE } from "../lib/time";
import type { TimerState } from "../lib/timer";
import { sessionDurationMs } from "./session";
import type { BreakState, Session } from "./session";

export type StoredBoard = {
  centreNumber: string;
  sessions: Session[];
  break: BreakState;
};

/**
 * Everything here treats stored state as hostile. A malformed payload is
 * rejected whole rather than repaired in part: a board half-restored from
 * nonsense is worse than an empty one, because it still looks authoritative.
 */
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
  if (
    value.status === "running" &&
    typeof value.endsAt === "number" &&
    Number.isFinite(value.endsAt)
  ) {
    return { status: "running", endsAt: value.endsAt };
  }
  if (
    value.status === "paused" &&
    typeof value.remainingMs === "number" &&
    Number.isFinite(value.remainingMs) &&
    value.remainingMs >= 0
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
    extraMinutes > MAX_EXTRA_MINUTES ||
    mode === null ||
    timer === null
  ) {
    return null;
  }
  const exam = examByName(examName);
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
  if (timer === null || !isWholeNumber(minutes) || minutes < 0 || minutes > MAX_BREAK_MINUTES) {
    return null;
  }
  if (!pausedRemainingFitsDuration(timer, minutes * MS_PER_MINUTE)) {
    return null;
  }
  return { timer, minutes };
};

export const parseStoredBoard = (raw: string): StoredBoard | null => {
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
