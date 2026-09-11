import { FileText, Monitor } from "lucide-react";
import type { ReactElement, Ref } from "react";
import { DialogError, DialogHint } from "./DialogField";
import type { Mode } from "../config/exams";

type ModeFieldProps = {
  /** The formats this exam offers, empty until an exam is chosen. */
  availableModes: readonly Mode[];
  selected: Mode | "";
  /** True before an exam is chosen, when there is nothing to offer yet. */
  waiting: boolean;
  invalid: boolean;
  errorId: string;
  groupName: string;
  firstOptionRef: Ref<HTMLInputElement>;
  onChange: (mode: Mode) => void;
  onBlur: () => void;
};

const MODE_LABELS: Record<Mode, string> = {
  paper: "Paper",
  digital: "Digital",
};

const FIELDSET_CLASSES = "flex flex-col gap-2 border-0 p-0";

const LEGEND_CLASSES = "mb-2 text-base font-medium text-linguaskill-slate-700";

const LIST_CLASSES = "flex flex-wrap gap-3";

// One base, so the three states cannot drift apart.
const OPTION_BASE_CLASSES = "inline-flex items-center gap-3 rounded-lg px-4 py-3 text-lg";

const OPTION_SELECTABLE_CLASSES =
  "cursor-pointer transition-colors has-checked:border-vlec-blue-900 has-checked:bg-vlec-blue-50 has-checked:font-medium has-checked:text-vlec-blue-900 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-vlec-blue-700";

const OPTION_CLASSES = `${OPTION_BASE_CLASSES} ${OPTION_SELECTABLE_CLASSES} border border-linguaskill-slate-300 hover:border-linguaskill-slate-400`;

const OPTION_INVALID_CLASSES = `${OPTION_BASE_CLASSES} ${OPTION_SELECTABLE_CLASSES} border-2 border-vlec-red-700`;

const OPTION_WAITING_CLASSES = `${OPTION_BASE_CLASSES} cursor-not-allowed border border-linguaskill-slate-200 bg-linguaskill-slate-50 text-linguaskill-slate-400`;

const RADIO_CLASSES = "h-5 w-5 accent-vlec-blue-900";

const ICON_CLASSES = "h-[1em] w-[1em] shrink-0";

function optionClasses(waiting: boolean, invalid: boolean): string {
  if (waiting) {
    return OPTION_WAITING_CLASSES;
  }
  return invalid ? OPTION_INVALID_CLASSES : OPTION_CLASSES;
}

/** Paper or on screen, as a radio group whose error belongs to the group. */
export function ModeField({
  availableModes,
  selected,
  waiting,
  invalid,
  errorId,
  groupName,
  firstOptionRef,
  onChange,
  onBlur,
}: ModeFieldProps): ReactElement {
  return (
    <fieldset
      className={FIELDSET_CLASSES}
      onBlur={onBlur}
      aria-describedby={invalid ? errorId : undefined}
    >
      <legend className={LEGEND_CLASSES}>Format</legend>
      <div className={LIST_CLASSES}>
        {availableModes.map((mode, index) => (
          <label key={mode} className={optionClasses(waiting, invalid)}>
            <input
              className={RADIO_CLASSES}
              ref={index === 0 ? firstOptionRef : undefined}
              type="radio"
              name={groupName}
              value={mode}
              checked={selected === mode}
              onChange={() => {
                onChange(mode);
              }}
              disabled={waiting}
              required
              aria-invalid={invalid}
            />
            {mode === "paper" ? (
              <FileText className={ICON_CLASSES} aria-hidden="true" />
            ) : (
              <Monitor className={ICON_CLASSES} aria-hidden="true" />
            )}
            {MODE_LABELS[mode]}
          </label>
        ))}
      </div>
      {waiting && <DialogHint>The formats on offer depend on the exam.</DialogHint>}
      {invalid && (
        <DialogError id={errorId}>Say whether this session is on paper or on screen.</DialogError>
      )}
    </fieldset>
  );
}
