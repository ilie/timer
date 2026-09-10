import type { ReactElement } from "react";
import { Monitor } from "lucide-react";

type ExamNameProps = {
  name: string;
  /** Whether to mark the name as a digital sitting of an otherwise paper exam. */
  digital: boolean;
  /** Balances the trailing mark with an invisible one so the name stays centred. */
  centred: boolean;
};

const MARK_CLASSES =
  "relative inline-block h-[0.72em] w-[0.72em] overflow-hidden rounded-full bg-vlec-red-700 align-baseline text-white";

const MARK_TRAILING_CLASSES = "ml-[0.3em]";

const MARK_BALANCE_CLASSES = "mr-[0.3em] invisible";

const MARK_ICON_CLASSES =
  "absolute left-1/2 top-1/2 h-[0.42em] w-[0.42em] -translate-x-1/2 -translate-y-1/2";

export function ExamName({ name, digital, centred }: ExamNameProps): ReactElement {
  if (!digital) {
    return <>{name}</>;
  }
  return (
    <>
      {centred && <span className={`${MARK_CLASSES} ${MARK_BALANCE_CLASSES}`} aria-hidden="true" />}
      {name}
      <span className={`${MARK_CLASSES} ${MARK_TRAILING_CLASSES}`} role="img" aria-label="Digital">
        <Monitor className={MARK_ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
      </span>
    </>
  );
}
