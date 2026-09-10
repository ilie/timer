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
