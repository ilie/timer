import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import {
  DIALOG_CONTROL_CLASSES,
  DIALOG_CONTROL_OUTSTANDING_CLASSES,
  DIALOG_ERROR_CLASSES,
  DIALOG_FIELD_CLASSES,
  DIALOG_HINT_CLASSES,
  DIALOG_LABEL_CLASSES,
  DIALOG_REQUIRED_CHIP_CLASSES,
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

const MODE_LABELS: Record<Mode, string> = {
  paper: "Paper",
  digital: "Digital",
};

const EMPTY_DRAFT: DraftSession = {
  examName: "",
  partValue: "",
  mode: "",
  extraMinutes: "0",
};

const FIELDSET_CLASSES = "flex flex-col gap-2 border-0 p-0";

const FIELD_HEADER_CLASSES = "flex items-center";

const LEGEND_CLASSES = "mb-2 text-base font-semibold text-vlec-blue-900";

const MODE_LIST_CLASSES = "flex flex-wrap gap-3";

const MODE_OPTION_CLASSES =
  "inline-flex cursor-pointer items-center gap-3 rounded-lg border border-vlec-blue-300 px-4 py-3 text-lg has-checked:border-vlec-blue-900 has-checked:bg-vlec-blue-50 has-checked:font-semibold";

const MODE_OPTION_OUTSTANDING_CLASSES =
  "inline-flex cursor-pointer items-center gap-3 rounded-lg border-2 border-vlec-red-600 bg-vlec-red-50 px-4 py-3 text-lg has-checked:border-vlec-blue-900 has-checked:bg-vlec-blue-50 has-checked:font-semibold";

const MODE_OPTION_WAITING_CLASSES =
  "inline-flex cursor-not-allowed items-center gap-3 rounded-lg border border-linguaskill-slate-200 bg-linguaskill-slate-100 px-4 py-3 text-lg text-linguaskill-slate-500";

const RADIO_CLASSES = "h-5 w-5 accent-vlec-blue-900";

const ALL_MODES: readonly Mode[] = ["paper", "digital"];

const missingFieldsHint = (
  examChosen: boolean,
  partChosen: boolean,
  modeChosen: boolean,
): string | undefined => {
  const missing = [
    examChosen ? null : "an exam",
    partChosen ? null : "a component",
    modeChosen ? null : "a format",
  ].filter((entry) => entry !== null);
  if (missing.length === 0) {
    return undefined;
  }
  return `Still to choose: ${missing.join(", ")}.`;
};

const REQUIRED_CHIP = "Required";

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
  const [examChoices, setExamChoices] = useState(0);
  const examRef = useRef<HTMLSelectElement>(null);
  const partRef = useRef<HTMLSelectElement>(null);
  const examId = useId();
  const partId = useId();
  const extraMinutesId = useId();
  const extraMinutesErrorId = useId();
  const outstandingId = useId();
  const modeGroupName = useId();

  const exam = examByName(draft.examName);
  const partIndex = draft.partValue === "" ? -1 : Number(draft.partValue);
  const part = exam?.examParts[partIndex];
  const mode = draft.mode;
  const extraMinutes = parseExtraMinutes(draft.extraMinutes);
  const canSubmit =
    exam !== undefined && part !== undefined && mode !== "" && extraMinutes !== null;
  const availableModes = exam?.modes ?? ALL_MODES;
  const examOutstanding = exam === undefined;
  const partOutstanding = part === undefined;
  const modeOutstanding = mode === "";
  const hint = missingFieldsHint(!examOutstanding, !partOutstanding, !modeOutstanding);

  useEffect(() => {
    if (examChoices === 0) {
      return;
    }
    if (document.activeElement !== examRef.current) {
      return;
    }
    partRef.current?.focus();
  }, [examChoices]);

  function handleExamChange(event: ChangeEvent<HTMLSelectElement>) {
    setDraft((current) => ({
      ...current,
      examName: event.target.value,
      partValue: "",
      mode: "",
    }));
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

  function handleSubmit() {
    if (exam === undefined || part === undefined || mode === "" || extraMinutes === null) {
      return;
    }
    const config = { examName: exam.examName, partIndex, mode, extraMinutes };
    if (target.kind === "add") {
      addSession(config);
      return;
    }
    setSessionConfig(target.sessionId, config);
  }

  return (
    <ModalDialog
      title={target.kind === "add" ? "Add a session" : "Configure this session"}
      submitLabel="Save"
      hint={hint}
      hintId={outstandingId}
      canSubmit={canSubmit}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className={DIALOG_FIELD_CLASSES}>
        <div className={FIELD_HEADER_CLASSES}>
          <label className={DIALOG_LABEL_CLASSES} htmlFor={examId}>
            Exam
          </label>
          {examOutstanding ? (
            <span className={DIALOG_REQUIRED_CHIP_CLASSES} aria-hidden="true">
              {REQUIRED_CHIP}
            </span>
          ) : null}
        </div>
        <select
          id={examId}
          ref={examRef}
          data-initial-focus
          className={examOutstanding ? DIALOG_CONTROL_OUTSTANDING_CLASSES : DIALOG_CONTROL_CLASSES}
          value={draft.examName}
          onChange={handleExamChange}
          required
          aria-describedby={examOutstanding ? outstandingId : undefined}
        >
          <option value="">Choose an exam</option>
          {exams.map((candidate) => (
            <option key={candidate.examName} value={candidate.examName}>
              {candidate.examName}
            </option>
          ))}
        </select>
      </div>

      <div className={DIALOG_FIELD_CLASSES}>
        <div className={FIELD_HEADER_CLASSES}>
          <label className={DIALOG_LABEL_CLASSES} htmlFor={partId}>
            Component
          </label>
          {partOutstanding ? (
            <span className={DIALOG_REQUIRED_CHIP_CLASSES} aria-hidden="true">
              {REQUIRED_CHIP}
            </span>
          ) : null}
        </div>
        <select
          id={partId}
          ref={partRef}
          className={
            partOutstanding && !examOutstanding
              ? DIALOG_CONTROL_OUTSTANDING_CLASSES
              : DIALOG_CONTROL_CLASSES
          }
          value={draft.partValue}
          onChange={handlePartChange}
          disabled={exam === undefined}
          required
          aria-describedby={partOutstanding ? outstandingId : undefined}
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
      </div>

      <fieldset className={FIELDSET_CLASSES}>
        <legend className={LEGEND_CLASSES}>
          Format
          {modeOutstanding ? (
            <span className={DIALOG_REQUIRED_CHIP_CLASSES} aria-hidden="true">
              {REQUIRED_CHIP}
            </span>
          ) : null}
        </legend>
        <div className={MODE_LIST_CLASSES}>
          {availableModes.map((availableMode) => (
            <label
              key={availableMode}
              className={
                exam === undefined
                  ? MODE_OPTION_WAITING_CLASSES
                  : modeOutstanding
                    ? MODE_OPTION_OUTSTANDING_CLASSES
                    : MODE_OPTION_CLASSES
              }
            >
              <input
                className={RADIO_CLASSES}
                type="radio"
                name={modeGroupName}
                value={availableMode}
                checked={draft.mode === availableMode}
                onChange={handleModeChange}
                disabled={exam === undefined}
                required
                aria-describedby={modeOutstanding ? outstandingId : undefined}
              />
              {MODE_LABELS[availableMode]}
            </label>
          ))}
        </div>
        {exam === undefined ? (
          <p className={DIALOG_HINT_CLASSES}>Choose an exam to see the formats it is offered in.</p>
        ) : null}
      </fieldset>

      <div className={DIALOG_FIELD_CLASSES}>
        <label className={DIALOG_LABEL_CLASSES} htmlFor={extraMinutesId}>
          Extra time (whole minutes)
        </label>
        <input
          id={extraMinutesId}
          className={DIALOG_CONTROL_CLASSES}
          type="number"
          min="0"
          max={MAX_EXTRA_MINUTES}
          step="1"
          inputMode="numeric"
          value={draft.extraMinutes}
          onChange={handleExtraMinutesChange}
          aria-invalid={extraMinutes === null}
          aria-describedby={extraMinutes === null ? extraMinutesErrorId : undefined}
        />
        {extraMinutes === null ? (
          <p className={DIALOG_ERROR_CLASSES} id={extraMinutesErrorId} role="alert">
            Enter whole minutes between 0 and {MAX_EXTRA_MINUTES}.
          </p>
        ) : null}
      </div>
    </ModalDialog>
  );
}
