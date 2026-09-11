import { useEffect, useEffectEvent, useLayoutEffect } from 'react';
import type { RefObject } from 'react';

export type BoardScaleLayout = {
    valueRows: number;
    hasControlsRow: boolean;
    labelLane: boolean;
};

export type RowHeights = {
    value: string;
    controls: string;
};

/** One measured piece of board text, with the cell it has to fit inside. */
type FitItem = {
    cell: HTMLElement;
    lane: string;
    width: number;
    height: number;
};

const valueSizeProperty = '--board-value-size';

const labelLaneProperty = '--board-label-lane';

const fitSelector = '[data-fit]';

const labelLaneName = 'label';

const valueLaneName = 'value';

const basisPixels = 100;

const minValuePixels = 14;

const maxValuePixels = 320;

const widthSafety = 0.995;

const heightSafety = 0.96;

const narrowestLabelLane = 0.15;

const widestLabelLane = 0.45;

const controlsRowWeight = 0.55;

function totalRowWeight(layout: BoardScaleLayout): number {
    return layout.valueRows + (layout.hasControlsRow ? controlsRowWeight : 0);
}

function widestIn(items: readonly FitItem[], lane: string): number {
    return items.reduce((widest, item) => (item.lane === lane ? Math.max(widest, item.width) : widest), 0);
}

function contentWidthOf(cell: HTMLElement): number {
    const padding = window.getComputedStyle(cell);
    return cell.clientWidth - Number.parseFloat(padding.paddingLeft) - Number.parseFloat(padding.paddingRight);
}

function labelLaneFractionFor(items: readonly FitItem[]): number {
    const labels = widestIn(items, labelLaneName);
    const values = widestIn(items, valueLaneName);
    if (labels + values === 0) {
        return narrowestLabelLane;
    }
    return Math.min(widestLabelLane, Math.max(narrowestLabelLane, labels / (labels + values)));
}

function measure(board: HTMLElement): FitItem[] {
    const items: FitItem[] = [];
    for (const element of board.querySelectorAll<HTMLElement>(fitSelector)) {
        const cell = element.closest<HTMLElement>('td, th');
        const box = element.getBoundingClientRect();
        if (cell !== null && box.width > 0 && box.height > 0) {
            items.push({ cell, lane: element.dataset.fit ?? '', width: box.width, height: box.height });
        }
    }
    return items;
}

export function rowHeights(layout: BoardScaleLayout): RowHeights {
    const total = totalRowWeight(layout);
    return {
        value: `${(100 / total).toFixed(4)}%`,
        controls: `${((100 * controlsRowWeight) / total).toFixed(4)}%`,
    };
}

/**
 * Sizes the board's text to the largest that still fits every cell, by measuring
 * at a known basis size and scaling the result back down.
 */
export function useBoardScale(
    boardRef: RefObject<HTMLElement | null>,
    regionRef: RefObject<HTMLElement | null>,
    tabStripRef: RefObject<HTMLElement | null>,
    layout: BoardScaleLayout,
): void {
    const fitToBoard = useEffectEvent((): void => {
        const board = boardRef.current;
        const region = regionRef.current;
        if (board === null || region === null) {
            return;
        }
        const regionBox = region.getBoundingClientRect();
        const tabStripHeight = tabStripRef.current?.getBoundingClientRect().height ?? 0;
        const rowsHeight = regionBox.height - tabStripHeight;
        if (regionBox.width === 0 || rowsHeight <= 0) {
            return;
        }

        board.style.setProperty(valueSizeProperty, `${basisPixels}px`);
        const items = measure(board);

        const labelLaneFraction = layout.labelLane ? labelLaneFractionFor(items) : 0;
        board.style.setProperty(labelLaneProperty, `${(labelLaneFraction * 100).toFixed(3)}%`);

        const valueRowHeight = (rowsHeight / totalRowWeight(layout)) * heightSafety;

        let smallest = maxValuePixels;
        for (const item of items) {
            const available = contentWidthOf(item.cell) * widthSafety;
            smallest = Math.min(
                smallest,
                (available * basisPixels) / item.width,
                (valueRowHeight * basisPixels) / item.height,
            );
        }
        const fitted = Math.max(minValuePixels, Math.min(maxValuePixels, Math.floor(smallest)));
        board.style.setProperty(valueSizeProperty, `${fitted}px`);
    });

    // Re-fit after every render: any change to the board's contents can change what fits.
    useLayoutEffect(() => {
        fitToBoard();
    });

    useEffect(() => {
        const region = regionRef.current;
        if (region === null || typeof ResizeObserver === 'undefined') {
            return;
        }
        const observer = new ResizeObserver(() => {
            fitToBoard();
        });
        observer.observe(region);
        return () => {
            observer.disconnect();
        };
    }, [regionRef]);
}
