import type { ReactElement, Ref } from 'react';
import { mergeClasses } from '../lib/mergeClasses';
import { BoardTabs } from './BoardTabs';
import { boardRows, fillsCell } from './boardRows';
import { FittedText } from './FittedText';
import type { BoardRow } from './boardRows';
import type { RowHeights } from '../hooks/useBoardScale';
import type { SessionView } from '../lib/sessionView';

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
    className?: string;
};

type RowLabelProps = {
    row: BoardRow;
    /** False when the lane is collapsed and the label is for screen readers only. */
    visible: boolean;
    className?: string;
};

/** The row's caption in the shared left-hand lane, or just its name for screen readers. */
function RowLabel({ row, visible, className }: RowLabelProps): ReactElement {
    return (
        <th
            className={mergeClasses(
                'overflow-hidden pr-2 pl-6 text-right align-middle',
                !visible && 'w-0 p-0',
                className,
            )}
            scope="row"
        >
            {visible && row.kind === 'value' ? (
                <FittedText
                    measureAs="label"
                    className="text-linguaskill-slate-500 pr-[0.35em] font-semibold after:content-[':']"
                >
                    {row.label}
                </FittedText>
            ) : (
                <span className="sr-only">{row.label}</span>
            )}
        </th>
    );
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
    onMoveSession,
    regionRef,
    tabStripRef,
    className,
}: BoardGridProps): ReactElement {
    const rows = boardRows({ labelLaneVisible, showsCountdown, onRequestReset });

    return (
        <div ref={regionRef} className={mergeClasses('min-h-0 flex-1 overflow-hidden', className)}>
            <table className="size-full table-fixed border-collapse">
                <caption className="sr-only">Exam sessions</caption>
                <colgroup>
                    <col className={labelLaneVisible ? 'w-(--board-label-lane,30%)' : 'w-0'} />
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
                            style={{
                                height: row.kind === 'controls' ? heights.controls : heights.value,
                            }}
                        >
                            <RowLabel row={row} visible={labelLaneVisible} />
                            {columns.map((column, index) => {
                                if (row.omitsCell?.(column) === true) {
                                    return null;
                                }
                                const rowReaches = fillsCell(row, column) || fillsCell(row, columns[index + 1]);
                                const separated = index < columns.length - 1 && rowReaches;
                                return (
                                    <td
                                        key={column.id}
                                        className={mergeClasses(
                                            row.cellClassesFor(column),
                                            separated && 'border-linguaskill-slate-100 border-r border-dashed',
                                        )}
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
