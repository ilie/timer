import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { CalendarPlus, GraduationCap, ListChecks, Pencil, Timer } from 'lucide-react';
import { DialogField } from './DialogField';
import { Select, TextInput } from './UI/FormControl';
import { ModeField } from './ModeField';
import { ModalDialog } from './ModalDialog';
import { MAX_EXTRA_MINUTES } from '../config/board';
import { examByName, exams } from '../config/exams';
import type { Mode } from '../config/exams';
import { addSession, getSnapshot, setSessionConfig } from '../store/boardStore';
import { EMPTY_DRAFT, NOTHING_TOUCHED, parseExtraMinutes } from '../lib/sessionDraft';
import type { DraftSession, FieldName } from '../lib/sessionDraft';

export type SessionDialogTarget = { kind: 'add' } | { kind: 'edit'; sessionId: string };

type SessionDialogProps = {
    target: SessionDialogTarget;
    onClose: () => void;
    className?: string;
};

/** The dialog's own copy of the configuration, held as the strings its controls carry. */
const ALL_MODES: readonly Mode[] = ['paper', 'digital'];

function draftFor(target: SessionDialogTarget): DraftSession {
    if (target.kind === 'add') {
        return EMPTY_DRAFT;
    }
    const session = getSnapshot().sessions.find((candidate) => candidate.id === target.sessionId);
    if (session === undefined) {
        return EMPTY_DRAFT;
    }
    return {
        examName: session.examName,
        partValue: String(session.partIndex),
        mode: session.mode,
        extraMinutes: String(session.extraMinutes),
    };
}

