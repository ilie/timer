import { useEffect, useId, useRef } from "react";
import type { FormEvent, MouseEvent, ReactElement, ReactNode } from "react";
import { Check, TriangleAlert, X } from "lucide-react";

type ModalDialogProps = {
  title: string;
  submitLabel: string;
  destructive?: boolean;
  hint?: string;
  hintId?: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
};

const DIALOG_CLASSES =
  "m-auto w-[min(92vw,44rem)] rounded-2xl border border-vlec-blue-200 bg-white p-0 text-linguaskill-slate-900 shadow-2xl backdrop:bg-vlec-blue-950/60";

const FORM_CLASSES = "flex flex-col gap-6 p-8";

const TITLE_CLASSES = "text-2xl font-bold text-vlec-blue-900";

const BODY_CLASSES = "flex flex-col gap-5";

const ACTIONS_CLASSES =
  "flex flex-wrap items-center justify-end gap-3 border-t border-vlec-blue-100 pt-5";

const HINT_CLASSES =
  "mr-auto inline-flex items-center gap-2 rounded-lg border border-vlec-red-200 bg-vlec-red-50 px-4 py-2 text-lg font-semibold text-vlec-red-800";

const HINT_ICON_CLASSES = "h-5 w-5 shrink-0";

const CANCEL_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-lg bg-linguaskill-slate-200 px-5 py-3 text-lg font-semibold text-linguaskill-slate-900 transition-colors hover:bg-linguaskill-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-linguaskill-slate-600";

const SUBMIT_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-lg bg-vlec-blue-900 px-5 py-3 text-lg font-semibold text-white transition-colors hover:bg-vlec-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-900 disabled:cursor-not-allowed disabled:bg-linguaskill-slate-200 disabled:text-linguaskill-slate-500";

const DESTRUCTIVE_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-lg bg-vlec-red-700 px-5 py-3 text-lg font-semibold text-white transition-colors hover:bg-vlec-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-red-700";

const BUTTON_ICON_CLASSES = "h-5 w-5";

export const DIALOG_FIELD_CLASSES = "flex flex-col gap-2";

export const DIALOG_LABEL_CLASSES = "text-base font-semibold text-vlec-blue-900";

export const DIALOG_CONTROL_CLASSES =
  "w-full rounded-lg border border-vlec-blue-300 bg-white px-4 py-3 text-lg text-linguaskill-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700 disabled:cursor-not-allowed disabled:bg-linguaskill-slate-100 disabled:text-linguaskill-slate-500";

export const DIALOG_CONTROL_OUTSTANDING_CLASSES =
  "w-full rounded-lg border-2 border-vlec-red-600 bg-vlec-red-50 px-4 py-3 text-lg text-linguaskill-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-red-700 disabled:cursor-not-allowed disabled:bg-linguaskill-slate-100 disabled:text-linguaskill-slate-500";

export const DIALOG_REQUIRED_CHIP_CLASSES =
  "ml-2 rounded-full bg-vlec-red-700 px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-white";

export const DIALOG_HINT_CLASSES = "text-base text-linguaskill-slate-600";

export const DIALOG_ERROR_CLASSES = "text-base font-semibold text-vlec-red-700";

export function ModalDialog({
  title,
  submitLabel,
  destructive,
  hint,
  hintId,
  canSubmit,
  onSubmit,
  onClose,
  children,
}: ModalDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (!dialog.open) {
      dialog.showModal();
    }
    dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onSubmit();
    dialogRef.current?.close();
  }

  function handleCancel() {
    dialogRef.current?.close();
  }

  function handlePointerDown(event: MouseEvent<HTMLDialogElement>) {
    pressStartedOnBackdrop.current = event.target === event.currentTarget;
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const startedOnBackdrop = pressStartedOnBackdrop.current;
    pressStartedOnBackdrop.current = false;
    if (!startedOnBackdrop || event.target !== event.currentTarget) {
      return;
    }
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className={DIALOG_CLASSES}
      aria-labelledby={titleId}
      onClose={onClose}
      onMouseDown={handlePointerDown}
      onClick={handleClick}
    >
      <form className={FORM_CLASSES} onSubmit={handleSubmit}>
        <h2 id={titleId} className={TITLE_CLASSES}>
          {title}
        </h2>
        <div className={BODY_CLASSES}>{children}</div>
        <div className={ACTIONS_CLASSES}>
          {hint === undefined ? null : (
            <p className={HINT_CLASSES} id={hintId} role="status">
              <TriangleAlert className={HINT_ICON_CLASSES} aria-hidden="true" />
              {hint}
            </p>
          )}
          <button className={CANCEL_BUTTON_CLASSES} type="button" onClick={handleCancel}>
            <X className={BUTTON_ICON_CLASSES} aria-hidden="true" />
            Cancel
          </button>
          <button
            className={destructive === true ? DESTRUCTIVE_BUTTON_CLASSES : SUBMIT_BUTTON_CLASSES}
            type="submit"
            disabled={!canSubmit}
          >
            {destructive === true ? (
              <TriangleAlert className={BUTTON_ICON_CLASSES} aria-hidden="true" />
            ) : (
              <Check className={BUTTON_ICON_CLASSES} aria-hidden="true" />
            )}
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
