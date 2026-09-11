import { maxExtraMinutes } from '../config/board';
import type { Mode } from '../config/exams';

/** The dialog's working copy of a session, held as the strings the form edits. */
export type DraftSession = {
    examName: string;
    partValue: string;
    mode: Mode | '';
    extraMinutes: string;
};

export type FieldName = 'exam' | 'part' | 'mode' | 'extraMinutes';

export const emptyDraft: DraftSession = {
    examName: '',
    partValue: '',
    mode: '',
    extraMinutes: '',
};

export const nothingTouched: Record<FieldName, boolean> = {
    exam: false,
    part: false,
    mode: false,
    extraMinutes: false,
};

/** Null when the text is not a whole number of minutes within the allowance. */
export function parseExtraMinutes(value: string): number | null {
    const trimmed = value.trim();
    if (trimmed === '') {
        return 0;
    }
    if (!/^\d+$/.test(trimmed)) {
        return null;
    }
    const minutes = Number(trimmed);
    return minutes > maxExtraMinutes ? null : minutes;
}
