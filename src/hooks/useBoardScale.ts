import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

export type BoardScaleLayout = {
  columns: number;
  valueRows: number;
  hasControlsRow: boolean;
  labelLaneFraction: number;
};

export type RowHeights = {
  value: string;
  controls: string;
};

const VALUE_SIZE_PROPERTY = "--board-value-size";

const FIT_SELECTOR = "[data-fit]";

const BASIS_PX = 100;

const MIN_VALUE_PX = 14;

const MAX_VALUE_PX = 320;

const WIDTH_SAFETY = 0.97;

const HEIGHT_SAFETY = 0.9;

const CONTROLS_ROW_WEIGHT = 0.55;

const totalRowWeight = (layout: BoardScaleLayout): number =>
  layout.valueRows + (layout.hasControlsRow ? CONTROLS_ROW_WEIGHT : 0);

export const rowHeights = (layout: BoardScaleLayout): RowHeights => {
  const total = totalRowWeight(layout);
  return {
    value: `${(100 / total).toFixed(4)}%`,
    controls: `${((100 * CONTROLS_ROW_WEIGHT) / total).toFixed(4)}%`,
  };
};

export function useBoardScale(
  boardRef: RefObject<HTMLElement | null>,
  regionRef: RefObject<HTMLElement | null>,
  tabStripRef: RefObject<HTMLElement | null>,
  layout: BoardScaleLayout,
): void {
  const fitToBoard = () => {
    const board = boardRef.current;
    const region = regionRef.current;
    if (board === null || region === null) {
      return;
    }
    const regionBox = region.getBoundingClientRect();
    const tabStripHeight = tabStripRef.current?.getBoundingClientRect().height ?? 0;
    const rowsHeight = regionBox.height - tabStripHeight;
    if (regionBox.width === 0 || rowsHeight <= 0 || layout.columns === 0) {
      return;
    }

    const valueRowHeight = (rowsHeight / totalRowWeight(layout)) * HEIGHT_SAFETY;
    const valueLaneWidth =
      ((regionBox.width * (1 - layout.labelLaneFraction)) / layout.columns) * WIDTH_SAFETY;
    const labelLaneWidth = regionBox.width * layout.labelLaneFraction * WIDTH_SAFETY;

    board.style.setProperty(VALUE_SIZE_PROPERTY, `${BASIS_PX}px`);
    let smallest = MAX_VALUE_PX;
    for (const item of board.querySelectorAll<HTMLElement>(FIT_SELECTOR)) {
      const itemBox = item.getBoundingClientRect();
      if (itemBox.width === 0 || itemBox.height === 0) {
        continue;
      }
      const laneWidth = item.dataset.fit === "label" ? labelLaneWidth : valueLaneWidth;
      smallest = Math.min(
        smallest,
        (laneWidth * BASIS_PX) / itemBox.width,
        (valueRowHeight * BASIS_PX) / itemBox.height,
      );
    }
    const fitted = Math.max(MIN_VALUE_PX, Math.min(MAX_VALUE_PX, Math.floor(smallest)));
    board.style.setProperty(VALUE_SIZE_PROPERTY, `${fitted}px`);
  };

  const latestFit = useRef(fitToBoard);

  useLayoutEffect(() => {
    latestFit.current = fitToBoard;
    fitToBoard();
  });

  useEffect(() => {
    const region = regionRef.current;
    if (region === null || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      latestFit.current();
    });
    observer.observe(region);
    return () => {
      observer.disconnect();
    };
  }, [regionRef]);
}
