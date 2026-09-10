import type { ReactElement } from "react";
import { TriangleAlert } from "lucide-react";
import { ModalDialog } from "./ModalDialog";

type ConfirmDialogProps = {
  title: string;
  message: string;
  detail: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
};

const MESSAGE_CLASSES = "text-pretty text-lg text-linguaskill-slate-600";

const DETAIL_CLASSES = "text-pretty text-lg font-medium text-linguaskill-slate-900";

export function ConfirmDialog({
  title,
  message,
  detail,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps): ReactElement {
  function handleConfirm(): boolean {
    onConfirm();
    return true;
  }

  return (
    <ModalDialog
      title={title}
      titleIcon={TriangleAlert}
      submitLabel={confirmLabel}
      destructive
      onSubmit={handleConfirm}
      onClose={onClose}
    >
      <p className={MESSAGE_CLASSES}>{message}</p>
      <p className={DETAIL_CLASSES}>{detail}</p>
    </ModalDialog>
  );
}
