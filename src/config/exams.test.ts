import { describe, expect, it } from "vitest";
import { exams } from "./exams";
import type { Exam, ExamPart, Qualifier } from "./exams";

const allExams: readonly Exam[] = exams;

const allParts: readonly ExamPart[] = allExams.flatMap((exam) => exam.examParts);

const findPart = (id: string): ExamPart => {
  const part = allParts.find((candidate) => candidate.id === id);
  if (part === undefined) {
    throw new Error(`No part with id ${id}`);
  }
  return part;
};

const findExam = (examName: string): Exam => {
  const exam = allExams.find((candidate) => candidate.examName === examName);
  if (exam === undefined) {
    throw new Error(`No exam named ${examName}`);
  }
  return exam;
};

describe("exams", () => {
  it("has no time strings left", () => {
    expect(JSON.stringify(exams).includes('"time"')).toBe(false);
  });

  it("uses the corrected B1 Preliminary Listening duration", () => {
    expect(findPart("B1-03").minutes).toBe(30);
  });

  it("sets the documented qualifiers", () => {
    expect(findPart("LSK-02").qualifier).toBe("max");
    expect(findPart("LSK-04").qualifier).toBe("approx");
    expect(findPart("B2-03").qualifier).toBe("approx");
    expect(findPart("B1-01").qualifier).toBe("exact");
  });

  it("has no part-level shortName", () => {
    for (const part of allParts) {
      expect(Object.keys(part)).not.toContain("shortName");
    }
  });

  it("gives every exam at least one mode", () => {
    for (const exam of allExams) {
      expect(exam.modes.length).toBeGreaterThan(0);
    }
  });

  it("keeps part ids unique across every exam", () => {
    const ids = allParts.map((part) => part.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes Linguaskill Business with four parts", () => {
    expect(findExam("Linguaskill Business").examParts).toHaveLength(4);
  });

  it("qualifies every Linguaskill part by the Linguaskill rule", () => {
    const linguaskillQualifiers: Record<string, Qualifier> = {
      Reading: "max",
      Listening: "max",
      Writing: "exact",
      Speaking: "approx",
    };

    const linguaskillExams = allExams.filter((exam) =>
      exam.examName.startsWith("Linguaskill"),
    );
    expect(linguaskillExams).toHaveLength(2);

    for (const exam of linguaskillExams) {
      for (const part of exam.examParts) {
        expect(part.qualifier).toBe(linguaskillQualifiers[part.name]);
      }
    }
  });

  it("qualifies every non-Linguaskill Listening as approx", () => {
    const listeningParts = allExams
      .filter((exam) => !exam.examName.startsWith("Linguaskill"))
      .flatMap((exam) => exam.examParts)
      .filter((part) => part.name === "Listening");

    expect(listeningParts).toHaveLength(11);
    for (const part of listeningParts) {
      expect(part.qualifier).toBe("approx");
    }
  });
});

// These durations are maintained by hand and drive a live exam clock, so a typo
// here is a wrong countdown in the room. Nothing else in the app re-checks them.
describe("exam data every countdown depends on", () => {
  it("gives every component a whole, positive number of minutes", () => {
    for (const part of allParts) {
      expect(Number.isInteger(part.minutes), `${part.id} minutes must be a whole number`).toBe(
        true,
      );
      expect(part.minutes, `${part.id} must last longer than no time at all`).toBeGreaterThan(0);
      expect(Number.isFinite(part.minutes), `${part.id} minutes must be finite`).toBe(true);
    }
  });

  it("keeps every component within a plausible exam length", () => {
    for (const part of allParts) {
      expect(part.minutes, `${part.id} is longer than any Cambridge paper`).toBeLessThanOrEqual(
        240,
      );
    }
  });

  it("gives every part an id unique across the whole catalogue", () => {
    const ids = allParts.map((part) => part.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every exam a name, a short name, a mode and at least one part", () => {
    for (const exam of allExams) {
      expect(exam.examName.trim()).not.toBe("");
      expect(exam.shortName.trim()).not.toBe("");
      expect(exam.examParts.length).toBeGreaterThan(0);
      expect(exam.modes.length).toBeGreaterThan(0);
    }
  });

  it("names every exam and short name uniquely, so a column cannot be ambiguous", () => {
    const names = allExams.map((exam) => exam.examName);
    const shortNames = allExams.map((exam) => exam.shortName);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(shortNames).size).toBe(shortNames.length);
  });

  it("gives every part a non-empty name", () => {
    for (const part of allParts) {
      expect(part.name.trim(), `${part.id} needs a name`).not.toBe("");
    }
  });
});
