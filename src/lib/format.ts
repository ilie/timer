import { COMPACT_FROM_SESSIONS, MAX_EXTRA_MINUTES } from "../config/board";
import { exams } from "../config/exams";
import type { Exam, Mode, Qualifier } from "../config/exams";
import { PART_SHORT_NAMES } from "../config/partNames";
import { WARNING_MS } from "../config/thresholds";
import {
  MINUTES_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from "./time";

export type Density = "full" | "compact";

const shortPartNames: Record<string, string> = PART_SHORT_NAMES;

export type RemainingScale = "full" | "small";

export type RemainingSegment = {
  scale: RemainingScale;
  text: string;
};

const full = (text: string): RemainingSegment => ({ scale: "full", text });

const small = (text: string): RemainingSegment => ({ scale: "small", text });

const joinSegments = (segments: readonly RemainingSegment[]): string =>
  segments.map((segment) => segment.text).join("");

const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const remainingMinutes = minutes % MINUTES_PER_HOUR;
  if (hours === 0) {
    return `${remainingMinutes}min`;
  }
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
};

export const formatAllowedTime = (minutes: number, qualifier: Qualifier): string => {
  const duration = formatMinutes(minutes);
  switch (qualifier) {
    case "approx":
      return `Approx. ${duration}`;
    case "max":
      return `up to ${duration}`;
    case "exact":
      return duration;
  }
};

/**
 * Describes how far the system clock moved, for the warning the invigilator
 * reads. Rounded to whole minutes above a minute, because the exact
 * milliseconds of a clock step are not information anyone can act on.
 */
export const formatClockSkew = (skewMs: number): string => {
  const direction = skewMs < 0 ? "back" : "forward";
  const magnitude = Math.abs(skewMs);
  if (magnitude < MS_PER_MINUTE) {
    const seconds = Math.round(magnitude / MS_PER_SECOND);
    return `${seconds}sec ${direction}`;
  }
  return `${formatMinutes(Math.round(magnitude / MS_PER_MINUTE))} ${direction}`;
};

export const remainingSegments = (ms: number): RemainingSegment[] => {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.ceil(clamped / MS_PER_SECOND);
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const secondsDigits = clamped > WARNING_MS ? small : full;
  const leading = hours === 0 ? [] : [full(String(hours)), small("h ")];
  return [
    ...leading,
    full(String(minutes)),
    small("min "),
    secondsDigits(String(seconds).padStart(2, "0")),
    small("sec"),
  ];
};

export const formatRemaining = (ms: number): string => joinSegments(remainingSegments(ms));

const longestPartMinutes = Math.max(
  ...exams.flatMap((exam) => exam.examParts.map((part) => part.minutes)),
);

export const MAX_REMAINING_MS = (longestPartMinutes + MAX_EXTRA_MINUTES) * MS_PER_MINUTE;

const SMALL_SCALE_WIDTH = 0.5;

const estimatedWidth = (segments: readonly RemainingSegment[]): number =>
  segments.reduce(
    (total, segment) =>
      total + segment.text.length * (segment.scale === "full" ? 1 : SMALL_SCALE_WIDTH),
    0,
  );

const shapeOf = (segments: readonly RemainingSegment[]): string =>
  segments.map((segment) => `${segment.scale}:${segment.text.length}`).join("|");

const candidateValues = (upperBoundMs: number): number[] => {
  const bound = Math.max(0, upperBoundMs);
  const lastMinute = Math.floor(bound / MS_PER_MINUTE);
  const values: number[] = [];
  for (let minute = 0; minute <= lastMinute; minute += 1) {
    const wholeMinute = minute * MS_PER_MINUTE;
    values.push(wholeMinute);
    const almostNextMinute = wholeMinute + MS_PER_MINUTE - MS_PER_SECOND;
    if (almostNextMinute <= bound) {
      values.push(almostNextMinute);
    }
  }
  values.push(bound);
  return values;
};

export const reservationSegments = (upperBoundMs: number): RemainingSegment[][] => {
  const byShape = new Map<string, RemainingSegment[]>();
  for (const value of candidateValues(upperBoundMs)) {
    const segments = remainingSegments(value);
    const shape = shapeOf(segments);
    const known = byShape.get(shape);
    if (known === undefined || estimatedWidth(segments) > estimatedWidth(known)) {
      byShape.set(shape, segments);
    }
  }
  return [...byShape.values()];
};

export const widestRemainingSegments = (upperBoundMs: number): RemainingSegment[] => {
  let widest = remainingSegments(0);
  for (const candidate of reservationSegments(upperBoundMs)) {
    if (estimatedWidth(candidate) > estimatedWidth(widest)) {
      widest = candidate;
    }
  }
  return widest;
};

export const widestRemainingString = (): string =>
  joinSegments(widestRemainingSegments(MAX_REMAINING_MS));

export const partLabel = (partName: string, density: Density): string => {
  if (density === "full") {
    return partName;
  }
  return shortPartNames[partName] ?? partName;
};

export const examDisplayName = (exam: Exam, density: Density): string =>
  density === "compact" ? exam.shortName : exam.examName;

export const marksDigitalMode = (exam: Exam, mode: Mode): boolean =>
  mode === "digital" && exam.modes.includes("paper");

export const composeExamLabel = (exam: Exam, mode: Mode, density: Density): string => {
  const name = examDisplayName(exam, density);
  if (!marksDigitalMode(exam, mode)) {
    return name;
  }
  return `${name} Digital`;
};

export const densityFor = (sessionCount: number): Density =>
  sessionCount >= COMPACT_FROM_SESSIONS ? "compact" : "full";
