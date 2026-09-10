import { useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Wiring a field's control needs from the surrounding label and message. */
export type DialogControl = {
  id: string;
  invalid: boolean;
  describedBy: string | undefined;
};

type DialogFieldProps = {
  label: string;
  icon: LucideIcon;
  /** Marks the field as required and shows the word beside its label. */
  required?: boolean;
  /** The message to show, or null while the field has nothing to report. */
  error?: string | null;
  /** Standing guidance, shown only while there is no error to show instead. */
  hint?: string;
  children: (control: DialogControl) => ReactNode;
};

type DialogLabelProps = {
  htmlFor: string;
  icon: LucideIcon;
  children: ReactNode;
};

type DialogErrorProps = {
  id: string;
  children: ReactNode;
};

type DialogHintProps = {
  children: ReactNode;
};

const FIELD_CLASSES = "flex flex-col gap-2";

const FIELD_HEADER_CLASSES = "flex items-baseline gap-2";

const LABEL_CLASSES =
  "inline-flex items-center gap-2 text-base font-medium text-linguaskill-slate-700";

const LABEL_ICON_CLASSES = "h-[1em] w-[1em] shrink-0 text-linguaskill-slate-400";

const REQUIRED_MARK_CLASSES = "text-sm text-linguaskill-slate-500";

const HINT_CLASSES = "text-base text-linguaskill-slate-500";

const ERROR_CLASSES = "inline-flex items-center gap-2 text-base font-semibold text-vlec-red-700";

const ERROR_ICON_CLASSES = "h-[1em] w-[1em] shrink-0";

// Both control styles share one base so the two cannot drift apart again. Only
// the border and the focus ring differ between the valid and invalid states.
const CONTROL_BASE_CLASSES =
  "w-full rounded-lg bg-white px-4 py-3 text-lg text-linguaskill-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-linguaskill-slate-200 disabled:bg-linguaskill-slate-50 disabled:text-linguaskill-slate-400";

const CONTROL_CLASSES = `${CONTROL_BASE_CLASSES} border border-linguaskill-slate-300 hover:border-linguaskill-slate-400 focus-visible:outline-vlec-blue-700`;

const CONTROL_INVALID_CLASSES = `${CONTROL_BASE_CLASSES} border-2 border-vlec-red-700 focus-visible:outline-vlec-red-700`;

const REQUIRED_MARK = "required";

export function dialogControlClasses(invalid: boolean): string {
  return invalid ? CONTROL_INVALID_CLASSES : CONTROL_CLASSES;
}

export function DialogHint({ children }: DialogHintProps): ReactElement {
  return <p className={HINT_CLASSES}>{children}</p>;
}

export function DialogError({ id, children }: DialogErrorProps): ReactElement {
  return (
    <p className={ERROR_CLASSES} id={id} role="alert">
      <CircleAlert className={ERROR_ICON_CLASSES} aria-hidden="true" />
      {children}
    </p>
  );
}

function DialogLabel({ htmlFor, icon: LabelIcon, children }: DialogLabelProps): ReactElement {
  return (
    <label className={LABEL_CLASSES} htmlFor={htmlFor}>
      <LabelIcon className={LABEL_ICON_CLASSES} aria-hidden="true" />
      {children}
    </label>
  );
}

/**
 * One labelled control in a dialog, with its required mark, hint and error
 * message. The control itself is supplied the ids and validity it must carry.
 */
export function DialogField({
  label,
  icon,
  required = false,
  error = null,
  hint,
  children,
}: DialogFieldProps): ReactElement {
  const id = useId();
  const errorId = useId();
  const invalid = error !== null;

  return (
    <div className={FIELD_CLASSES}>
      {required ? (
        <div className={FIELD_HEADER_CLASSES}>
          <DialogLabel htmlFor={id} icon={icon}>
            {label}
          </DialogLabel>
          <span className={REQUIRED_MARK_CLASSES} aria-hidden="true">
            {REQUIRED_MARK}
          </span>
        </div>
      ) : (
        <DialogLabel htmlFor={id} icon={icon}>
          {label}
        </DialogLabel>
      )}
      {children({ id, invalid, describedBy: invalid ? errorId : undefined })}
      {error !== null && <DialogError id={errorId}>{error}</DialogError>}
      {error === null && hint !== undefined && <DialogHint>{hint}</DialogHint>}
    </div>
  );
}
