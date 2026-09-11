import type { ReactElement } from "react";
import { Monitor } from "lucide-react";

type ExamNameProps = {
  name: string;
  /** Whether to mark the name as a digital sitting of an otherwise paper exam. */
  digital: boolean;
  /** Balances the trailing mark with an invisible one so the name stays centred. */
  centred: boolean;
};

// overflow-hidden keeps the badge's baseline at its bottom edge, which is what
// lines it up with the text in both the tab strip and the board.
const MARK_CLASSES =
  "inline-flex h-[0.72em] w-[0.72em] items-center justify-center overflow-hidden rounded-full bg-vlec-red-700 align-baseline text-white";

const MARK_TRAILING_CLASSES = "ml-[0.3em]";

const MARK_BALANCE_CLASSES = "mr-[0.3em] invisible";

const MARK_ICON_CLASSES = "h-[0.5em] w-[0.5em]";

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
