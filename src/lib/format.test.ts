import { describe, expect, it } from "vitest";
import { exams } from "../config/exams";
import type { Exam } from "../config/exams";
import {
  composeExamLabel,
  densityFor,
  formatAllowedTime,
  formatRemaining,
  partLabel,
  widestRemainingString,
} from "./format";

const findExam = (examName: string): Exam => {
  const exam = exams.find((candidate) => candidate.examName === examName);
  if (exam === undefined) {
    throw new Error(`No exam named ${examName}`);
  }
  return exam;
};

const b2First = findExam("B2 First");
const linguaskillGeneral = findExam("Linguaskill General");

describe("formatAllowedTime", () => {
  it.each([
    [45, "exact", "45min"],
    [60, "exact", "1h"],
    [75, "exact", "1h 15min"],
    [90, "exact", "1h 30min"],
    [30, "approx", "Approx. 30min"],
    [45, "max", "up to 45min"],
  ] as const)("formats %i minutes as %s", (minutes, qualifier, expected) => {
    expect(formatAllowedTime(minutes, qualifier)).toBe(expected);
  });
});

describe("formatRemaining", () => {
  it.each([
    [5_400_000, "1h 30min"],
    [4_800_000, "1h 20min"],
    [2_699_000, "45min"],
    [600_001, "11min"],
    [600_000, "10min 00sec"],
    [582_000, "9min 42sec"],
    [0, "0min 00sec"],
  ])("formats %i ms as %s", (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });

  it("reports the widest string it can produce", () => {
    expect(widestRemainingString()).toBe("10min 00sec");
  });
});

describe("composeExamLabel", () => {
  it("omits the suffix for a paper session", () => {
    expect(composeExamLabel(b2First, "paper", "full")).toBe("B2 First");
  });

  it("spells out the suffix for a digital session at full density", () => {
    expect(composeExamLabel(b2First, "digital", "full")).toBe("B2 First Digital");
  });

  it("abbreviates both name and suffix at compact density", () => {
    expect(composeExamLabel(b2First, "digital", "compact")).toBe("FCE Dg");
  });

  it("omits the suffix for a digital-only exam", () => {
    expect(composeExamLabel(linguaskillGeneral, "digital", "compact")).toBe("Lsk Gen");
    expect(composeExamLabel(linguaskillGeneral, "digital", "full")).toBe("Linguaskill General");
  });
});

describe("partLabel", () => {
  it("keeps the full part name at full density", () => {
    expect(partLabel("Reading & Use of English", "full")).toBe("Reading & Use of English");
  });

  it("abbreviates the two long part names at compact density", () => {
    expect(partLabel("Reading & Use of English", "compact")).toBe("Reading & UoE");
    expect(partLabel("Reading & Writing", "compact")).toBe("Reading & Wr.");
  });

  it("falls back to the full name for parts with no abbreviation", () => {
    expect(partLabel("Listening", "compact")).toBe("Listening");
    expect(partLabel("Speaking", "compact")).toBe("Speaking");
  });
});

describe("densityFor", () => {
  it.each([
    [1, "full"],
    [2, "full"],
    [3, "compact"],
    [4, "compact"],
  ])("maps %i sessions to %s", (sessionCount, expected) => {
    expect(densityFor(sessionCount)).toBe(expected);
  });
});
