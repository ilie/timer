import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import {
  CalendarPlus,
  FileText,
  GraduationCap,
  ListChecks,
  Monitor,
  Pencil,
  Timer,
} from "lucide-react";
import { DialogError, DialogField, DialogHint, dialogControlClasses } from "./DialogField";
import { ModalDialog } from "./ModalDialog";
import { MAX_EXTRA_MINUTES } from "../config/board";
import { examByName, exams } from "../config/exams";
import type { Mode } from "../config/exams";
import { addSession, getSnapshot, setSessionConfig } from "../store/boardStore";

export type SessionDialogTarget = { kind: "add" } | { kind: "edit"; sessionId: string };

type SessionDialogProps = {
  target: SessionDialogTarget;
  onClose: () => void;
};

/** The dialog's own copy of the configuration, held as the strings its controls carry. */
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

const FIELDSET_CLASSES = "flex flex-col gap-2 border-0 p-0";

const LEGEND_CLASSES = "mb-2 text-base font-medium text-linguaskill-slate-700";

const MODE_LIST_CLASSES = "flex flex-wrap gap-3";

const MODE_OPTION_BASE_CLASSES = "inline-flex items-center gap-3 rounded-lg px-4 py-3 text-lg";

const MODE_OPTION_CLASSES = `${MODE_OPTION_BASE_CLASSES} cursor-pointer border border-linguaskill-slate-300 transition-colors hover:border-linguaskill-slate-400 has-checked:border-vlec-blue-900 has-checked:bg-vlec-blue-50 has-checked:font-medium has-checked:text-vlec-blue-900 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-vlec-blue-700`;

const MODE_OPTION_INVALID_CLASSES = `${MODE_OPTION_BASE_CLASSES} cursor-pointer border-2 border-vlec-red-700 transition-colors has-checked:border-vlec-blue-900 has-checked:bg-vlec-blue-50 has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-vlec-blue-700`;

const MODE_OPTION_WAITING_CLASSES = `${MODE_OPTION_BASE_CLASSES} cursor-not-allowed border border-linguaskill-slate-200 bg-linguaskill-slate-50 text-linguaskill-slate-400`;

const RADIO_CLASSES = "h-5 w-5 accent-vlec-blue-900";

const MODE_ICON_CLASSES = "h-[1em] w-[1em] shrink-0";

function draftFor(target: SessionDialogTarget): DraftSession {
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
}

function parseExtraMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const minutes = Number(trimmed);
  return minutes > MAX_EXTRA_MINUTES ? null : minutes;
}

function modeOptionClasses(waiting: boolean, invalid: boolean): string {
  if (waiting) {
    return MODE_OPTION_WAITING_CLASSES;
  }
  if (invalid) {
    return MODE_OPTION_INVALID_CLASSES;
  }
  return MODE_OPTION_CLASSES;
}

export function SessionDialog({ target, onClose }: SessionDialogProps): ReactElement {
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
  const partIndex = draft.partValue === "" ? -1 : Number(draft.partValue);
  const part = exam?.examParts[partIndex];
  const mode = draft.mode;
  const extraMinutes = parseExtraMinutes(draft.extraMinutes);
  const availableModes = exam?.modes ?? ALL_MODES;

  const showsError = (field: FieldName, invalid: boolean): boolean =>
    invalid && (saveAttempted || touched[field]);

  const modeError = showsError("mode", mode === "");

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
    focusesPartAfterRender.current = document.activeElement === examRef.current;
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

  function focusFirstGap() {
    if (exam === undefined) {
      examRef.current?.focus();
      return;
    }
    if (part === undefined) {
      partRef.current?.focus();
      return;
    }
    if (mode === "") {
      modeRef.current?.focus();
      return;
    }
    extraMinutesRef.current?.focus();
  }

  function handleSubmit(): boolean {
    if (exam === undefined || part === undefined || mode === "" || extraMinutes === null) {
      setSaveAttempted(true);
      focusFirstGap();
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
      title={target.kind === "add" ? "Add a Session" : "Configure This Session"}
      titleIcon={target.kind === "add" ? CalendarPlus : Pencil}
      submitLabel="Save"
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <DialogField
        label="Exam"
        icon={GraduationCap}
        required
        error={
          showsError("exam", exam === undefined) ? "Choose which exam this session is for." : null
        }
      >
        {(control) => (
          <select
            id={control.id}
            ref={examRef}
            data-initial-focus
            className={dialogControlClasses(control.invalid)}
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
          </select>
        )}
      </DialogField>

      <DialogField
        label="Component"
        icon={ListChecks}
        required
        error={showsError("part", part === undefined) ? "Choose the component being sat." : null}
      >
        {(control) => (
          <select
            id={control.id}
            ref={partRef}
            className={dialogControlClasses(control.invalid)}
            value={draft.partValue}
            onChange={handlePartChange}
            onBlur={handlePartBlur}
            disabled={exam === undefined}
            required
            aria-invalid={control.invalid}
            aria-describedby={control.describedBy}
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
        )}
      </DialogField>

      <fieldset
        className={FIELDSET_CLASSES}
        onBlur={handleModeBlur}
        aria-describedby={modeError ? modeErrorId : undefined}
      >
        <legend className={LEGEND_CLASSES}>Format</legend>
        <div className={MODE_LIST_CLASSES}>
          {availableModes.map((availableMode, index) => (
            <label key={availableMode} className={modeOptionClasses(exam === undefined, modeError)}>
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
        {exam === undefined && <DialogHint>The formats on offer depend on the exam.</DialogHint>}
        {modeError && (
          <DialogError id={modeErrorId}>
            Say whether this session is on paper or on screen.
          </DialogError>
        )}
      </fieldset>

      <DialogField
        label="Extra time (whole minutes)"
        icon={Timer}
        error={
          showsError("extraMinutes", extraMinutes === null)
            ? `Enter whole minutes between 0 and ${MAX_EXTRA_MINUTES}.`
            : null
        }
      >
        {(control) => (
          <input
            id={control.id}
            ref={extraMinutesRef}
            className={dialogControlClasses(control.invalid)}
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
