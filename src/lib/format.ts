import { compactFromSessions, maxExtraMinutes } from '../config/board';
import { exams } from '../config/exams';
import type { Exam, Mode, Qualifier } from '../config/exams';
import { partShortNames } from '../config/partNames';
import { warningMilliseconds } from '../config/thresholds';
import { minutesPerHour, millisecondsPerMinute, millisecondsPerSecond, secondsPerHour, secondsPerMinute } from './time';

export type Density = 'full' | 'compact';

export type RemainingScale = 'full' | 'small';

export type RemainingSegment = {
    scale: RemainingScale;
    text: string;
};

const full = (text: string): RemainingSegment => ({ scale: 'full', text });

const small = (text: string): RemainingSegment => ({ scale: 'small', text });

const joinSegments = (segments: readonly RemainingSegment[]): string =>
    segments.map((segment) => segment.text).join('');

const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / minutesPerHour);
    const remainingMinutes = minutes % minutesPerHour;
    if (hours === 0) {
        return `${remainingMinutes}min`;
    }
    if (remainingMinutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}min`;
};

export const formatAllowedTime = (minutes: number, qualifier: Qualifier): string => {
    const duration = formatMinutes(minutes);
    switch (qualifier) {
        case 'approx':
            return `Approx. ${duration}`;
        case 'max':
            return `up to ${duration}`;
        case 'exact':
            return duration;
    }
};

/**
 * Describes how far the system clock moved, for the warning the invigilator
 * reads. Rounded to whole minutes above a minute, because the exact
 * milliseconds of a clock step are not information anyone can act on.
 */
export const formatClockSkew = (skewMilliseconds: number): string => {
    const direction = skewMilliseconds < 0 ? 'back' : 'forward';
    const magnitude = Math.abs(skewMilliseconds);
    if (magnitude < millisecondsPerMinute) {
        const seconds = Math.round(magnitude / millisecondsPerSecond);
        return `${seconds}sec ${direction}`;
    }
    return `${formatMinutes(Math.round(magnitude / millisecondsPerMinute))} ${direction}`;
};

export const remainingSegments = (milliseconds: number): RemainingSegment[] => {
    const clamped = Math.max(0, milliseconds);
    const totalSeconds = Math.ceil(clamped / millisecondsPerSecond);
    const hours = Math.floor(totalSeconds / secondsPerHour);
    const minutes = Math.floor((totalSeconds % secondsPerHour) / secondsPerMinute);
    const seconds = totalSeconds % secondsPerMinute;
    const secondsDigits = clamped > warningMilliseconds ? small : full;
    const leading = hours === 0 ? [] : [full(String(hours)), small('h ')];
    return [
        ...leading,
        full(String(minutes)),
        small('min '),
        secondsDigits(String(seconds).padStart(2, '0')),
        small('sec'),
    ];
};

export const formatRemaining = (milliseconds: number): string => joinSegments(remainingSegments(milliseconds));

const longestPartMinutes = Math.max(...exams.flatMap((exam) => exam.examParts.map((part) => part.minutes)));

export const maxRemainingMilliseconds = (longestPartMinutes + maxExtraMinutes) * millisecondsPerMinute;

const smallScaleWidth = 0.5;

const estimatedWidth = (segments: readonly RemainingSegment[]): number =>
    segments.reduce(
        (total, segment) => total + segment.text.length * (segment.scale === 'full' ? 1 : smallScaleWidth),
        0,
    );

const shapeOf = (segments: readonly RemainingSegment[]): string =>
    segments.map((segment) => `${segment.scale}:${segment.text.length}`).join('|');

const candidateValues = (upperBoundMilliseconds: number): number[] => {
    const bound = Math.max(0, upperBoundMilliseconds);
    const lastMinute = Math.floor(bound / millisecondsPerMinute);
    const values: number[] = [];
    for (let minute = 0; minute <= lastMinute; minute += 1) {
        const wholeMinute = minute * millisecondsPerMinute;
        values.push(wholeMinute);
        const almostNextMinute = wholeMinute + millisecondsPerMinute - millisecondsPerSecond;
        if (almostNextMinute <= bound) {
            values.push(almostNextMinute);
        }
    }
    values.push(bound);
    return values;
};

export const reservationSegments = (upperBoundMilliseconds: number): RemainingSegment[][] => {
    const byShape = new Map<string, RemainingSegment[]>();
    for (const value of candidateValues(upperBoundMilliseconds)) {
        const segments = remainingSegments(value);
        const shape = shapeOf(segments);
        const known = byShape.get(shape);
        if (known === undefined || estimatedWidth(segments) > estimatedWidth(known)) {
            byShape.set(shape, segments);
        }
    }
    return [...byShape.values()];
};

const widestRemainingSegments = (upperBoundMilliseconds: number): RemainingSegment[] => {
    let widest = remainingSegments(0);
    for (const candidate of reservationSegments(upperBoundMilliseconds)) {
        if (estimatedWidth(candidate) > estimatedWidth(widest)) {
            widest = candidate;
        }
    }
    return widest;
};

export const widestRemainingString = (): string => joinSegments(widestRemainingSegments(maxRemainingMilliseconds));

export const partLabel = (partName: string, density: Density): string => {
    if (density === 'full') {
        return partName;
    }
    return partShortNames[partName] ?? partName;
};

export const examDisplayName = (exam: Exam, density: Density): string =>
    density === 'compact' ? exam.shortName : exam.examName;

export const marksDigitalMode = (exam: Exam, mode: Mode): boolean => mode === 'digital' && exam.modes.includes('paper');

export const composeExamLabel = (exam: Exam, mode: Mode, density: Density): string => {
    const name = examDisplayName(exam, density);
    if (!marksDigitalMode(exam, mode)) {
        return name;
    }
    return `${name} Digital`;
};

export const densityFor = (sessionCount: number): Density => (sessionCount >= compactFromSessions ? 'compact' : 'full');
