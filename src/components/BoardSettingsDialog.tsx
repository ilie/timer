import { useId, useRef, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Building2, CircleAlert, Hash } from "lucide-react";
import {
  DIALOG_CONTROL_CLASSES,
  DIALOG_CONTROL_INVALID_CLASSES,
  DIALOG_ERROR_CLASSES,
  DIALOG_ERROR_ICON_CLASSES,
  DIALOG_FIELD_CLASSES,
  DIALOG_HINT_CLASSES,
  DIALOG_LABEL_CLASSES,
  DIALOG_LABEL_ICON_CLASSES,
  ModalDialog,
} from "./ModalDialog";
import { getSnapshot, setCentreNumber } from "../store/boardStore";

type BoardSettingsDialogProps = {
  onClose: () => void;
};

const CENTRE_NUMBER_PATTERN = /^[A-Za-z0-9-]{2,10}$/;

export function BoardSettingsDialog({ onClose }: BoardSettingsDialogProps): ReactElement {
  const [centreNumber, setDraftCentreNumber] = useState(() => getSnapshot().centreNumber);
  const [touched, setTouched] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const centreNumberRef = useRef<HTMLInputElement>(null);
  const centreNumberId = useId();
  const centreNumberErrorId = useId();

  const trimmedCentreNumber = centreNumber.trim();
  const centreNumberValid = CENTRE_NUMBER_PATTERN.test(trimmedCentreNumber);
  const centreNumberError = !centreNumberValid && (saveAttempted || touched);

  function handleCentreNumberChange(event: ChangeEvent<HTMLInputElement>) {
    setDraftCentreNumber(event.target.value);
  }

  function handleCentreNumberBlur() {
    setTouched(true);
  }

  function handleSubmit(): boolean {
    if (!centreNumberValid) {
      setSaveAttempted(true);
      centreNumberRef.current?.focus();
      return false;
    }
    setCentreNumber(trimmedCentreNumber.toUpperCase());
    return true;
  }

  return (
    <ModalDialog
      title="Board settings"
      titleIcon={Building2}
      submitLabel="Save"
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className={DIALOG_FIELD_CLASSES}>
        <label className={DIALOG_LABEL_CLASSES} htmlFor={centreNumberId}>
          <Hash className={DIALOG_LABEL_ICON_CLASSES} aria-hidden="true" />
          Centre number
        </label>
        <input
          id={centreNumberId}
          ref={centreNumberRef}
          data-initial-focus
          className={centreNumberError ? DIALOG_CONTROL_INVALID_CLASSES : DIALOG_CONTROL_CLASSES}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={centreNumber}
          onChange={handleCentreNumberChange}
          onBlur={handleCentreNumberBlur}
          aria-invalid={centreNumberError}
          aria-describedby={centreNumberError ? centreNumberErrorId : undefined}
        />
        {centreNumberError ? (
          <p className={DIALOG_ERROR_CLASSES} id={centreNumberErrorId}>
            <CircleAlert className={DIALOG_ERROR_ICON_CLASSES} aria-hidden="true" />
            Use 2 to 10 letters, digits or hyphens.
          </p>
        ) : (
          <p className={DIALOG_HINT_CLASSES}>Shown above the board for every session.</p>
        )}
      </div>
    </ModalDialog>
  );
}
