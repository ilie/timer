import { TriangleAlert, X } from "lucide-react";
import type { ReactElement } from "react";
import { useSyncExternalStore } from "react";
import { formatClockSkew } from "../lib/format";
import { getSnapshot, setClockJumpDetected, subscribe } from "../store/boardStore";

const BANNER_CLASSES =
  "mx-8 mb-2 flex shrink-0 items-center gap-3 rounded-lg border-2 px-5 py-3 text-tab";

const PRESERVED_CLASSES = "border-amber-700 bg-amber-50 text-amber-900";

const UNVERIFIED_CLASSES = "border-vlec-red-700 bg-vlec-red-50 text-vlec-red-900";

const ICON_CLASSES = "h-[1.4em] w-[1.4em] shrink-0";

const MESSAGE_CLASSES = "flex-1 text-pretty";

const SKEW_CLASSES = "font-semibold";

const DISMISS_CLASSES =
  "-mr-2 shrink-0 rounded-full p-2 transition-colors hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";

const DISMISS_ICON_CLASSES = "h-[1.15em] w-[1.15em]";

function dismiss(): void {
  setClockJumpDetected(false);
}

/**
 * Tells the invigilator that the system clock moved under a running exam.
 *
 * Detecting the jump is only half the job: whether or not the countdowns could
 * be corrected automatically, somebody in the room has to know it happened.
 */
export function ClockAlert(): ReactElement | null {
  const board = useSyncExternalStore(subscribe, getSnapshot);

  if (!board.clockJumpDetected) {
    return null;
  }

  const preserved = board.clockTimesPreserved;
  const skew = board.clockSkewMs === 0 ? null : formatClockSkew(board.clockSkewMs);

  return (
    <div
      role="alert"
      className={`${BANNER_CLASSES} ${preserved ? PRESERVED_CLASSES : UNVERIFIED_CLASSES}`}
    >
      <TriangleAlert className={ICON_CLASSES} aria-hidden="true" />
      <p className={MESSAGE_CLASSES}>
        {skew === null ? "The system clock changed" : "The system clock moved "}
        {skew !== null && <span className={SKEW_CLASSES}>{skew}</span>}
        {preserved
          ? ". The times below were adjusted to match and are still correct."
          : ". Check the times below against a clock you trust before relying on them."}
      </p>
      <button type="button" className={DISMISS_CLASSES} onClick={dismiss} aria-label="Dismiss">
        <X className={DISMISS_ICON_CLASSES} aria-hidden="true" />
      </button>
    </div>
  );
}
