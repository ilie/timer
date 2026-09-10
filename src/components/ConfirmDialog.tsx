import type { ReactElement } from "react";
import { ModalDialog } from "./ModalDialog";

type ConfirmDialogProps = {
  title: string;
  message: string;
  detail: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
};

const MESSAGE_CLASSES = "text-lg text-linguaskill-slate-900";

const DETAIL_CLASSES = "text-lg font-semibold text-vlec-red-700";

export function ConfirmDialog({
  title,
  message,
  detail,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps): ReactElement {
  return (
    <ModalDialog
      title={title}
      submitLabel={confirmLabel}
      destructive
      canSubmit
      onSubmit={onConfirm}
      onClose={onClose}
    >
      <p className={MESSAGE_CLASSES}>{message}</p>
      <p className={DETAIL_CLASSES}>{detail}</p>
    </ModalDialog>
  );
}
