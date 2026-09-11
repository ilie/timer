import type { ReactElement, ReactNode } from "react";
import { BoardValue } from "./BoardValue";
import { ExamName } from "./ExamName";
import { RemainingTime } from "./RemainingTime";
import { SessionControls } from "./SessionControls";
import type { SessionView } from "../lib/sessionView";

type ValueCellProps = {
  label: string | null;
  children: ReactNode;
};

export type BoardRow = {
  label: string;
  /** Which of the two row heights this row takes, and whether it shows its label. */
  kind: "value" | "controls";
  cellClassesFor: (column: SessionView) => string;
  rowSpanFor?: (column: SessionView) => number | undefined;
  omitsCell?: (column: SessionView) => boolean;
  fillsCell?: (column: SessionView) => boolean;
  render: (column: SessionView) => ReactNode;
};

export type RowContext = {
  labelLaneVisible: boolean;
  showsCountdown: boolean;
  onRequestReset: (view: SessionView) => void;
};

const VALUE_CELL_CLASSES = "overflow-hidden px-6 align-middle";

const CENTRED_VALUE_CLASSES = "text-center";

const ALIGNED_VALUE_CLASSES = "text-left";

const CONTROLS_CELL_CLASSES = "px-6 align-middle";

const EXTRA_TIME_CLASSES =
  "ml-[0.35em] align-middle text-[0.5em] font-medium tracking-wide text-linguaskill-slate-500";

const EMPTY_CELL_CLASSES = "";

function ValueCell({ label, children }: ValueCellProps): ReactElement {
  return (
    <BoardValue label={label}>
      <span className="block">{children}</span>
    </BoardValue>
  );
}

/** A row reaches into a cell when it has something to draw there. */
export function fillsCell(row: BoardRow, column: SessionView | undefined): boolean {
  if (column === undefined) {
    return false;
  }
  return row.fillsCell === undefined || row.fillsCell(column);
}

export function boardRows({ labelLaneVisible, showsCountdown, onRequestReset }: RowContext): BoardRow[] {
  const valueClasses = labelLaneVisible ? ALIGNED_VALUE_CLASSES : CENTRED_VALUE_CLASSES;
  const valueCellClasses = `${VALUE_CELL_CLASSES} ${valueClasses}`;
  const perColumnLabel = (label: string): string | null => (labelLaneVisible ? null : label);

  const supporting: BoardRow[] = [
    {
      label: "Exam",
      kind: "value",
      cellClassesFor: () => valueCellClasses,
      render: (column) => (
        <ValueCell label={perColumnLabel("Exam")}>
          <ExamName name={column.examName} digital={column.digital} centred={!labelLaneVisible} />
        </ValueCell>
      ),
    },
    {
      label: "Part",
      kind: "value",
      cellClassesFor: () => valueCellClasses,
      render: (column) => <ValueCell label={perColumnLabel("Part")}>{column.partName}</ValueCell>,
    },
    {
      label: "Time",
      kind: "value",
      cellClassesFor: () => valueCellClasses,
      render: (column) => (
        <ValueCell label={perColumnLabel("Time")}>
          {column.allowedTime}
          {column.extraMinutes > 0 && (
            <span className={EXTRA_TIME_CLASSES}>+{column.extraMinutes}min</span>
          )}
        </ValueCell>
      ),
    },
  ];

  if (!showsCountdown) {
    return supporting;
  }

  return [
    ...supporting,
    {
      label: "Remaining",
      kind: "value",
      fillsCell: (column) => column.countsDown,
      cellClassesFor: (column) => (column.countsDown ? valueCellClasses : EMPTY_CELL_CLASSES),
      // A column with no countdown leaves its two remaining cells merged and empty.
      rowSpanFor: (column) => (column.countsDown ? undefined : 2),
      render: (column) =>
        column.countsDown ? (
          <RemainingTime
            label={perColumnLabel("Remaining")}
            align={labelLaneVisible ? "start" : "center"}
            timer={column.timer}
            durationMs={column.durationMs}
          />
        ) : null,
    },
    {
      label: "Controls",
      kind: "controls",
      cellClassesFor: () => `${CONTROLS_CELL_CLASSES} ${valueClasses}`,
      omitsCell: (column) => !column.countsDown,
      render: (column) => <SessionControls view={column} onRequestReset={onRequestReset} />,
    },
  ];
}
