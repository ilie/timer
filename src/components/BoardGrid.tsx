import type { ReactElement, Ref } from "react";
import { FIT_CLASSES } from "./BoardValue";
import { BoardTabs } from "./BoardTabs";
import { boardRows, fillsCell } from "./boardRows";
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
  onMoveSession: (sessionId: string, toIndex: number) => void;
  regionRef: Ref<HTMLDivElement>;
  tabStripRef: Ref<HTMLTableSectionElement>;
};

/** One row of the board, told how to render itself for each session column. */
const REGION_CLASSES = "min-h-0 flex-1 overflow-hidden";

const GRID_CLASSES = "h-full w-full table-fixed border-collapse";

const LABEL_COLUMN_CLASSES = "w-[var(--board-label-lane,30%)]";

const COLLAPSED_LABEL_COLUMN_CLASSES = "w-0";

const ROW_LABEL_CLASSES = "overflow-hidden pl-6 pr-2 text-right align-middle";

const COLLAPSED_ROW_LABEL_CLASSES = "w-0 p-0";

const ROW_LABEL_TEXT_CLASSES = `${FIT_CLASSES} pr-[0.35em] font-semibold text-linguaskill-slate-500 after:content-[':']`;

const SEPARATOR_CLASSES = "border-r border-dashed border-linguaskill-slate-100";

export function BoardGrid({
  columns,
  labelLaneVisible,
  showsCountdown,
  heights,
  onAddSession,
  onEditSession,
  onRequestRemove,
  onRequestReset,
  onMoveSession,
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
          onMoveSession={onMoveSession}
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
