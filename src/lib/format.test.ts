import { describe, expect, it } from 'vitest';
import { exams } from '../config/exams';
import type { Exam } from '../config/exams';
import {
    maxRemainingMilliseconds,
    composeExamLabel,
    densityFor,
    formatAllowedTime,
    formatClockSkew,
    formatRemaining,
    marksDigitalMode,
    partLabel,
    remainingSegments,
    widestRemainingString,
} from './format';
import type { RemainingSegment } from './format';

const findExam = (examName: string): Exam => {
    const exam = exams.find((candidate) => candidate.examName === examName);
    if (exam === undefined) {
        throw new Error(`No exam named ${examName}`);
    }
    return exam;
};

const b2First = findExam('B2 First');
const linguaskillGeneral = findExam('Linguaskill General');

describe('formatAllowedTime', () => {
    it.each([
        [45, 'exact', '45min'],
        [60, 'exact', '1h'],
        [75, 'exact', '1h 15min'],
        [90, 'exact', '1h 30min'],
        [30, 'approx', 'Approx. 30min'],
        [45, 'max', 'up to 45min'],
    ] as const)('formats %i minutes as %s', (minutes, qualifier, expected) => {
        expect(formatAllowedTime(minutes, qualifier)).toBe(expected);
    });
});

const digitWidth = 0.6;
const letterWidth = 0.55;
const spaceWidth = 0.28;
const smallScale = 0.5;

const characterWidth = (character: string): number => {
    if (character === ' ') {
        return spaceWidth;
    }
    return /\d/.test(character) ? digitWidth : letterWidth;
};

const renderedWidth = (segments: readonly RemainingSegment[]): number =>
    segments.reduce((total, segment) => {
        const scale = segment.scale === 'full' ? 1 : smallScale;
        return total + [...segment.text].reduce((run, character) => run + characterWidth(character), 0) * scale;
    }, 0);

const segmentsRendering = (rendering: string): RemainingSegment[] => {
    for (let milliseconds = 0; milliseconds <= maxRemainingMilliseconds; milliseconds += 1000) {
        if (formatRemaining(milliseconds) === rendering) {
            return remainingSegments(milliseconds);
        }
    }
    throw new Error(`No value renders ${rendering}`);
};

describe('formatRemaining', () => {
    it.each([
        [5_400_000, '1h 30min 00sec'],
        [4_800_000, '1h 20min 00sec'],
        [2_699_000, '44min 59sec'],
        [600_001, '10min 01sec'],
        [600_000, '10min 00sec'],
        [582_000, '9min 42sec'],
        [300_000, '5min 00sec'],
        [1, '0min 01sec'],
        [0, '0min 00sec'],
    ])('formats %i ms as %s', (milliseconds, expected) => {
        expect(formatRemaining(milliseconds)).toBe(expected);
    });

    it('never understates the time left, rounding part seconds up', () => {
        expect(formatRemaining(1)).toBe('0min 01sec');
        expect(formatRemaining(999)).toBe('0min 01sec');
        expect(formatRemaining(1000)).toBe('0min 01sec');
        expect(formatRemaining(1001)).toBe('0min 02sec');
        expect(formatRemaining(3_599_999)).toBe('1h 0min 00sec');
    });

    it('shrinks the seconds above ten minutes and sets them full size at or below', () => {
        const above = remainingSegments(600_001);
        const atThreshold = remainingSegments(600_000);

        expect(above.at(-2)).toEqual({ scale: 'small', text: '01' });
        expect(atThreshold.at(-2)).toEqual({ scale: 'full', text: '00' });
    });

    it('reports a widest string no producible value renders wider than', () => {
        const reserved = renderedWidth(segmentsRendering(widestRemainingString()));

        for (let milliseconds = 0; milliseconds <= maxRemainingMilliseconds; milliseconds += 1000) {
            expect(renderedWidth(remainingSegments(milliseconds))).toBeLessThanOrEqual(reserved);
        }
    });
});

describe('composeExamLabel', () => {
    it('omits the suffix for a paper session', () => {
        expect(composeExamLabel(b2First, 'paper', 'full')).toBe('B2 First');
    });

    it('spells out the suffix for a digital session at full density', () => {
        expect(composeExamLabel(b2First, 'digital', 'full')).toBe('B2 First Digital');
    });

    it('abbreviates the name but never the suffix the screen reader hears', () => {
        expect(composeExamLabel(b2First, 'digital', 'compact')).toBe('B2 Digital');
    });

    it('marks the digital mode only where the exam also runs on paper', () => {
        expect(marksDigitalMode(b2First, 'digital')).toBe(true);
        expect(marksDigitalMode(b2First, 'paper')).toBe(false);
        expect(marksDigitalMode(linguaskillGeneral, 'digital')).toBe(false);
    });

    it('omits the suffix for a digital-only exam', () => {
        expect(composeExamLabel(linguaskillGeneral, 'digital', 'compact')).toBe('Lsk');
        expect(composeExamLabel(linguaskillGeneral, 'digital', 'full')).toBe('Linguaskill General');
    });
});

describe('partLabel', () => {
    it('keeps the full part name at full density', () => {
        expect(partLabel('Reading & Use of English', 'full')).toBe('Reading & Use of English');
    });

    it('abbreviates the two long part names at compact density', () => {
        expect(partLabel('Reading & Use of English', 'compact')).toBe('Reading & UoE');
        expect(partLabel('Reading & Writing', 'compact')).toBe('Reading & Wr.');
    });

    it('falls back to the full name for parts with no abbreviation', () => {
        expect(partLabel('Listening', 'compact')).toBe('Listening');
        expect(partLabel('Speaking', 'compact')).toBe('Speaking');
    });
});

describe('densityFor', () => {
    it.each([
        [1, 'full'],
        [2, 'full'],
        [3, 'compact'],
        [4, 'compact'],
    ])('maps %i sessions to %s', (sessionCount, expected) => {
        expect(densityFor(sessionCount)).toBe(expected);
    });
});

describe('formatClockSkew', () => {
    it('reads a backward step as going back', () => {
        expect(formatClockSkew(-60 * 60_000)).toBe('1h back');
    });

    it('reads a forward step as going forward', () => {
        expect(formatClockSkew(25 * 60_000)).toBe('25min forward');
    });

    it('keeps hours and minutes together', () => {
        expect(formatClockSkew(-95 * 60_000)).toBe('1h 35min back');
    });

    it('falls back to seconds for a step under a minute', () => {
        expect(formatClockSkew(30_000)).toBe('30sec forward');
    });
});
