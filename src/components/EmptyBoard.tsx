import type { ReactElement } from "react";
import { Plus } from "lucide-react";

type EmptyBoardProps = {
  onAddSession: () => void;
};

const EMPTY_BOARD_CLASSES =
  "flex h-full flex-col items-center justify-center gap-6 text-linguaskill-slate-500";

const EMPTY_BOARD_TEXT_CLASSES = "text-pretty text-centre-number tracking-[0.16em] uppercase";

const EMPTY_BOARD_BUTTON_CLASSES =
  "inline-flex items-center gap-3 rounded-full bg-vlec-blue-900 px-8 py-4 text-tab font-medium text-white transition-colors hover:bg-vlec-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-900";

const ICON_CLASSES = "h-[1.15em] w-[1.15em]";

export function EmptyBoard({ onAddSession }: EmptyBoardProps): ReactElement {
  return (
    <div className={EMPTY_BOARD_CLASSES}>
      <p className={EMPTY_BOARD_TEXT_CLASSES}>No sessions yet</p>
      <button className={EMPTY_BOARD_BUTTON_CLASSES} type="button" onClick={onAddSession}>
        <Plus className={ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
        Add Session
      </button>
    </div>
  );
}
