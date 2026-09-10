export type Qualifier = "exact" | "approx" | "max";

export type Mode = "paper" | "digital";

export type ExamPart = {
  id: string;
  name: string;
  minutes: number;
  qualifier: Qualifier;
};

export type Exam = {
  examName: string;
  shortName: string;
  modes: readonly Mode[];
  examParts: readonly ExamPart[];
};

export const exams = [
  {
    examName: "Pre A1 Starters",
    shortName: "Starters",
    modes: ["paper", "digital"],
    examParts: [
      { id: "PRE-A1-01", name: "Reading & Writing", minutes: 20, qualifier: "exact" },
      { id: "PRE-A1-02", name: "Listening", minutes: 20, qualifier: "approx" },
    ],
  },
  {
    examName: "A1 Movers",
    shortName: "Movers",
    modes: ["paper", "digital"],
    examParts: [
      { id: "A1-01", name: "Reading & Writing", minutes: 30, qualifier: "exact" },
      { id: "A1-02", name: "Listening", minutes: 28, qualifier: "approx" },
    ],
  },
  {
    examName: "A2 Flyers",
    shortName: "Flyers",
    modes: ["paper", "digital"],
    examParts: [
      { id: "A2-01", name: "Reading & Writing", minutes: 40, qualifier: "exact" },
      { id: "A2-02", name: "Listening", minutes: 28, qualifier: "approx" },
    ],
  },
  {
    examName: "A2 Key",
    shortName: "KET",
    modes: ["paper", "digital"],
    examParts: [
      { id: "Key-01", name: "Reading & Writing", minutes: 60, qualifier: "exact" },
      { id: "Key-02", name: "Listening", minutes: 30, qualifier: "approx" },
    ],
  },
  {
    examName: "A2 Key for Schools",
    shortName: "KET fS",
    modes: ["paper", "digital"],
    examParts: [
      { id: "KeyfS-01", name: "Reading & Writing", minutes: 60, qualifier: "exact" },
      { id: "KeyfS-02", name: "Listening", minutes: 30, qualifier: "approx" },
    ],
  },
  {
    examName: "B1 Preliminary",
    shortName: "PET",
    modes: ["paper", "digital"],
    examParts: [
      { id: "B1-01", name: "Reading", minutes: 45, qualifier: "exact" },
      { id: "B1-02", name: "Writing", minutes: 45, qualifier: "exact" },
      { id: "B1-03", name: "Listening", minutes: 30, qualifier: "approx" },
    ],
  },
  {
    examName: "B1 Preliminary for Schools",
    shortName: "PET fS",
    modes: ["paper", "digital"],
    examParts: [
      { id: "B1fS-01", name: "Reading", minutes: 45, qualifier: "exact" },
      { id: "B1fS-02", name: "Writing", minutes: 45, qualifier: "exact" },
      { id: "B1fS-03", name: "Listening", minutes: 30, qualifier: "approx" },
    ],
  },
  {
    examName: "B2 First",
    shortName: "FCE",
    modes: ["paper", "digital"],
    examParts: [
      { id: "B2-01", name: "Reading & Use of English", minutes: 75, qualifier: "exact" },
      { id: "B2-02", name: "Writing", minutes: 80, qualifier: "exact" },
      { id: "B2-03", name: "Listening", minutes: 40, qualifier: "approx" },
    ],
  },
  {
    examName: "B2 First for Schools",
    shortName: "FCE fS",
    modes: ["paper", "digital"],
    examParts: [
      { id: "B2fS-01", name: "Reading & Use of English", minutes: 75, qualifier: "exact" },
      { id: "B2fS-02", name: "Writing", minutes: 80, qualifier: "exact" },
      { id: "B2fS-03", name: "Listening", minutes: 40, qualifier: "approx" },
    ],
  },
  {
    examName: "C1 Advanced",
    shortName: "CAE",
    modes: ["paper", "digital"],
    examParts: [
      { id: "C1-01", name: "Reading & Use of English", minutes: 90, qualifier: "exact" },
      { id: "C1-02", name: "Writing", minutes: 90, qualifier: "exact" },
      { id: "C1-03", name: "Listening", minutes: 40, qualifier: "approx" },
    ],
  },
  {
    examName: "C2 Proficiency",
    shortName: "CPE",
    modes: ["paper", "digital"],
    examParts: [
      { id: "C2-01", name: "Reading & Use of English", minutes: 90, qualifier: "exact" },
      { id: "C2-02", name: "Writing", minutes: 90, qualifier: "exact" },
      { id: "C2-03", name: "Listening", minutes: 40, qualifier: "approx" },
    ],
  },
  {
    examName: "Linguaskill General",
    shortName: "Lsk Gen",
    modes: ["digital"],
    examParts: [
      { id: "LSK-01", name: "Reading", minutes: 45, qualifier: "max" },
      { id: "LSK-02", name: "Listening", minutes: 45, qualifier: "max" },
      { id: "LSK-03", name: "Writing", minutes: 45, qualifier: "exact" },
      { id: "LSK-04", name: "Speaking", minutes: 15, qualifier: "approx" },
    ],
  },
  {
    examName: "Linguaskill Business",
    shortName: "Lsk Bus",
    modes: ["digital"],
    examParts: [
      { id: "LSKB-01", name: "Reading", minutes: 45, qualifier: "max" },
      { id: "LSKB-02", name: "Listening", minutes: 45, qualifier: "max" },
      { id: "LSKB-03", name: "Writing", minutes: 45, qualifier: "exact" },
      { id: "LSKB-04", name: "Speaking", minutes: 15, qualifier: "approx" },
    ],
  },
] as const satisfies readonly Exam[];
