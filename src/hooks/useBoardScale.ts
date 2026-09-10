import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

export type BoardScaleLayout = {
  columns: number;
  valueRows: number;
  hasControlsRow: boolean;
  labelLane: boolean;
};

export type RowHeights = {
  value: string;
  controls: string;
};

type FitItem = {
  lane: string;
  width: number;
  height: number;
};

const VALUE_SIZE_PROPERTY = "--board-value-size";

const LABEL_LANE_PROPERTY = "--board-label-lane";

const FIT_SELECTOR = "[data-fit]";

const LABEL_LANE = "label";

const BASIS_PX = 100;

const MIN_VALUE_PX = 14;

const MAX_VALUE_PX = 320;

const WIDTH_SAFETY = 0.99;

const HEIGHT_SAFETY = 0.96;

const NARROWEST_LABEL_LANE = 0.15;

const WIDEST_LABEL_LANE = 0.45;

const CONTROLS_ROW_WEIGHT = 0.55;

const totalRowWeight = (layout: BoardScaleLayout): number =>
  layout.valueRows + (layout.hasControlsRow ? CONTROLS_ROW_WEIGHT : 0);

const widestIn = (items: readonly FitItem[], lane: string): number =>
  items.reduce((widest, item) => (item.lane === lane ? Math.max(widest, item.width) : widest), 0);

const labelLaneFractionFor = (items: readonly FitItem[]): number => {
  const labels = widestIn(items, LABEL_LANE);
  const values = items.reduce(
    (widest, item) => (item.lane === LABEL_LANE ? widest : Math.max(widest, item.width)),
    0,
  );
  if (labels + values === 0) {
    return NARROWEST_LABEL_LANE;
  }
  return Math.min(WIDEST_LABEL_LANE, Math.max(NARROWEST_LABEL_LANE, labels / (labels + values)));
};

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

    board.style.setProperty(VALUE_SIZE_PROPERTY, `${BASIS_PX}px`);
    const items: FitItem[] = [];
    for (const element of board.querySelectorAll<HTMLElement>(FIT_SELECTOR)) {
      const box = element.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) {
        items.push({ lane: element.dataset.fit ?? "", width: box.width, height: box.height });
      }
    }

    const labelLaneFraction = layout.labelLane ? labelLaneFractionFor(items) : 0;
    board.style.setProperty(LABEL_LANE_PROPERTY, `${(labelLaneFraction * 100).toFixed(3)}%`);

    const valueRowHeight = (rowsHeight / totalRowWeight(layout)) * HEIGHT_SAFETY;
    const valueLaneWidth =
      ((regionBox.width * (1 - labelLaneFraction)) / layout.columns) * WIDTH_SAFETY;
    const labelLaneWidth = regionBox.width * labelLaneFraction * WIDTH_SAFETY;

    let smallest = MAX_VALUE_PX;
    for (const item of items) {
      const laneWidth = item.lane === LABEL_LANE ? labelLaneWidth : valueLaneWidth;
      smallest = Math.min(
        smallest,
        (laneWidth * BASIS_PX) / item.width,
        (valueRowHeight * BASIS_PX) / item.height,
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