export function SessionDialog({ target, onClose, className }: SessionDialogProps): ReactElement {
    const [draft, setDraft] = useState<DraftSession>(() => draftFor(target));
    const [touched, setTouched] = useState<Record<FieldName, boolean>>(NOTHING_TOUCHED);
    const [saveAttempted, setSaveAttempted] = useState(false);
    const examRef = useRef<HTMLSelectElement>(null);
    const partRef = useRef<HTMLSelectElement>(null);
    const modeRef = useRef<HTMLInputElement>(null);
    const extraMinutesRef = useRef<HTMLInputElement>(null);
    // The component select is disabled until an exam is chosen, so it can only be
    // focused once the choice has been rendered.
    const focusesPartAfterRender = useRef(false);
    const modeErrorId = useId();
    const modeGroupName = useId();

    const exam = examByName(draft.examName);
    const partIndex = draft.partValue === '' ? -1 : Number(draft.partValue);
    const part = exam?.examParts[partIndex];
    const mode = draft.mode;
    const extraMinutes = parseExtraMinutes(draft.extraMinutes);
    const availableModes = exam?.modes ?? ALL_MODES;

    const showsError = (field: FieldName, invalid: boolean): boolean => invalid && (saveAttempted || touched[field]);

    const modeError = showsError('mode', mode === '');

    useEffect(() => {
        if (!focusesPartAfterRender.current) {
            return;
        }
        focusesPartAfterRender.current = false;
        partRef.current?.focus();
    });

    function markTouched(field: FieldName) {
        setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
    }

    function handleExamBlur() {
        markTouched('exam');
    }

    function handlePartBlur() {
        markTouched('part');
    }

    function handleModeBlur() {
        markTouched('mode');
    }

    function handleExtraMinutesBlur() {
        markTouched('extraMinutes');
    }

    function handleExamChange(event: ChangeEvent<HTMLSelectElement>) {
        setDraft((current) => ({
            ...current,
            examName: event.target.value,
            partValue: '',
            mode: '',
        }));
        setTouched((current) => ({ ...current, part: false, mode: false }));
        focusesPartAfterRender.current = document.activeElement === examRef.current;
    }

    function handlePartChange(event: ChangeEvent<HTMLSelectElement>) {
        setDraft((current) => ({ ...current, partValue: event.target.value }));
    }

    function handleModeChange(mode: Mode) {
        setDraft((current) => ({ ...current, mode }));
    }

    function handleExtraMinutesChange(event: ChangeEvent<HTMLInputElement>) {
        setDraft((current) => ({ ...current, extraMinutes: event.target.value }));
    }

    function focusFirstGap() {
        if (exam === undefined) {
            examRef.current?.focus();
            return;
        }
        if (part === undefined) {
            partRef.current?.focus();
            return;
        }
        if (mode === '') {
            modeRef.current?.focus();
            return;
        }
        extraMinutesRef.current?.focus();
    }

    function handleSubmit(): boolean {
        if (exam === undefined || part === undefined || mode === '' || extraMinutes === null) {
            setSaveAttempted(true);
            focusFirstGap();
            return false;
        }
        const config = { examName: exam.examName, partIndex, mode, extraMinutes };
        if (target.kind === 'add') {
            addSession(config);
            return true;
        }
        setSessionConfig(target.sessionId, config);
        return true;
    }

    return (
        <ModalDialog
            title={target.kind === 'add' ? 'Add a Session' : 'Configure This Session'}
            titleIcon={target.kind === 'add' ? CalendarPlus : Pencil}
            submitLabel="Save"
            onSubmit={handleSubmit}
            onClose={onClose}
            className={className}
        >
            <DialogField
                label="Exam"
                icon={GraduationCap}
                required
                error={showsError('exam', exam === undefined) ? 'Choose which exam this session is for.' : null}
            >
                {(control) => (
                    <Select
                        id={control.id}
                        ref={examRef}
                        data-initial-focus
                        invalid={control.invalid}
                        value={draft.examName}
                        onChange={handleExamChange}
                        onBlur={handleExamBlur}
                        required
                        aria-invalid={control.invalid}
                        aria-describedby={control.describedBy}
                    >
                        <option value="">Choose an exam</option>
                        {exams.map((candidate) => (
                            <option key={candidate.examName} value={candidate.examName}>
                                {candidate.examName}
                            </option>
                        ))}
                    </Select>
                )}
            </DialogField>

            <DialogField
                label="Component"
                icon={ListChecks}
                required
                error={showsError('part', part === undefined) ? 'Choose the component being sat.' : null}
            >
                {(control) => (
                    <Select
                        id={control.id}
                        ref={partRef}
                        invalid={control.invalid}
                        value={draft.partValue}
                        onChange={handlePartChange}
                        onBlur={handlePartBlur}
                        disabled={exam === undefined}
                        required
                        aria-invalid={control.invalid}
                        aria-describedby={control.describedBy}
                    >
                        <option value="">{exam === undefined ? 'Choose an exam first' : 'Choose a component'}</option>
                        {exam?.examParts.map((examPart, index) => (
                            <option key={examPart.id} value={String(index)}>
                                {examPart.name}
                            </option>
                        ))}
                    </Select>
                )}
            </DialogField>

            <ModeField
                availableModes={availableModes}
                selected={draft.mode}
                waiting={exam === undefined}
                invalid={modeError}
                errorId={modeErrorId}
                groupName={modeGroupName}
                firstOptionRef={modeRef}
                onChange={handleModeChange}
                onBlur={handleModeBlur}
            />

            <DialogField
                label="Extra time (whole minutes)"
                icon={Timer}
                error={
                    showsError('extraMinutes', extraMinutes === null)
                        ? `Enter whole minutes between 0 and ${MAX_EXTRA_MINUTES}.`
                        : null
                }
            >
                {(control) => (
                    <TextInput
                        id={control.id}
                        ref={extraMinutesRef}
                        invalid={control.invalid}
                        type="number"
                        min="0"
                        max={MAX_EXTRA_MINUTES}
                        step="1"
                        inputMode="numeric"
                        value={draft.extraMinutes}
                        onChange={handleExtraMinutesChange}
                        onBlur={handleExtraMinutesBlur}
                        aria-invalid={control.invalid}
                        aria-describedby={control.describedBy}
                    />
                )}
            </DialogField>
        </ModalDialog>
    );
}
