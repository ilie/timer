import { useRef, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { Building2, Hash } from "lucide-react";
import { DialogField, dialogControlClasses } from "./DialogField";
import { ModalDialog } from "./ModalDialog";
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

  const trimmedCentreNumber = centreNumber.trim();
  const centreNumberValid = CENTRE_NUMBER_PATTERN.test(trimmedCentreNumber);
  const showsError = !centreNumberValid && (saveAttempted || touched);

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
      title="Board Settings"
      titleIcon={Building2}
      submitLabel="Save"
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <DialogField
        label="Centre number"
        icon={Hash}
        error={showsError ? "Use 2 to 10 letters, digits or hyphens." : null}
        hint="Shown above the board for every session."
      >
        {(control) => (
          <input
            id={control.id}
            ref={centreNumberRef}
            data-initial-focus
            className={dialogControlClasses(control.invalid)}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={centreNumber}
            onChange={handleCentreNumberChange}
            onBlur={handleCentreNumberBlur}
            aria-invalid={control.invalid}
            aria-describedby={control.describedBy}
          />
        )}
      </DialogField>
    </ModalDialog>
  );
}
