import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { CalendarPlus, CircleAlert, FileText, GraduationCap, ListChecks, Monitor, Pencil, Timer } from "lucide-react";
import {
  DIALOG_CONTROL_CLASSES,
  DIALOG_CONTROL_INVALID_CLASSES,
  DIALOG_ERROR_CLASSES,
  DIALOG_ERROR_ICON_CLASSES,
  DIALOG_FIELD_CLASSES,
  DIALOG_FIELD_HEADER_CLASSES,
  DIALOG_HINT_CLASSES,
  DIALOG_LABEL_CLASSES,
  DIALOG_LABEL_ICON_CLASSES,
  DIALOG_REQUIRED_MARK_CLASSES,
  ModalDialog,
} from "./ModalDialog";
import { MAX_EXTRA_MINUTES } from "../config/board";
import { exams } from "../config/exams";
import type { Exam, Mode } from "../config/exams";
import { addSession, getSnapshot, setSessionConfig } from "../store/boardStore";

export type SessionDialogTarget = { kind: "add" } | { kind: "edit"; sessionId: string };

type SessionDialogProps = {
  target: SessionDialogTarget;
  onClose: () => void;
};

type DraftSession = {
  examName: string;
  partValue: string;
  mode: Mode | "";
  extraMinutes: string;
};

type FieldName = "exam" | "part" | "mode" | "extraMinutes";

const MODE_LABELS: Record<Mode, string> = {
  paper: "Paper",
  digital: "Digital",
};

const ALL_MODES: readonly Mode[] = ["paper", "digital"];

const EMPTY_DRAFT: DraftSession = {
  examName: "",
  partValue: "",
  mode: "",
  extraMinutes: "0",
};

const NOTHING_TOUCHED: Record<FieldName, boolean> = {
  exam: false,
  part: false,
  mode: false,
  extraMinutes: false,
};

const REQUIRED_MARK = "required";

const FIELDSET_CLASSES = "flex flex-col gap-2 border-0 p-0";

const LEGEND_CLASSES = "mb-2 text-base font-semibold text-vlec-blue-900";

const MODE_LIST_CLASSES = "flex flex-wrap gap-3";

const MODE_OPTION_CLASSES =
  "inline-flex cursor-pointer items-center gap-3 rounded-lg border border-vlec-blue-300 px-4 py-3 text-lg transition-colors hover:border-vlec-blue-500 has-checked:border-vlec-blue-900 has-checked:bg-vlec-blue-50 has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-vlec-blue-700";

const MODE_OPTION_INVALID_CLASSES =
  "inline-flex cursor-pointer items-center gap-3 rounded-lg border-2 border-vlec-red-700 px-4 py-3 text-lg transition-colors has-checked:border-vlec-blue-900 has-checked:bg-vlec-blue-50 has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-vlec-blue-700";

const MODE_OPTION_WAITING_CLASSES =
  "inline-flex cursor-not-allowed items-center gap-3 rounded-lg border border-linguaskill-slate-200 bg-linguaskill-slate-100 px-4 py-3 text-lg text-linguaskill-slate-500";

const RADIO_CLASSES = "h-5 w-5 accent-vlec-blue-900";

const MODE_ICON_CLASSES = "h-[1em] w-[1em] shrink-0";

const examByName = (examName: string): Exam | undefined =>
  exams.find((candidate) => candidate.examName === examName);

const draftFor = (target: SessionDialogTarget): DraftSession => {
  if (target.kind === "add") {
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
};

const parseExtraMinutes = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const minutes = Number(trimmed);
  return minutes > MAX_EXTRA_MINUTES ? null : minutes;
};

