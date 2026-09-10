import type { ReactElement, ReactNode } from "react";

type BoardValueProps = {
  /** The per-column caption, or null while the shared label lane carries it. */
  label: string | null;
  children: ReactNode;
};

/** Text the board scales to fit: `useBoardScale` measures every `[data-fit]`. */
export const FIT_CLASSES =
  "inline-block whitespace-nowrap align-middle leading-none text-[length:var(--board-value-size,1.75rem)]";

const COLUMN_LABEL_CLASSES =
  "mb-[0.35em] block text-[0.28em] font-semibold uppercase leading-tight tracking-[0.2em] text-linguaskill-slate-400";

/** One value on the board, sized by the fitter and captioned when it stands alone. */
export function BoardValue({ label, children }: BoardValueProps): ReactElement {
  return (
    <span data-fit="value" className={FIT_CLASSES}>
      {label === null ? null : <span className={COLUMN_LABEL_CLASSES}>{label}</span>}
      {children}
    </span>
  );
}
