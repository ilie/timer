import type { ReactElement } from "react";
import { ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import type { SessionView } from "../lib/sessionView";
import { advanceComponent, pauseSession, resumeSession, startSession } from "../store/boardStore";

type SessionControlsProps = {
  view: SessionView;
  onRequestReset: (view: SessionView) => void;
};

const CONTROLS_CLASSES = "inline-flex flex-wrap items-center justify-center gap-3";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex min-w-[7.5em] items-center justify-center gap-2 rounded-full bg-vlec-blue-900 px-6 py-2.5 font-medium text-white text-control transition-colors hover:bg-vlec-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vlec-blue-900";

const SECONDARY_BUTTON_CLASSES =
  "inline-flex min-w-[6em] items-center justify-center gap-2 rounded-full px-5 py-2.5 font-medium text-linguaskill-slate-500 text-control transition-colors hover:bg-linguaskill-slate-100 hover:text-vlec-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-linguaskill-slate-500";

const ICON_CLASSES = "h-[1.15em] w-[1.15em]";

const RUN_CONTROL_LABELS = {
  idle: "Start",
  running: "Pause",
  paused: "Resume",
} as const;

export function SessionControls({
  view,
  onRequestReset,
}: SessionControlsProps): ReactElement | null {
  if (!view.countsDown) {
    return null;
  }

  const runControlLabel = view.status === "finished" ? null : RUN_CONTROL_LABELS[view.status];
  const offersNextPart = view.status === "finished" && view.nextPartName !== null;

  function handleRunControl() {
    switch (view.status) {
      case "idle":
        startSession(view.id);
        return;
      case "running":
        pauseSession(view.id);
        return;
      case "paused":
        resumeSession(view.id);
        return;
      case "finished":
        return;
    }
  }

  function handleReset() {
    onRequestReset(view);
  }

  function handleAdvance() {
    advanceComponent(view.id);
  }

  return (
    <div className={CONTROLS_CLASSES}>
      <button className={SECONDARY_BUTTON_CLASSES} type="button" onClick={handleReset}>
        <RotateCcw className={ICON_CLASSES} strokeWidth={2.25} aria-hidden="true" />
        Reset
      </button>
      {runControlLabel !== null && (
        <button className={PRIMARY_BUTTON_CLASSES} type="button" onClick={handleRunControl}>
          {view.status === "running" ? (
            <Pause
              className={ICON_CLASSES}
              fill="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          ) : (
            <Play
              className={ICON_CLASSES}
              fill="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
          {runControlLabel}
        </button>
      )}
      {offersNextPart && (
        <button className={PRIMARY_BUTTON_CLASSES} type="button" onClick={handleAdvance}>
          <ChevronRight className={ICON_CLASSES} strokeWidth={2.5} aria-hidden="true" />
          Next: {view.nextPartName}
        </button>
      )}
    </div>
  );
}
