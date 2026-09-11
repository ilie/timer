import { examByName } from '../config/exams';
import { sessionDurationMs } from '../store/session';
import type { Session } from '../store/session';
import { composeExamLabel, examDisplayName, formatAllowedTime, marksDigitalMode, partLabel } from './format';
import type { Density } from './format';
import { statusOf } from './timer';
import type { TimerState, TimerStatus } from './timer';

/** Everything one board column needs to render a session, derived once per render. */
export type SessionView = {
    id: string;
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

const NOT_APPLICABLE = '—';

function unconfiguredView(session: Session): SessionView {
    return {
        id: session.id,
        examLabel: 'Not configured',
        examName: 'Not configured',
        digital: session.mode === 'digital',
        partName: NOT_APPLICABLE,
        allowedTime: NOT_APPLICABLE,
        extraMinutes: session.extraMinutes,
        countsDown: false,
        timer: session.timer,
        durationMs: 0,
        status: 'idle',
        nextPartName: null,
    };
}

export function describeSession(session: Session, density: Density, now: number): SessionView {
    const exam = examByName(session.examName);
    const part = exam?.examParts[session.partIndex];

    if (exam === undefined || part === undefined) {
        return unconfiguredView(session);
    }

    const nextPart = exam.examParts[session.partIndex + 1];

    return {
        id: session.id,
        examLabel: composeExamLabel(exam, session.mode, density),
        examName: examDisplayName(exam, density),
        digital: marksDigitalMode(exam, session.mode),
        partName: partLabel(part.name, density),
        allowedTime: formatAllowedTime(part.minutes + session.extraMinutes, part.qualifier),
        extraMinutes: session.extraMinutes,
        countsDown: part.qualifier === 'exact' && session.mode === 'paper',
        timer: session.timer,
        durationMs: sessionDurationMs(session),
        status: statusOf(session.timer, now),
        nextPartName: nextPart === undefined ? null : partLabel(nextPart.name, density),
    };
}
