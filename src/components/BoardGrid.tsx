import type { ReactElement, ReactNode, Ref } from "react";
import { BoardValue, FIT_CLASSES } from "./BoardValue";
import { BoardTabs } from "./BoardTabs";
import { ExamName } from "./ExamName";
import { RemainingTime } from "./RemainingTime";
import { SessionControls } from "./SessionControls";
import type { RowHeights } from "../hooks/useBoardScale";
import type { SessionView } from "../lib/sessionView";

type BoardGridProps = {
  columns: readonly SessionView[];
  /** True while the single column shares the board's row-label lane. */
  labelLaneVisible: boolean;
  /** True once any column counts down, which adds the countdown and control rows. */
  showsCountdown: boolean;
  heights: RowHeights;
  onAddSession: () => void;
  onEditSession: (sessionId: string) => void;
  onRequestRemove: (view: SessionView) => void;
  onRequestReset: (view: SessionView) => void;
  regionRef: Ref<HTMLDivElement>;
  tabStripRef: Ref<HTMLTableSectionElement>;
};

type ValueCellProps = {
  label: string | null;
  children: ReactNode;
};

/** One row of the board, told how to render itself for each session column. */
type BoardRow = {
  label: string;
  /** Which of the two row heights this row takes, and whether it shows its label. */
  kind: "value" | "controls";
  cellClassesFor: (column: SessionView) => string;
  rowSpanFor?: (column: SessionView) => number | undefined;
  omitsCell?: (column: SessionView) => boolean;
  fillsCell?: (column: SessionView) => boolean;
  render: (column: SessionView) => ReactNode;
};

type RowContext = {
  labelLaneVisible: boolean;
  showsCountdown: boolean;
  onRequestReset: (view: SessionView) => void;
};

const REGION_CLASSES = "min-h-0 flex-1 overflow-hidden";

const GRID_CLASSES = "h-full w-full table-fixed border-collapse";

const LABEL_COLUMN_CLASSES = "w-[var(--board-label-lane,30%)]";

const COLLAPSED_LABEL_COLUMN_CLASSES = "w-0";

const ROW_LABEL_CLASSES = "overflow-hidden pl-6 pr-2 text-right align-middle";

const ROW_LABEL_TEXT_CLASSES = `${FIT_CLASSES} pr-[0.35em] font-semibold text-linguaskill-slate-500 after:content-[':']`;

const COLLAPSED_ROW_LABEL_CLASSES = "w-0 p-0";

const VALUE_CELL_CLASSES = "overflow-hidden px-6 align-middle";

const CENTRED_VALUE_CLASSES = "text-center";

const ALIGNED_VALUE_CLASSES = "text-left";

const SEPARATOR_CLASSES = "border-r border-dashed border-linguaskill-slate-200";

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
function fillsCell(row: BoardRow, column: SessionView | undefined): boolean {
  if (column === undefined) {
    return false;
  }
  return row.fillsCell === undefined || row.fillsCell(column);
}

function boardRows({ labelLaneVisible, showsCountdown, onRequestReset }: RowContext): BoardRow[] {
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

export function BoardGrid({
  columns,
  labelLaneVisible,
  showsCountdown,
  heights,
  onAddSession,
  onEditSession,
  onRequestRemove,
  onRequestReset,
  regionRef,
  tabStripRef,
}: BoardGridProps): ReactElement {
  const rows = boardRows({ labelLaneVisible, showsCountdown, onRequestReset });

  return (
    <div ref={regionRef} className={REGION_CLASSES}>
      <table className={GRID_CLASSES}>
        <caption className="sr-only">Exam sessions</caption>
        <colgroup>
          <col
            className={labelLaneVisible ? LABEL_COLUMN_CLASSES : COLLAPSED_LABEL_COLUMN_CLASSES}
          />
          {columns.map((column) => (
            <col key={column.id} />
          ))}
        </colgroup>
        <BoardTabs
          ref={tabStripRef}
          columns={columns}
          labelLaneVisible={labelLaneVisible}
          onEditSession={onEditSession}
          onRequestRemove={onRequestRemove}
          onAddSession={onAddSession}
        />
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              style={{ height: row.kind === "controls" ? heights.controls : heights.value }}
            >
              <th
                className={labelLaneVisible ? ROW_LABEL_CLASSES : COLLAPSED_ROW_LABEL_CLASSES}
                scope="row"
              >
                {labelLaneVisible && row.kind === "value" ? (
                  <span data-fit="label" className={ROW_LABEL_TEXT_CLASSES}>
                    {row.label}
                  </span>
                ) : (
                  <span className="sr-only">{row.label}</span>
                )}
              </th>
              {columns.map((column, index) => {
                if (row.omitsCell !== undefined && row.omitsCell(column)) {
                  return null;
                }
                const rowReaches = fillsCell(row, column) || fillsCell(row, columns[index + 1]);
                const separator = index < columns.length - 1 && rowReaches ? SEPARATOR_CLASSES : "";
                return (
                  <td
                    key={column.id}
                    className={[row.cellClassesFor(column), separator]
                      .filter(Boolean)
                      .join(" ")}
                    rowSpan={row.rowSpanFor?.(column)}
                  >
                    {row.render(column)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
