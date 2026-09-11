/**
 * The board's state container: one snapshot, its listeners, its persistence
 * and its expiry timer. The actions that change it live in `boardStore.ts`.
 */
import { DEFAULT_CENTRE_NUMBER } from "../config/board";
import { STORAGE_KEY } from "../config/storage";
import { MS_PER_MINUTE } from "../lib/time";
import { reset, restore } from "../lib/timer";
import { parseStoredBoard } from "./parseBoard";
import type { StoredBoard } from "./parseBoard";
import { sessionDurationMs } from "./session";
import type { BreakState, Session } from "./session";

export type BoardState = {
  centreNumber: string;
  sessions: Session[];
  break: BreakState;
  clockJumpDetected: boolean;
  /** How far the system clock moved when the jump was noticed, 0 if unknown. */
  clockSkewMs: number;
  /** True when the jump was compensated for and remaining times still hold. */
  clockTimesPreserved: boolean;
  persistFailed: boolean;
  restoreDiscarded: boolean;
  revision: number;
};

const DEFAULT_BREAK_MINUTES = 15;

const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

const emptyBoard = (): BoardState => ({
  centreNumber: DEFAULT_CENTRE_NUMBER,
  sessions: [],
  break: { timer: reset(), minutes: DEFAULT_BREAK_MINUTES },
  clockJumpDetected: false,
  clockSkewMs: 0,
  clockTimesPreserved: false,
  persistFailed: false,
  restoreDiscarded: false,
  revision: 0,
});

let snapshot: BoardState = emptyBoard();

const listeners = new Set<() => void>();

let expiryTimeout: ReturnType<typeof setTimeout> | null = null;

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

export const applySnapshot = (next: BoardState): void => {
  snapshot = { ...next, revision: snapshot.revision + 1 };
  scheduleExpiry();
  notify();
};

export const commit = (next: BoardState): void => {
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
  // The break is deliberately not clamped: unlike a session it is not rendered,
  // so a stale stored value harms nothing, and leaving the far-future case
  // reachable keeps the expiry-scheduling overflow guard under test.
  const restoredBreak = restore(stored.break.timer, stored.break.minutes * MS_PER_MINUTE, now, {
    clamp: false,
  });
  applySnapshot({
    ...emptyBoard(),
    ...stickyFailures,
    centreNumber: stored.centreNumber,
    sessions: restoredSessions.sessions,
    break: { ...stored.break, timer: restoredBreak.state },
    clockJumpDetected:
      stickyFailures.clockJumpDetected || restoredSessions.clamped || restoredBreak.clamped,
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

let clockSample = { revision: -1, now: 0 };

/**
 * The wall-clock reading the board renders against, re-sampled once per store
 * revision so that `useSyncExternalStore` sees a stable value between renders.
 */
export const getClockSnapshot = (): number => {
  if (clockSample.revision !== snapshot.revision) {
    clockSample = { revision: snapshot.revision, now: Date.now() };
  }
  return clockSample.now;
};

// Restore whatever the last session left behind, before anything renders.
hydrateFromStorage();
