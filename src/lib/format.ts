import type { Exam, Mode, Qualifier } from "../config/exams";
import { PART_SHORT_NAMES } from "../config/partNames";
import { WARNING_MS } from "../config/thresholds";
import { COMPACT_FROM_SESSIONS } from "../config/board";

export type Density = "full" | "compact";

const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

const shortPartNames: Record<string, string> = PART_SHORT_NAMES;

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

export const formatRemaining = (ms: number): string => {
  const clamped = Math.max(0, ms);
  if (clamped > WARNING_MS) {
    return formatMinutes(Math.ceil(clamped / MS_PER_MINUTE));
  }
  const totalSeconds = Math.ceil(clamped / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}min ${String(seconds).padStart(2, "0")}sec`;
};

export const widestRemainingString = (): string => formatRemaining(WARNING_MS);

export const partLabel = (partName: string, density: Density): string => {
  if (density === "full") {
    return partName;
  }
  return shortPartNames[partName] ?? partName;
};

export const composeExamLabel = (exam: Exam, mode: Mode, density: Density): string => {
  const name = density === "compact" ? exam.shortName : exam.examName;
  const suffixCarriesInformation = mode === "digital" && exam.modes.includes("paper");
  if (!suffixCarriesInformation) {
    return name;
  }
  return `${name} ${density === "compact" ? "Dg" : "Digital"}`;
};

export const densityFor = (sessionCount: number): Density =>
  sessionCount >= COMPACT_FROM_SESSIONS ? "compact" : "full";
