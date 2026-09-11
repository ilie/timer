import { examByName } from '../config/exams';
import type { Mode } from '../config/exams';
import { millisecondsPerMinute } from '../lib/time';
import type { TimerState } from '../lib/timer';

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

/** How long this session's current component runs, including any extra time. */
export const sessionDurationMilliseconds = (session: Session): number => {
    const part = examByName(session.examName)?.examParts[session.partIndex];
    if (part === undefined) {
        return 0;
    }
    return (part.minutes + session.extraMinutes) * millisecondsPerMinute;
};
