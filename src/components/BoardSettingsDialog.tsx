import { useId, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import {
  DIALOG_CONTROL_CLASSES,
  DIALOG_ERROR_CLASSES,
  DIALOG_FIELD_CLASSES,
  DIALOG_HINT_CLASSES,
  DIALOG_LABEL_CLASSES,
  ModalDialog,
} from "./ModalDialog";
import { getSnapshot, setCentreNumber } from "../store/boardStore";

type BoardSettingsDialogProps = {
  onClose: () => void;
};

const CENTRE_NUMBER_PATTERN = /^[A-Za-z0-9-]{2,10}$/;

export function BoardSettingsDialog({ onClose }: BoardSettingsDialogProps): ReactElement {
  const [centreNumber, setDraftCentreNumber] = useState(() => getSnapshot().centreNumber);
  const centreNumberId = useId();
  const centreNumberErrorId = useId();

  const trimmedCentreNumber = centreNumber.trim();
  const centreNumberValid = CENTRE_NUMBER_PATTERN.test(trimmedCentreNumber);

  function handleCentreNumberChange(event: ChangeEvent<HTMLInputElement>) {
    setDraftCentreNumber(event.target.value);
  }

  function handleSubmit() {
    if (!centreNumberValid) {
      return;
    }
    setCentreNumber(trimmedCentreNumber.toUpperCase());
  }

  return (
    <ModalDialog
      title="Board settings"
      submitLabel="Save"
      canSubmit={centreNumberValid}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className={DIALOG_FIELD_CLASSES}>
        <label className={DIALOG_LABEL_CLASSES} htmlFor={centreNumberId}>
          Centre number
        </label>
        <input
          id={centreNumberId}
          className={DIALOG_CONTROL_CLASSES}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={centreNumber}
          onChange={handleCentreNumberChange}
          aria-invalid={!centreNumberValid}
          aria-describedby={centreNumberValid ? undefined : centreNumberErrorId}
        />
        {centreNumberValid ? (
          <p className={DIALOG_HINT_CLASSES}>Shown above the board for every session.</p>
        ) : (
          <p className={DIALOG_ERROR_CLASSES} id={centreNumberErrorId} role="alert">
            Use 2 to 10 letters, digits or hyphens.
          </p>
        )}
      </div>
    </ModalDialog>
  );
}