export function SessionDialog({ target, onClose }: SessionDialogProps): ReactElement {
  const [draft, setDraft] = useState<DraftSession>(() => draftFor(target));
  const [touched, setTouched] = useState<Record<FieldName, boolean>>(NOTHING_TOUCHED);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [examChoices, setExamChoices] = useState(0);
  const examRef = useRef<HTMLSelectElement>(null);
  const partRef = useRef<HTMLSelectElement>(null);
  const modeRef = useRef<HTMLInputElement>(null);
  const extraMinutesRef = useRef<HTMLInputElement>(null);
  const examId = useId();
  const examErrorId = useId();
  const partId = useId();
  const partErrorId = useId();
  const extraMinutesId = useId();
  const extraMinutesErrorId = useId();
  const modeErrorId = useId();
  const modeGroupName = useId();

  const exam = examByName(draft.examName);
  const partIndex = draft.partValue === "" ? -1 : Number(draft.partValue);
  const part = exam?.examParts[partIndex];
  const mode = draft.mode;
  const extraMinutes = parseExtraMinutes(draft.extraMinutes);
  const availableModes = exam?.modes ?? ALL_MODES;

  const showsError = (field: FieldName, invalid: boolean): boolean =>
    invalid && (saveAttempted || touched[field]);

  const examError = showsError("exam", exam === undefined);
  const partError = showsError("part", part === undefined);
  const modeError = showsError("mode", mode === "");
  const extraMinutesError = showsError("extraMinutes", extraMinutes === null);

  useEffect(() => {
    if (examChoices === 0) {
      return;
    }
    if (document.activeElement !== examRef.current) {
      return;
    }
    partRef.current?.focus();
  }, [examChoices]);

  function markTouched(field: FieldName) {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  }

  function handleExamBlur() {
    markTouched("exam");
  }

  function handlePartBlur() {
    markTouched("part");
  }

  function handleModeBlur() {
    markTouched("mode");
  }

  function handleExtraMinutesBlur() {
    markTouched("extraMinutes");
  }

  function handleExamChange(event: ChangeEvent<HTMLSelectElement>) {
    setDraft((current) => ({
      ...current,
      examName: event.target.value,
      partValue: "",
      mode: "",
    }));
    setTouched((current) => ({ ...current, part: false, mode: false }));
    setExamChoices((count) => count + 1);
  }

  function handlePartChange(event: ChangeEvent<HTMLSelectElement>) {
    setDraft((current) => ({ ...current, partValue: event.target.value }));
  }

  function handleModeChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.value === "digital" ? "digital" : "paper";
    setDraft((current) => ({ ...current, mode: chosen }));
  }

  function handleExtraMinutesChange(event: ChangeEvent<HTMLInputElement>) {
    setDraft((current) => ({ ...current, extraMinutes: event.target.value }));
  }

  function handleSubmit(): boolean {
    if (exam === undefined || part === undefined || mode === "" || extraMinutes === null) {
      setSaveAttempted(true);
      if (exam === undefined) {
        examRef.current?.focus();
      } else if (part === undefined) {
        partRef.current?.focus();
      } else if (mode === "") {
        modeRef.current?.focus();
      } else {
        extraMinutesRef.current?.focus();
      }
      return false;
    }
    const config = { examName: exam.examName, partIndex, mode, extraMinutes };
    if (target.kind === "add") {
      addSession(config);
      return true;
    }
    setSessionConfig(target.sessionId, config);
    return true;
  }

  return (
    <ModalDialog
      title={target.kind === "add" ? "Add a session" : "Configure this session"}
      titleIcon={target.kind === "add" ? CalendarPlus : Pencil}
      submitLabel="Save"
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className={DIALOG_FIELD_CLASSES}>
        <div className={DIALOG_FIELD_HEADER_CLASSES}>
          <label className={DIALOG_LABEL_CLASSES} htmlFor={examId}>
            <GraduationCap className={DIALOG_LABEL_ICON_CLASSES} aria-hidden="true" />
            Exam
          </label>
          <span className={DIALOG_REQUIRED_MARK_CLASSES} aria-hidden="true">
            {REQUIRED_MARK}
          </span>
        </div>
        <select
          id={examId}
          ref={examRef}
          data-initial-focus
          className={examError ? DIALOG_CONTROL_INVALID_CLASSES : DIALOG_CONTROL_CLASSES}
          value={draft.examName}
          onChange={handleExamChange}
          onBlur={handleExamBlur}
          required
          aria-invalid={examError}
          aria-describedby={examError ? examErrorId : undefined}
        >
          <option value="">Choose an exam</option>
          {exams.map((candidate) => (
            <option key={candidate.examName} value={candidate.examName}>
              {candidate.examName}
            </option>
          ))}
        </select>
        {examError ? (
          <p className={DIALOG_ERROR_CLASSES} id={examErrorId}>
            <CircleAlert className={DIALOG_ERROR_ICON_CLASSES} aria-hidden="true" />
            Choose which exam this session is for.
          </p>
        ) : null}
      </div>

      <div className={DIALOG_FIELD_CLASSES}>
        <div className={DIALOG_FIELD_HEADER_CLASSES}>
          <label className={DIALOG_LABEL_CLASSES} htmlFor={partId}>
            <ListChecks className={DIALOG_LABEL_ICON_CLASSES} aria-hidden="true" />
            Component
          </label>
          <span className={DIALOG_REQUIRED_MARK_CLASSES} aria-hidden="true">
            {REQUIRED_MARK}
          </span>
        </div>
        <select
          id={partId}
          ref={partRef}
          className={partError ? DIALOG_CONTROL_INVALID_CLASSES : DIALOG_CONTROL_CLASSES}
          value={draft.partValue}
          onChange={handlePartChange}
          onBlur={handlePartBlur}
          disabled={exam === undefined}
          required
          aria-invalid={partError}
          aria-describedby={partError ? partErrorId : undefined}
        >
          <option value="">
            {exam === undefined ? "Choose an exam first" : "Choose a component"}
          </option>
          {exam?.examParts.map((examPart, index) => (
            <option key={examPart.id} value={String(index)}>
              {examPart.name}
            </option>
          ))}
        </select>
        {partError ? (
          <p className={DIALOG_ERROR_CLASSES} id={partErrorId}>
            <CircleAlert className={DIALOG_ERROR_ICON_CLASSES} aria-hidden="true" />
            Choose the component being sat.
          </p>
        ) : null}
      </div>

      <fieldset className={FIELDSET_CLASSES} onBlur={handleModeBlur}>
        <legend className={LEGEND_CLASSES}>Format</legend>
        <div className={MODE_LIST_CLASSES}>
          {availableModes.map((availableMode, index) => (
            <label
              key={availableMode}
              className={
                exam === undefined
                  ? MODE_OPTION_WAITING_CLASSES
                  : modeError
                    ? MODE_OPTION_INVALID_CLASSES
                    : MODE_OPTION_CLASSES
              }
            >
              <input
                className={RADIO_CLASSES}
                ref={index === 0 ? modeRef : undefined}
                type="radio"
                name={modeGroupName}
                value={availableMode}
                checked={draft.mode === availableMode}
                onChange={handleModeChange}
                disabled={exam === undefined}
                required
                aria-invalid={modeError}
                aria-describedby={modeError ? modeErrorId : undefined}
              />
              {availableMode === "paper" ? (
                <FileText className={MODE_ICON_CLASSES} aria-hidden="true" />
              ) : (
                <Monitor className={MODE_ICON_CLASSES} aria-hidden="true" />
              )}
              {MODE_LABELS[availableMode]}
            </label>
          ))}
        </div>
        {exam === undefined ? (
          <p className={DIALOG_HINT_CLASSES}>The formats on offer depend on the exam.</p>
        ) : null}
        {modeError ? (
          <p className={DIALOG_ERROR_CLASSES} id={modeErrorId}>
            <CircleAlert className={DIALOG_ERROR_ICON_CLASSES} aria-hidden="true" />
            Say whether this session is on paper or on screen.
          </p>
        ) : null}
      </fieldset>

      <div className={DIALOG_FIELD_CLASSES}>
        <label className={DIALOG_LABEL_CLASSES} htmlFor={extraMinutesId}>
          <Timer className={DIALOG_LABEL_ICON_CLASSES} aria-hidden="true" />
          Extra time (whole minutes)
        </label>
        <input
          id={extraMinutesId}
          ref={extraMinutesRef}
          className={extraMinutesError ? DIALOG_CONTROL_INVALID_CLASSES : DIALOG_CONTROL_CLASSES}
          type="number"
          min="0"
          max={MAX_EXTRA_MINUTES}
          step="1"
          inputMode="numeric"
          value={draft.extraMinutes}
          onChange={handleExtraMinutesChange}
          onBlur={handleExtraMinutesBlur}
          aria-invalid={extraMinutesError}
          aria-describedby={extraMinutesError ? extraMinutesErrorId : undefined}
        />
        {extraMinutesError ? (
          <p className={DIALOG_ERROR_CLASSES} id={extraMinutesErrorId}>
            <CircleAlert className={DIALOG_ERROR_ICON_CLASSES} aria-hidden="true" />
            Enter whole minutes between 0 and {MAX_EXTRA_MINUTES}.
          </p>
        ) : null}
      </div>
    </ModalDialog>
  );
}
