import { useEffect, useId, useRef } from "react";
import type { FormEvent, MouseEvent, ReactElement, ReactNode } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ModalDialogProps = {
  title: string;
  titleIcon: LucideIcon;
  submitLabel: string;
  /** Id of the element describing the dialog, announced after its title. */
  describedBy?: string;
  /** Styles the submit button as a warning and swaps its tick for an alert. */
  destructive?: boolean;
  onSubmit: () => boolean;
  onClose: () => void;
  children: ReactNode;
};

const DIALOG_CLASSES =
  "m-auto w-[min(92vw,42rem)] rounded-2xl border border-linguaskill-slate-200 bg-white p-0 text-linguaskill-slate-900 shadow-2xl backdrop:bg-linguaskill-slate-950/40";

const FORM_CLASSES = "flex flex-col gap-6 p-8";

const HEADER_CLASSES = "flex items-start justify-between gap-4";

const TITLE_CLASSES =
  "inline-flex items-center gap-3 text-pretty text-2xl font-semibold text-vlec-blue-900";

const CLOSE_BUTTON_CLASSES =
  "-mr-2 -mt-2 inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-linguaskill-slate-400 transition-colors hover:bg-linguaskill-slate-100 hover:text-linguaskill-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-700";

const CLOSE_ICON_CLASSES = "h-6 w-6";

const BODY_CLASSES = "flex flex-col gap-5";

const ACTIONS_CLASSES =
  "flex flex-wrap items-center justify-end gap-2 border-t border-linguaskill-slate-200 pt-5";

const CANCEL_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-lg px-5 py-3 text-lg font-medium text-linguaskill-slate-500 transition-colors hover:bg-linguaskill-slate-100 hover:text-linguaskill-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-linguaskill-slate-500";

const SUBMIT_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-lg bg-vlec-blue-900 px-5 py-3 text-lg font-medium text-white transition-colors hover:bg-vlec-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-900";

const DESTRUCTIVE_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-lg bg-vlec-red-700 px-5 py-3 text-lg font-medium text-white transition-colors hover:bg-vlec-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-red-700";

const BUTTON_ICON_CLASSES = "h-[1em] w-[1em]";

const TITLE_ICON_CLASSES = "h-[0.85em] w-[0.85em] shrink-0";

export function ModalDialog({
  title,
  titleIcon: TitleIcon,
  submitLabel,
  describedBy,
  destructive = false,
  onSubmit,
  onClose,
  children,
}: ModalDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
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
    const preferred = dialog.querySelector<HTMLElement>("[data-initial-focus]");
    if (preferred === null) {
      cancelRef.current?.focus();
      return;
    }
    preferred.focus();
    // Deliberately no cleanup that closes the dialog: `close()` fires the
    // dialog's close event, which every caller reads as the user dismissing it.
    // Each close path here already closes before unmounting, so there is no
    // orphaned top-layer entry to tidy up.
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSubmit()) {
      return;
    }
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
      aria-describedby={describedBy}
      onClose={onClose}
      onMouseDown={handlePointerDown}
      onClick={handleClick}
    >
      <form className={FORM_CLASSES} onSubmit={handleSubmit} noValidate>
        <div className={HEADER_CLASSES}>
          <h2 id={titleId} className={TITLE_CLASSES}>
            <TitleIcon className={TITLE_ICON_CLASSES} aria-hidden="true" />
            {title}
          </h2>
          <button
            className={CLOSE_BUTTON_CLASSES}
            type="button"
            aria-label="Close"
            onClick={handleCancel}
          >
            <X className={CLOSE_ICON_CLASSES} aria-hidden="true" />
          </button>
        </div>
        <div className={BODY_CLASSES}>{children}</div>
        <div className={ACTIONS_CLASSES}>
          <button
            className={CANCEL_BUTTON_CLASSES}
            ref={cancelRef}
            type="button"
            onClick={handleCancel}
          >
            <X className={BUTTON_ICON_CLASSES} aria-hidden="true" />
            Cancel
          </button>
          <button
            className={destructive ? DESTRUCTIVE_BUTTON_CLASSES : SUBMIT_BUTTON_CLASSES}
            type="submit"
          >
            {destructive ? (
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
